# NestJS 核心原理教学项目

vibe coding by Claude Code 

通过实现一个简化版的 NestJS 框架（Mini-Nest），深入理解 NestJS 的核心原理。

## 项目结构

```
tutorial/
├── 01-basic/          # 基础版：DI 容器 + 装饰器 + 模块系统 + 路由
├── 02-full/           # 完整版：基础版 + 中间件 + 守卫 + 管道 + 拦截器 + 异常过滤器
└── docs/              # 详细教学文档
```

## 快速开始

```bash
# 安装依赖
npm install

# 运行基础版示例
npm run start:basic

# 运行完整版示例
npm run start:full

# 运行测试
npm test
```

## 学习路径

### 基础版 (01-basic) - 建议先学习

核心概念：
1. **装饰器原理** - `@Injectable()`, `@Controller()`, `@Module()` 如何工作
2. **依赖注入** - 如何通过 `reflect-metadata` 自动解析和注入依赖
3. **模块系统** - 模块如何组织代码，imports/exports 如何工作
4. **路由系统** - 控制器如何映射到 HTTP 路由

```
启动流程：
NestFactory.create(AppModule)
    ↓
扫描模块 (DependenciesScanner)
    ↓
注册 providers 和 controllers
    ↓
实例化依赖 (Injector)
    ↓
注册路由 (RouterExplorer)
    ↓
启动 HTTP 服务器
```

### 完整版 (02-full) - 进阶学习

在基础版的基础上，增加：
1. **中间件** - 请求预处理
2. **守卫** - 权限控制
3. **管道** - 数据验证和转换
4. **拦截器** - 请求/响应处理
5. **异常过滤器** - 统一错误处理

```
请求处理管道：
HTTP 请求
    ↓
中间件 (Middleware)
    ↓
守卫 (Guards)
    ↓
管道 (Pipes)
    ↓
拦截器 - 前置 (Interceptors Pre)
    ↓
控制器方法 (Controller)
    ↓
拦截器 - 后置 (Interceptors Post)
    ↓
异常过滤器 (Exception Filters) [如有异常]
    ↓
HTTP 响应
```

## 核心原理概览

### 1. 装饰器与元数据

NestJS 大量使用 TypeScript 装饰器和 `reflect-metadata` 库：

```typescript
// 装饰器将元数据存储到类上
@Injectable()  // Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target)
class CatsService {}

// 后续可以读取这些元数据
Reflect.getMetadata(INJECTABLE_WATERMARK, CatsService)  // true
```

### 2. 依赖注入

```typescript
@Controller('cats')
class CatsController {
  // TypeScript 编译器会生成 'design:paramtypes' 元数据
  constructor(private catsService: CatsService) {}
}

// Injector 读取元数据，自动解析依赖
const deps = Reflect.getMetadata('design:paramtypes', CatsController);
// deps = [CatsService]
```

### 3. 模块化

```typescript
@Module({
  imports: [OtherModule],     // 导入其他模块
  providers: [CatsService],   // 注册服务
  controllers: [CatsController], // 注册控制器
  exports: [CatsService],     // 导出供其他模块使用
})
class CatsModule {}
```

## 与真实 NestJS 的对照

| Mini-Nest 组件 | 真实 NestJS 文件位置 |
|---------------|---------------------|
| `@Injectable()` | `packages/common/decorators/core/injectable.decorator.ts` |
| `@Module()` | `packages/common/decorators/modules/module.decorator.ts` |
| `NestContainer` | `packages/core/injector/container.ts` |
| `Injector` | `packages/core/injector/injector.ts` |
| `DependenciesScanner` | `packages/core/scanner.ts` |
| `NestFactory` | `packages/core/nest-factory.ts` |

## 详细文档

- [01-decorators.md](./docs/01-decorators.md) - 装饰器原理详解
- [02-di-container.md](./docs/02-di-container.md) - 依赖注入容器详解
- [03-module-system.md](./docs/03-module-system.md) - 模块系统详解
- [04-request-pipeline.md](./docs/04-request-pipeline.md) - 请求处理管道详解
- [05-middleware-guards-pipes.md](./docs/05-middleware-guards-pipes.md) - 中间件、守卫、管道详解

## 推荐学习顺序

1. 阅读 `docs/01-decorators.md`，理解装饰器基础
2. 运行 `npm run start:basic`，查看启动日志
3. 阅读 `01-basic/src/mini-nest/` 源码，对照文档理解
4. 阅读 `docs/02-di-container.md` 和 `docs/03-module-system.md`
5. 切换到完整版，学习高级特性

## 注意事项

- 本项目仅用于教学目的，简化了很多边界情况处理
- 生产环境请使用官方 NestJS 框架
- 代码中的中文注释详细解释了每个关键步骤
