# MiniNest 基础版

通过实现简化版 NestJS 框架，理解核心原理：**依赖注入**、**装饰器**、**模块系统**和**路由**。

## 快速开始

```bash
# 在 tutorial 目录下
npm install
npm run start:basic

# 运行测试
npm run test:basic
```

## 核心概念

### 1. 装饰器与元数据

NestJS 使用 TypeScript 装饰器配合 `reflect-metadata` 来存储和读取元数据：

```typescript
// @Injectable() 装饰器的实现原理
function Injectable(): ClassDecorator {
  return (target: object) => {
    // 在类上存储元数据
    Reflect.defineMetadata('__injectable__', true, target);
  };
}

// 后续可以读取这个元数据
Reflect.getMetadata('__injectable__', SomeService); // true
```

**关键文件**: `src/mini-nest/decorators/`

### 2. 依赖注入

TypeScript 在编译时会生成参数类型元数据（`design:paramtypes`），DI 容器利用这个元数据自动解析依赖：

```typescript
@Injectable()
class CatsService {}

@Controller('cats')
class CatsController {
  constructor(private catsService: CatsService) {}
}

// TypeScript 编译后，可以获取构造函数参数类型
Reflect.getMetadata('design:paramtypes', CatsController);
// 返回 [CatsService]

// 注入器利用这个信息自动创建并注入依赖
```

**关键文件**: `src/mini-nest/core/injector.ts`

### 3. 模块系统

模块是组织代码的基本单位：

```typescript
@Module({
  imports: [OtherModule],      // 导入其他模块
  providers: [CatsService],    // 注册服务
  controllers: [CatsController], // 注册控制器
  exports: [CatsService],      // 导出供其他模块使用
})
class CatsModule {}
```

扫描器（Scanner）递归扫描所有模块，建立依赖关系：

```
AppModule
  └── imports: [CatsModule]
        ├── controllers: [CatsController]
        ├── providers: [CatsService]
        └── exports: [CatsService]
```

**关键文件**: `src/mini-nest/core/scanner.ts`

### 4. 启动流程

```
MiniNestFactory.create(AppModule)
        │
        ▼
┌─────────────────────────────────┐
│ 1. 创建 DI 容器                 │
│    new NestContainer()          │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 2. 扫描模块                     │
│    scanner.scan(AppModule)      │
│    - 递归扫描 imports           │
│    - 注册 providers             │
│    - 注册 controllers           │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 3. 实例化依赖                   │
│    injector.loadProvider()      │
│    - 反射构造函数参数类型       │
│    - 递归解析依赖               │
│    - 创建实例                   │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 4. 注册路由                     │
│    routerExplorer.explore()     │
│    - 扫描控制器方法             │
│    - 读取 @Get/@Post 元数据     │
│    - 注册到 HTTP 服务器         │
└─────────────────────────────────┘
        │
        ▼
┌─────────────────────────────────┐
│ 5. 启动 HTTP 服务器             │
│    app.listen(3000)             │
└─────────────────────────────────┘
```

## 文件结构

```
01-basic/
├── src/
│   ├── mini-nest/              # 简化版 NestJS 实现
│   │   ├── constants.ts        # 元数据 key 常量
│   │   ├── interfaces.ts       # 类型定义
│   │   ├── decorators/         # 装饰器实现
│   │   │   ├── injectable.decorator.ts
│   │   │   ├── controller.decorator.ts
│   │   │   ├── module.decorator.ts
│   │   │   └── http.decorator.ts
│   │   ├── core/               # DI 核心
│   │   │   ├── container.ts    # 容器
│   │   │   ├── module.ts       # 模块类
│   │   │   ├── injector.ts     # 注入器
│   │   │   ├── scanner.ts      # 扫描器
│   │   │   └── instance-wrapper.ts
│   │   ├── router/             # 路由系统
│   │   │   └── router.ts
│   │   └── application.ts      # 应用入口
│   │
│   └── demo-app/               # 示例应用
│       ├── main.ts             # 入口
│       ├── app.module.ts       # 根模块
│       └── cats/               # Cats 功能模块
│
└── test/                       # 单元测试
    ├── injector.spec.ts
    ├── scanner.spec.ts
    └── cats.service.spec.ts
```

## 与真实 NestJS 的对照

| 基础版组件 | 真实 NestJS 文件 |
|-----------|-----------------|
| `@Injectable()` | `packages/common/decorators/core/injectable.decorator.ts` |
| `@Module()` | `packages/common/decorators/modules/module.decorator.ts` |
| `NestContainer` | `packages/core/injector/container.ts` |
| `Injector` | `packages/core/injector/injector.ts` |
| `DependenciesScanner` | `packages/core/scanner.ts` |
| `MiniNestFactory` | `packages/core/nest-factory.ts` |

## API 测试

启动应用后，可以使用 curl 测试：

```bash
# 获取所有猫咪
curl http://localhost:3000/cats

# 获取单个猫咪
curl http://localhost:3000/cats/1

# 创建猫咪
curl -X POST http://localhost:3000/cats \
  -H "Content-Type: application/json" \
  -d '{"name":"Kitty","age":1,"breed":"暹罗猫"}'

# 删除猫咪
curl -X DELETE http://localhost:3000/cats/1

# 按品种搜索
curl "http://localhost:3000/cats/search?breed=波斯"
```

## 下一步

学习完基础版后，可以继续学习 **02-full**（完整版），了解更高级的功能：

- 中间件（Middleware）
- 守卫（Guards）
- 管道（Pipes）
- 拦截器（Interceptors）
- 异常过滤器（Exception Filters）
