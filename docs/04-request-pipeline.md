# 请求处理管道详解

本文将深入讲解 NestJS 的请求处理流程，从收到 HTTP 请求到返回响应的完整过程。

## 请求处理流程概览

```
HTTP 请求
    ↓
中间件 (Middleware)
    ↓
守卫 (Guards)
    ↓
拦截器 (Interceptors) - 前置逻辑
    ↓
管道 (Pipes) - 参数验证/转换
    ↓
路由处理器 (Controller Method)
    ↓
拦截器 (Interceptors) - 后置逻辑
    ↓
异常过滤器 (Exception Filters) - 捕获异常
    ↓
HTTP 响应
```

## 1. 路由匹配 (Router)

### 路由探索器

`RouterExplorer` 负责扫描控制器，收集所有路由信息。

```typescript
// router.ts
export class RouterExplorer {
  private routes: RouteInfo[] = [];

  // 探索控制器路由
  explore(moduleRef: Module): void {
    moduleRef.controllers.forEach((wrapper, metatype) => {
      this.exploreController(wrapper, metatype);
    });
  }

  private exploreController(wrapper: InstanceWrapper, metatype: Type<any>): void {
    const instance = wrapper.instance;
    const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype) || '/';

    // 获取所有方法
    const methodNames = Object.getOwnPropertyNames(metatype.prototype)
      .filter(name => name !== 'constructor');

    methodNames.forEach(methodName => {
      const handler = instance[methodName];
      const routePath = Reflect.getMetadata(PATH_METADATA, handler);
      const requestMethod = Reflect.getMetadata(METHOD_METADATA, handler);

      if (routePath === undefined) return;

      const fullPath = this.normalizePath(controllerPath, routePath);

      this.routes.push({
        method: requestMethod,
        path: fullPath,
        handler,
        instance,
        methodName,
        controllerClass: metatype,
      });

      console.log(`[路由] ${requestMethod.toUpperCase()} ${fullPath} -> ${metatype.name}.${methodName}()`);
    });
  }
}
```

### 路由匹配

```typescript
// router.ts
private findRoute(method: string, pathname: string): RouteInfo | undefined {
  return this.routes.find(route => {
    if (route.method !== method) return false;

    // 将 :id 转换为正则表达式
    const routePattern = route.path.replace(/:([^\/]+)/g, '([^/]+)');
    const regex = new RegExp(`^${routePattern}$`);
    return regex.test(pathname);
  });
}
```

### 路径参数提取

```typescript
// router.ts
private extractPathParams(routePath: string, actualPath: string): Record<string, string> {
  const params: Record<string, string> = {};
  const routeParts = routePath.split('/');
  const actualParts = actualPath.split('/');

  routeParts.forEach((part, index) => {
    if (part.startsWith(':')) {
      params[part.slice(1)] = actualParts[index];
    }
  });

  return params;
}

// 示例:
// routePath:  /cats/:id/photos/:photoId
// actualPath: /cats/1/photos/42
// 结果: { id: '1', photoId: '42' }
```

## 2. 参数解析 (Parameter Resolution)

### 参数装饰器元数据

```typescript
// http.decorator.ts
function createParamDecorator(paramtype: RouteParamtypes) {
  return (data?: string): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      const existingParams = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        propertyKey as string
      ) || {};

      existingParams[`${paramtype}:${parameterIndex}`] = {
        index: parameterIndex,
        data,               // @Param('id') 中的 'id'
        type: paramtype,    // PARAM, BODY, QUERY 等
      };

      Reflect.defineMetadata(ROUTE_ARGS_METADATA, existingParams, target.constructor, propertyKey);
    };
  };
}
```

### 参数解析器

```typescript
// router.ts
private createParamsResolver(controllerClass: Type<any>, methodName: string, routePath: string) {
  return (req: http.IncomingMessage, res: http.ServerResponse, body: any): any[] => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const params = this.extractPathParams(routePath, url.pathname);

    // 获取参数元数据
    const argsMetadata = Reflect.getMetadata(
      ROUTE_ARGS_METADATA,
      controllerClass,
      methodName
    ) || {};

    const args: any[] = [];

    // 按索引排序
    const sortedKeys = Object.keys(argsMetadata)
      .sort((a, b) => argsMetadata[a].index - argsMetadata[b].index);

    for (const key of sortedKeys) {
      const { index, data, type } = argsMetadata[key];

      switch (type) {
        case RouteParamtypes.REQUEST:
          args[index] = req;
          break;
        case RouteParamtypes.RESPONSE:
          args[index] = res;
          break;
        case RouteParamtypes.BODY:
          args[index] = data ? body?.[data] : body;
          break;
        case RouteParamtypes.PARAM:
          args[index] = data ? params[data] : params;
          break;
        case RouteParamtypes.QUERY:
          args[index] = data ? url.searchParams.get(data) : Object.fromEntries(url.searchParams);
          break;
        case RouteParamtypes.HEADERS:
          args[index] = data ? req.headers[data.toLowerCase()] : req.headers;
          break;
      }
    }

    return args;
  };
}
```

## 3. 请求体解析 (Body Parsing)

```typescript
// router.ts
private createBodyParser() {
  return (req: http.IncomingMessage): Promise<any> => {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];

      req.on('data', chunk => chunks.push(chunk));

      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body || {});
        }
      });
    });
  };
}
```

## 4. 路由执行上下文 (RouterExecutionContext)

`RouterExecutionContext` 是请求处理管道的核心，负责协调各组件的执行。

```typescript
// router-execution-context.ts
export class RouterExecutionContext {
  private guardsConsumer = new GuardsConsumer();
  private pipesConsumer = new PipesConsumer();
  private interceptorsConsumer = new InterceptorsConsumer();
  private exceptionsHandler = new ExceptionsHandler();

  create(
    instance: any,
    handler: Function,
    methodName: string,
    controllerClass: Type<any>,
    resolveParams: Function,
    parseBody: Function,
  ) {
    // 收集装饰器元数据
    const guards = this.reflectGuards(controllerClass, handler);
    const pipes = this.reflectPipes(controllerClass, handler);
    const interceptors = this.reflectInterceptors(controllerClass, handler);
    const filters = this.reflectFilters(controllerClass, handler);

    // 设置异常过滤器
    this.exceptionsHandler.setCustomFilters(filters);

    // 返回请求处理函数
    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const context = createExecutionContext(req, res, controllerClass, handler);

      try {
        // 步骤 1: 执行守卫
        await this.guardsConsumer.tryActivate(guards, context);

        // 步骤 2: 解析请求体
        const body = await parseBody(req);

        // 步骤 3: 解析参数
        let args = resolveParams(req, res, body);

        // 步骤 4: 执行管道（验证和转换参数）
        args = await this.applyPipesToArgs(args, pipes, methodName, controllerClass);

        // 步骤 5: 执行拦截器和处理器
        const result = await this.interceptorsConsumer.intercept(
          interceptors,
          context,
          async () => handler.apply(instance, args),
        );

        // 步骤 6: 发送响应
        if (!res.writableEnded) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        }
      } catch (error) {
        // 步骤 7: 异常处理
        const host = createArgumentsHost(req, res);
        this.exceptionsHandler.handle(error, host);
      }
    };
  }
}
```

## 5. 执行上下文 (ExecutionContext)

执行上下文提供了访问请求信息的统一接口。

```typescript
// interfaces.ts
export interface ExecutionContext {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
}

// router-execution-context.ts
function createExecutionContext(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  controllerClass: Type<any>,
  handler: Function,
): ExecutionContext {
  return {
    getRequest: () => req,
    getResponse: () => res,
    getClass: () => controllerClass,
    getHandler: () => handler,
  };
}
```

## 6. 元数据反射

### 收集守卫

```typescript
private reflectGuards(controllerClass: Type<any>, handler: Function): CanActivate[] {
  // 控制器级别的守卫
  const controllerGuards = Reflect.getMetadata(GUARDS_METADATA, controllerClass) || [];
  // 方法级别的守卫
  const methodGuards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];

  // 合并并实例化
  return [...this.instantiate(controllerGuards), ...this.instantiate(methodGuards)];
}

private instantiate<T>(items: (Type<T> | T)[]): T[] {
  return items.map(item => {
    if (typeof item === 'function') {
      return new (item as Type<T>)();
    }
    return item;
  });
}
```

## 7. 请求处理入口

```typescript
// router.ts
createRequestHandler() {
  return async (req: http.IncomingMessage, res: http.ServerResponse) => {
    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    const method = (req.method || 'GET').toLowerCase();
    const pathname = url.pathname;

    console.log(`[请求] ${method.toUpperCase()} ${pathname}`);

    // 1. 查找匹配的路由
    const route = this.findRoute(method, pathname);

    if (!route) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        statusCode: 404,
        message: `Cannot ${method.toUpperCase()} ${pathname}`,
      }));
      return;
    }

    // 2. 执行路由处理函数
    await route.requestHandler(req, res);
  };
}
```

## 完整请求处理示例

假设有以下控制器：

```typescript
@Controller('cats')
@UseGuards(AuthGuard)
@UseInterceptors(LoggingInterceptor)
export class CatsController {
  constructor(private catsService: CatsService) {}

  @Post()
  @UsePipes(ValidationPipe)
  create(@Body() createCatDto: CreateCatDto) {
    return this.catsService.create(createCatDto);
  }
}
```

处理 `POST /cats` 请求的流程：

```
1. 请求到达: POST /cats
   Body: {"name": "Tom", "age": 2}

2. 路由匹配:
   - 找到 CatsController.create()
   - 方法: POST, 路径: /cats

3. 创建执行上下文:
   context = {
     getRequest: () => req,
     getResponse: () => res,
     getClass: () => CatsController,
     getHandler: () => create,
   }

4. 执行守卫:
   [AuthGuard] 检查 Authorization 头
   -> 返回 true，继续执行

5. 解析请求体:
   body = { name: "Tom", age: 2 }

6. 解析参数:
   args = [{ name: "Tom", age: 2 }]  // @Body() 参数

7. 执行管道:
   [ValidationPipe] 验证 createCatDto
   -> 验证通过，返回转换后的数据

8. 执行拦截器 (前置):
   [LoggingInterceptor] 记录: "Before..."

9. 执行控制器方法:
   result = catsService.create({ name: "Tom", age: 2 })
   -> 返回新创建的 cat

10. 执行拦截器 (后置):
    [LoggingInterceptor] 记录: "After... 15ms"
    -> 可能包装响应

11. 发送响应:
    HTTP 200
    {"id": 1, "name": "Tom", "age": 2}
```

## 异常处理流程

```typescript
// 当管道验证失败时
@Post()
@UsePipes(ValidationPipe)
create(@Body() createCatDto: CreateCatDto) {
  // ValidationPipe 抛出 BadRequestException
}

// 处理流程:
1. ValidationPipe.transform() 抛出 BadRequestException
2. 异常被 try-catch 捕获
3. 调用 exceptionsHandler.handle(error, host)
4. ExceptionsHandler 查找匹配的过滤器
5. 过滤器格式化错误响应
6. 发送 HTTP 400 响应
```

## 洋葱模型

拦截器使用洋葱模型，可以在请求前后执行逻辑：

```
请求 → Interceptor1(前) → Interceptor2(前) → Handler → Interceptor2(后) → Interceptor1(后) → 响应

[Interceptor 1]
    ↓ before
    [Interceptor 2]
        ↓ before
        [Handler]
        ↑ after
    [Interceptor 2]
    ↑ after
[Interceptor 1]
```

```typescript
// 实现
async intercept(interceptors, context, handler) {
  if (interceptors.length === 0) {
    return handler();
  }

  const [first, ...rest] = interceptors;

  return first.intercept(context, {
    handle: () => this.intercept(rest, context, handler),
  });
}
```

## 与真实 NestJS 的对比

| 功能 | MiniNest | 真实 NestJS |
|-----|----------|------------|
| 路由匹配 | 简单正则 | 更复杂的路由系统 |
| 参数装饰器 | 基本支持 | 更多类型 + 自定义 |
| 中间件 | 未实现 | 完整支持 |
| 守卫/管道/拦截器 | 基本支持 | 更多功能 |
| 异常过滤器 | 基本支持 | 更细粒度控制 |

## 总结

1. **路由探索**: 扫描控制器，收集路由信息
2. **参数解析**: 根据装饰器元数据解析请求参数
3. **执行上下文**: 统一的上下文访问接口
4. **请求管道**: 守卫 → 管道 → 拦截器 → 处理器 → 异常过滤器
5. **洋葱模型**: 拦截器的前置/后置处理

## 进一步阅读

- NestJS 源码: `packages/core/router/`
- NestJS 源码: `packages/core/router/router-execution-context.ts`
