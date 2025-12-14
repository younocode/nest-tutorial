# MiniNest 完整版

这是 NestJS 核心原理的完整实现版本，在基础版之上增加了请求处理管道的完整功能：

- **守卫 (Guards)** - 权限验证
- **管道 (Pipes)** - 参数验证和转换
- **拦截器 (Interceptors)** - 前置/后置处理
- **异常过滤器 (Exception Filters)** - 统一错误处理

## 快速开始

```bash
# 安装依赖
cd tutorial
npm install

# 运行示例应用
npm run start:full

# 运行测试
npm run test:full
```

## 请求处理管道

NestJS 的请求处理遵循洋葱模型：

```
请求 → 中间件 → 守卫 → 管道 → 拦截器(前) → 控制器 → 拦截器(后) → 响应
                                        ↓
                               异常过滤器 (捕获异常)
```

### 1. 守卫 (Guards)

守卫决定请求是否应该被处理，通常用于认证和授权。

```typescript
// 定义守卫
class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.getRequest();
    const token = request.headers['authorization'];
    return token === 'Bearer valid-token';
  }
}

// 使用守卫
@Controller('cats')
@UseGuards(AuthGuard)
export class CatsController {}
```

**关键接口：**
- `CanActivate` - 守卫必须实现的接口
- `ExecutionContext` - 提供请求上下文信息

### 2. 管道 (Pipes)

管道用于参数验证和转换。

```typescript
// 定义管道
class ParseIntPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): number {
    const val = parseInt(value, 10);
    if (isNaN(val)) {
      throw new BadRequestException('必须是整数');
    }
    return val;
  }
}

// 使用管道
@Get(':id')
@UsePipes(ParseIntPipe)
findOne(@Param('id') id: number) {}
```

**关键接口：**
- `PipeTransform` - 管道必须实现的接口
- `ArgumentMetadata` - 参数元数据（type, data）

### 3. 拦截器 (Interceptors)

拦截器可以在方法执行前后添加额外逻辑，实现洋葱模型。

```typescript
// 定义拦截器
class LoggingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    console.log('Before...');
    const start = Date.now();

    const result = await next.handle();

    console.log(`After... ${Date.now() - start}ms`);
    return result;
  }
}

// 使用拦截器
@Controller('cats')
@UseInterceptors(LoggingInterceptor)
export class CatsController {}
```

**关键接口：**
- `NestInterceptor` - 拦截器必须实现的接口
- `CallHandler` - 调用下一个处理器

### 4. 异常过滤器 (Exception Filters)

异常过滤器捕获并处理抛出的异常。

```typescript
// 定义过滤器
@Catch(HttpException)
class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const response = host.getResponse();
    const status = exception.getStatus();

    response.statusCode = status;
    response.end(JSON.stringify({
      statusCode: status,
      message: exception.message,
    }));
  }
}

// 使用过滤器
@Controller('cats')
@UseFilters(HttpExceptionFilter)
export class CatsController {}
```

**关键接口：**
- `ExceptionFilter` - 过滤器必须实现的接口
- `ArgumentsHost` - 访问请求/响应对象

## 核心实现

### RouterExecutionContext

`RouterExecutionContext` 是请求处理管道的核心，负责协调各组件的执行顺序：

```typescript
// router-execution-context.ts 简化版
create(instance, handler, methodName, controllerClass, resolveParams, parseBody) {
  // 收集装饰器中的守卫、管道、拦截器、过滤器
  const guards = this.reflectGuards(controllerClass, handler);
  const pipes = this.reflectPipes(controllerClass, handler);
  const interceptors = this.reflectInterceptors(controllerClass, handler);
  const filters = this.reflectFilters(controllerClass, handler);

  return async (req, res) => {
    const context = createExecutionContext(req, res, controllerClass, handler);

    try {
      // 1. 执行守卫
      await this.guardsConsumer.tryActivate(guards, context);

      // 2. 解析请求体和参数
      const body = await parseBody(req);
      let args = resolveParams(req, res, body);

      // 3. 执行管道
      args = await this.applyPipesToArgs(args, pipes, methodName, controllerClass);

      // 4. 执行拦截器和处理器
      const result = await this.interceptorsConsumer.intercept(
        interceptors,
        context,
        () => handler.apply(instance, args)
      );

      // 5. 发送响应
      res.end(JSON.stringify(result));
    } catch (error) {
      // 6. 异常处理
      this.exceptionsHandler.handle(error, host);
    }
  };
}
```

### 元数据收集

使用 `Reflect.getMetadata` 从控制器类和方法收集装饰器元数据：

```typescript
private reflectGuards(controllerClass, handler): CanActivate[] {
  // 控制器级别的守卫
  const controllerGuards = Reflect.getMetadata(GUARDS_METADATA, controllerClass) || [];
  // 方法级别的守卫
  const methodGuards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
  // 合并并实例化
  return [...this.instantiate(controllerGuards), ...this.instantiate(methodGuards)];
}
```

## 目录结构

```
02-full/
├── src/
│   ├── mini-nest/
│   │   ├── decorators/
│   │   │   ├── use-guards.decorator.ts
│   │   │   ├── use-pipes.decorator.ts
│   │   │   ├── use-interceptors.decorator.ts
│   │   │   └── catch.decorator.ts
│   │   ├── guards/
│   │   │   └── guards-consumer.ts
│   │   ├── pipes/
│   │   │   └── pipes-consumer.ts
│   │   ├── interceptors/
│   │   │   └── interceptors-consumer.ts
│   │   ├── exceptions/
│   │   │   ├── http-exception.ts
│   │   │   └── exceptions-handler.ts
│   │   └── router/
│   │       └── router-execution-context.ts
│   └── demo-app/
│       ├── common/
│       │   ├── guards/auth.guard.ts
│       │   ├── pipes/validation.pipe.ts
│       │   ├── interceptors/logging.interceptor.ts
│       │   └── filters/http-exception.filter.ts
│       └── cats/
│           └── ...
└── test/
    ├── guards-consumer.spec.ts
    ├── pipes-consumer.spec.ts
    └── interceptors-consumer.spec.ts
```

## 测试接口

启动应用后，使用以下命令测试：

```bash
# 获取所有猫咪 (无需认证)
curl http://localhost:3000/cats

# 获取单个猫咪 (参数会被 ParseIntPipe 转换)
curl http://localhost:3000/cats/1

# 搜索猫咪
curl "http://localhost:3000/cats/search?name=小橘"

# 创建猫咪 (需要认证)
curl -X POST http://localhost:3000/cats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid-token" \
  -d '{"name":"小白","age":1,"breed":"波斯猫"}'

# 创建猫咪 (无认证 - 被守卫拒绝，返回 403)
curl -X POST http://localhost:3000/cats \
  -H "Content-Type: application/json" \
  -d '{"name":"小白","age":1}'

# 创建猫咪 (验证失败 - 管道抛出异常，返回 400)
curl -X POST http://localhost:3000/cats \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer valid-token" \
  -d '{"name":"","age":-1}'

# 访问不存在的猫咪 (异常过滤器处理，返回 404)
curl http://localhost:3000/cats/999

# 删除猫咪 (需要认证)
curl -X DELETE http://localhost:3000/cats/1 \
  -H "Authorization: Bearer valid-token"
```

## 对应真实 NestJS 源码

| 组件 | MiniNest 文件 | NestJS 源码 |
|-----|--------------|-------------|
| 守卫消费者 | guards-consumer.ts | packages/core/guards/guards-consumer.ts |
| 管道消费者 | pipes-consumer.ts | packages/core/pipes/pipes-consumer.ts |
| 拦截器消费者 | interceptors-consumer.ts | packages/core/interceptors/interceptors-consumer.ts |
| 异常处理器 | exceptions-handler.ts | packages/core/exceptions/exceptions-handler.ts |
| 路由执行上下文 | router-execution-context.ts | packages/core/router/router-execution-context.ts |
| HTTP 异常 | http-exception.ts | packages/common/exceptions/http.exception.ts |

## 下一步学习

1. 阅读 `docs/04-request-pipeline.md` 了解请求处理流程
2. 阅读 `docs/05-middleware-guards-pipes.md` 深入理解各组件
3. 参考真实 NestJS 源码，了解更多高级特性
