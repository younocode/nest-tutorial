# 中间件、守卫、管道、拦截器详解

本文将深入讲解 NestJS 请求处理管道中的四个核心组件：中间件、守卫、管道和拦截器。

## 组件对比

| 组件 | 执行时机 | 主要用途 | 访问权限 |
|-----|---------|---------|---------|
| 中间件 | 路由匹配前 | 日志、CORS、请求解析 | req, res, next |
| 守卫 | 路由匹配后，管道前 | 认证、授权 | ExecutionContext |
| 管道 | 守卫后，处理器前 | 参数验证、转换 | value, metadata |
| 拦截器 | 管道后，处理器前后 | 日志、缓存、响应转换 | ExecutionContext, CallHandler |

## 1. 守卫 (Guards)

守卫决定请求是否应该继续处理。通常用于认证和授权。

### 接口定义

```typescript
export interface CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

export interface ExecutionContext {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getClass<T = any>(): Type<T>;
  getHandler(): Function;
}
```

### 守卫实现示例

```typescript
// auth.guard.ts
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean | Promise<boolean> {
    const request = context.getRequest();
    const authHeader = request.headers['authorization'];

    if (!authHeader) {
      console.log('[AuthGuard] 缺少 Authorization 头');
      return false;
    }

    // 验证 Token
    if (authHeader === 'Bearer valid-token') {
      console.log('[AuthGuard] Token 验证通过');
      return true;
    }

    return false;
  }
}
```

### 角色守卫

```typescript
// roles.guard.ts
export class RolesGuard implements CanActivate {
  constructor(private allowedRoles: string[]) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.getRequest();
    const userRole = request.headers['x-user-role'];

    return this.allowedRoles.includes(userRole);
  }
}
```

### 使用装饰器

```typescript
// use-guards.decorator.ts
export function UseGuards(...guards: (Type<CanActivate> | CanActivate)[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // 方法装饰器
      Reflect.defineMetadata(GUARDS_METADATA, guards, descriptor.value);
    } else {
      // 类装饰器
      Reflect.defineMetadata(GUARDS_METADATA, guards, target);
    }
    return descriptor ?? target;
  };
}

// 使用
@Controller('cats')
@UseGuards(AuthGuard)  // 控制器级别
export class CatsController {
  @Post()
  @UseGuards(new RolesGuard(['admin']))  // 方法级别
  create() {}
}
```

### GuardsConsumer 实现

```typescript
// guards-consumer.ts
export class GuardsConsumer {
  async tryActivate(guards: CanActivate[], context: ExecutionContext): Promise<void> {
    if (guards.length === 0) return;

    for (const guard of guards) {
      const result = await guard.canActivate(context);

      if (!result) {
        throw new ForbiddenException('Forbidden resource');
      }
    }

    console.log('[GuardsConsumer] 所有守卫验证通过');
  }
}
```

## 2. 管道 (Pipes)

管道用于参数验证和转换。在控制器方法执行前处理参数。

### 接口定义

```typescript
export interface PipeTransform<T = any, R = any> {
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

export interface ArgumentMetadata {
  type: 'body' | 'query' | 'param' | 'custom';
  data?: string;  // @Body('name') 中的 'name'
}
```

### 管道实现示例

```typescript
// validation.pipe.ts
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    console.log(`[ValidationPipe] 验证 ${metadata.type}:${metadata.data}`);

    if (metadata.type === 'body' && typeof value === 'object') {
      // 简单验证：检查必填字段
      if ('name' in value && !value.name) {
        throw new BadRequestException('name 不能为空');
      }
    }

    return value;
  }
}
```

### 类型转换管道

```typescript
// parse-int.pipe.ts
export class ParseIntPipe implements PipeTransform<string, number> {
  transform(value: string, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException(`参数 ${metadata.data} 必须是整数`);
    }

    return val;
  }
}
```

### 默认值管道

```typescript
// default-value.pipe.ts
export class DefaultValuePipe<T> implements PipeTransform {
  constructor(private defaultValue: T) {}

  transform(value: any): T {
    return value ?? this.defaultValue;
  }
}
```

### PipesConsumer 实现

```typescript
// pipes-consumer.ts
export class PipesConsumer {
  async applyPipes(
    value: any,
    metadata: ArgumentMetadata,
    pipes: PipeTransform[],
  ): Promise<any> {
    if (pipes.length === 0) return value;

    let transformedValue = value;

    for (const pipe of pipes) {
      transformedValue = await pipe.transform(transformedValue, metadata);
    }

    return transformedValue;
  }
}
```

### 在路由执行上下文中应用管道

```typescript
// router-execution-context.ts
private async applyPipesToArgs(
  args: any[],
  pipes: PipeTransform[],
  methodName: string,
  controllerClass: Type<any>,
): Promise<any[]> {
  if (pipes.length === 0) return args;

  const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controllerClass, methodName) || {};
  const transformedArgs = [...args];

  for (const key of Object.keys(argsMetadata)) {
    const { index, data, type } = argsMetadata[key];
    const metadata: ArgumentMetadata = {
      type: this.paramTypeToString(type),
      data,
    };

    transformedArgs[index] = await this.pipesConsumer.applyPipes(
      args[index],
      metadata,
      pipes,
    );
  }

  return transformedArgs;
}
```

## 3. 拦截器 (Interceptors)

拦截器可以在方法执行前后添加额外逻辑，实现洋葱模型。

### 接口定义

```typescript
export interface NestInterceptor<T = any, R = any> {
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R> | R;
}

export interface CallHandler<T = any> {
  handle(): Promise<T>;
}
```

### 拦截器实现示例

```typescript
// logging.interceptor.ts
export class LoggingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.getRequest();
    const method = request.method;
    const url = request.url;

    console.log(`[LoggingInterceptor] 请求开始: ${method} ${url}`);
    const startTime = Date.now();

    // 执行后续处理
    const result = await next.handle();

    const duration = Date.now() - startTime;
    console.log(`[LoggingInterceptor] 请求结束: ${method} ${url} [${duration}ms]`);

    return result;
  }
}
```

### 响应转换拦截器

```typescript
// transform.interceptor.ts
export class TransformInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const result = await next.handle();

    // 统一包装响应格式
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}
```

### 缓存拦截器

```typescript
// cache.interceptor.ts
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, any>();

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.getRequest();
    const cacheKey = `${request.method}:${request.url}`;

    // 检查缓存
    if (this.cache.has(cacheKey)) {
      console.log('[CacheInterceptor] 缓存命中');
      return this.cache.get(cacheKey);
    }

    // 执行请求并缓存
    const result = await next.handle();
    this.cache.set(cacheKey, result);

    return result;
  }
}
```

### InterceptorsConsumer 实现 (洋葱模型)

```typescript
// interceptors-consumer.ts
export class InterceptorsConsumer {
  async intercept(
    interceptors: NestInterceptor[],
    context: ExecutionContext,
    handler: () => Promise<any>,
  ): Promise<any> {
    // 没有拦截器，直接执行处理器
    if (interceptors.length === 0) {
      return handler();
    }

    // 取出第一个拦截器
    const [first, ...rest] = interceptors;

    // 递归构建洋葱模型
    return first.intercept(context, {
      handle: () => this.intercept(rest, context, handler),
    });
  }
}
```

### 洋葱模型图解

```
请求 →
    LoggingInterceptor.intercept() {
        console.log('Before...')
        ↓
        CacheInterceptor.intercept() {
            if (cached) return cached
            ↓
            Handler() // 控制器方法
            ↑
            cache result
            return result
        }
        ↑
        console.log('After...')
        return result
    }
→ 响应
```

## 4. 异常过滤器 (Exception Filters)

异常过滤器捕获请求处理过程中抛出的异常，格式化错误响应。

### 接口定义

```typescript
export interface ExceptionFilter<T = any> {
  catch(exception: T, host: ArgumentsHost): void;
}

export interface ArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
}
```

### @Catch 装饰器

```typescript
// catch.decorator.ts
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(CATCH_WATERMARK, true, target);
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
```

### 异常过滤器实现

```typescript
// http-exception.filter.ts
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const response = host.getResponse();
    const request = host.getRequest();
    const status = exception.getStatus();

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception.message,
    };

    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(errorResponse));
  }
}
```

### 全局异常过滤器

```typescript
// all-exceptions.filter.ts
@Catch()  // 捕获所有异常
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.getResponse();
    const request = host.getRequest();

    let status = 500;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
    }

    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    }));
  }
}
```

### ExceptionsHandler 实现

```typescript
// exceptions-handler.ts
export class ExceptionsHandler {
  private filters: ExceptionFilter[] = [];

  setCustomFilters(filters: ExceptionFilter[]): void {
    this.filters = filters;
  }

  handle(exception: any, host: ArgumentsHost): void {
    // 查找匹配的过滤器
    for (const filter of this.filters) {
      const catchExceptions = Reflect.getMetadata(FILTER_CATCH_EXCEPTIONS, filter.constructor) || [];

      // @Catch() 不带参数，捕获所有
      if (catchExceptions.length === 0) {
        filter.catch(exception, host);
        return;
      }

      // 检查异常类型是否匹配
      for (const exceptionType of catchExceptions) {
        if (exception instanceof exceptionType) {
          filter.catch(exception, host);
          return;
        }
      }
    }

    // 默认处理
    this.handleUnknownException(exception, host);
  }

  private handleUnknownException(exception: any, host: ArgumentsHost): void {
    const response = host.getResponse();
    const status = exception instanceof HttpException ? exception.getStatus() : 500;
    const message = exception instanceof HttpException ? exception.message : '服务器内部错误';

    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify({ statusCode: status, message }));
  }
}
```

## 组件协作流程

```typescript
// router-execution-context.ts - create 方法核心流程
async (req, res) => {
  const context = createExecutionContext(req, res, controllerClass, handler);

  try {
    // 1. 守卫 - 权限验证
    await this.guardsConsumer.tryActivate(guards, context);
    // 如果守卫返回 false，抛出 ForbiddenException

    // 2. 解析请求体和参数
    const body = await parseBody(req);
    let args = resolveParams(req, res, body);

    // 3. 管道 - 参数验证和转换
    args = await this.applyPipesToArgs(args, pipes, methodName, controllerClass);
    // 如果验证失败，抛出 BadRequestException

    // 4. 拦截器 - 包装处理器执行
    const result = await this.interceptorsConsumer.intercept(
      interceptors,
      context,
      async () => handler.apply(instance, args),  // 5. 控制器方法
    );

    // 6. 发送响应
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(result));

  } catch (error) {
    // 7. 异常过滤器 - 错误处理
    this.exceptionsHandler.handle(error, createArgumentsHost(req, res));
  }
};
```

## 最佳实践

### 1. 守卫用于认证授权

```typescript
@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)  // 先认证，再授权
export class AdminController {}
```

### 2. 管道用于验证转换

```typescript
@Post()
create(
  @Body(new ValidationPipe()) createDto: CreateDto,
  @Param('id', ParseIntPipe) id: number,
) {}
```

### 3. 拦截器用于横切关注点

```typescript
@Controller('cats')
@UseInterceptors(LoggingInterceptor)  // 日志
@UseInterceptors(CacheInterceptor)     // 缓存
export class CatsController {}
```

### 4. 异常过滤器用于错误处理

```typescript
@Controller('cats')
@UseFilters(HttpExceptionFilter)
export class CatsController {}
```

## 与真实 NestJS 的对比

| 功能 | MiniNest | 真实 NestJS |
|-----|----------|------------|
| 全局守卫/管道/拦截器 | ✗ | ✓ |
| 参数级管道 | 简化版 | ✓ |
| RxJS 支持 | ✗ | ✓ (拦截器返回 Observable) |
| 自定义装饰器 | ✗ | ✓ |

## 总结

1. **守卫**: 权限控制的第一道防线
2. **管道**: 参数验证和类型转换
3. **拦截器**: 洋葱模型，前后置处理
4. **异常过滤器**: 统一错误处理

## 进一步阅读

- NestJS 源码: `packages/core/guards/`
- NestJS 源码: `packages/core/pipes/`
- NestJS 源码: `packages/core/interceptors/`
- NestJS 源码: `packages/core/exceptions/`
