# 依赖注入容器详解

依赖注入 (Dependency Injection, DI) 是 NestJS 的核心设计模式。本文将深入讲解 DI 容器的实现原理。

## 什么是依赖注入

依赖注入是一种设计模式，其中对象的依赖关系由外部容器注入，而不是在对象内部创建。

### 没有 DI 的代码

```typescript
class CatsService {
  private logger = new Logger();  // 直接创建依赖
  private db = new Database();    // 紧耦合

  findAll() {
    this.logger.log('Finding all cats');
    return this.db.query('SELECT * FROM cats');
  }
}
```

问题：
- 紧耦合：CatsService 直接依赖具体实现
- 难以测试：无法替换 Logger 或 Database 的实现
- 难以复用：每次创建 CatsService 都会创建新的 Logger 和 Database

### 使用 DI 的代码

```typescript
@Injectable()
class CatsService {
  constructor(
    private logger: Logger,    // 依赖由容器注入
    private db: Database,
  ) {}

  findAll() {
    this.logger.log('Finding all cats');
    return this.db.query('SELECT * FROM cats');
  }
}
```

优势：
- 松耦合：CatsService 只依赖接口，不关心具体实现
- 易测试：可以注入 mock 对象
- 易复用：同一个 Logger 实例可以被多个服务共享

## DI 容器核心概念

### 1. Provider (提供者)

Provider 是 DI 系统中的核心概念，它定义了如何创建一个依赖。

```typescript
// 类提供者 - 最常见
@Injectable()
class CatsService {}

// 值提供者
{ provide: 'CONFIG', useValue: { port: 3000 } }

// 工厂提供者
{ provide: 'CONNECTION', useFactory: () => createConnection() }

// 别名提供者
{ provide: 'ALIAS', useExisting: CatsService }
```

### 2. Token (令牌)

Token 是标识一个依赖的唯一标识符，通常是类本身。

```typescript
// 类作为 token
@Inject(CatsService) private catsService: CatsService;

// 字符串作为 token
@Inject('CONFIG') private config: any;

// Symbol 作为 token
const DATABASE = Symbol('DATABASE');
@Inject(DATABASE) private db: any;
```

### 3. Scope (作用域)

Provider 的生命周期：

- **SINGLETON** (默认): 整个应用共享一个实例
- **REQUEST**: 每个请求创建新实例
- **TRANSIENT**: 每次注入创建新实例

```typescript
@Injectable({ scope: Scope.REQUEST })
class RequestScopedService {}
```

## NestJS DI 容器实现

### 核心类

```
NestContainer          - 顶层容器，管理所有模块
    ├── Module         - 单个模块，包含 providers 和 controllers
    │   ├── providers  - Map<Type, InstanceWrapper>
    │   └── controllers- Map<Type, InstanceWrapper>
    ├── InstanceWrapper- 包装实例，管理生命周期
    └── Injector       - 负责解析依赖并创建实例
```

### 1. NestContainer - 顶层容器

```typescript
// container.ts
export class NestContainer {
  // 存储所有模块，key 是模块名称
  private readonly modules = new Map<string, Module>();
  // 全局提供者（被所有模块共享）
  private readonly globalProviders = new Map<any, InstanceWrapper>();

  // 添加模块
  addModule(metatype: Type<any>, scope: Type<any>[]): Module {
    const token = metatype.name;
    if (this.modules.has(token)) {
      return this.modules.get(token)!;
    }

    const module = new Module(metatype, scope);
    module.distance = scope.length; // 计算模块深度
    this.modules.set(token, module);
    return module;
  }

  // 添加提供者
  addProvider(provider: Type<any>, moduleToken: string): void {
    const moduleRef = this.modules.get(moduleToken);
    if (!moduleRef) throw new Error(`Module ${moduleToken} not found`);

    const wrapper = new InstanceWrapper({
      name: provider.name,
      metatype: provider,
      instance: null,
    });

    moduleRef.providers.set(provider, wrapper);
  }

  // 绑定全局作用域
  bindGlobalScope(): void {
    this.modules.forEach(module => {
      module.exports.forEach(exportToken => {
        const wrapper = module.providers.get(exportToken);
        if (wrapper) {
          this.globalProviders.set(exportToken, wrapper);
        }
      });
    });
  }
}
```

### 2. Module - 模块

```typescript
// module.ts
export class Module {
  // 该模块的提供者
  public readonly providers = new Map<any, InstanceWrapper>();
  // 该模块的控制器
  public readonly controllers = new Map<any, InstanceWrapper>();
  // 导入的模块
  public readonly imports = new Set<Module>();
  // 导出的 token
  public readonly exports = new Set<any>();
  // 模块深度（用于实例化顺序）
  public distance: number = 0;

  constructor(
    public readonly metatype: Type<any>,
    public readonly scope: Type<any>[],
  ) {}

  // 在当前模块及导入的模块中查找提供者
  getProviderByKey(key: any): InstanceWrapper | undefined {
    // 先在当前模块查找
    if (this.providers.has(key)) {
      return this.providers.get(key);
    }

    // 再在导入的模块中查找导出的提供者
    for (const importedModule of this.imports) {
      if (importedModule.exports.has(key)) {
        const wrapper = importedModule.providers.get(key);
        if (wrapper) return wrapper;
      }
    }

    return undefined;
  }
}
```

### 3. InstanceWrapper - 实例包装器

```typescript
// instance-wrapper.ts
export class InstanceWrapper<T = any> {
  public name: string;
  public metatype: Type<T> | null;
  public instance: T | null = null;
  public isResolved: boolean = false;

  private pendingPromise: Promise<void> | null = null;

  constructor(options: { name: string; metatype: Type<T> | null; instance: T | null }) {
    this.name = options.name;
    this.metatype = options.metatype;
    this.instance = options.instance;
  }

  // 等待实例解析完成（处理循环依赖）
  async waitForResolved(): Promise<void> {
    if (this.isResolved) return;
    if (this.pendingPromise) {
      await this.pendingPromise;
    }
  }

  // 设置解析中状态
  setPending(promise: Promise<void>): void {
    this.pendingPromise = promise;
  }

  // 标记为已解析
  setResolved(): void {
    this.isResolved = true;
    this.pendingPromise = null;
  }
}
```

### 4. Injector - 依赖注入器

这是 DI 容器的核心，负责解析依赖并创建实例。

```typescript
// injector.ts
export class Injector {
  // 加载提供者实例
  async loadProvider(wrapper: InstanceWrapper, moduleRef: Module): Promise<void> {
    if (wrapper.isResolved) return;

    // 创建解析 Promise
    const resolvePromise = this.resolveConstructorParams(wrapper, moduleRef);
    wrapper.setPending(resolvePromise);

    await resolvePromise;
  }

  // 解析构造函数参数
  private async resolveConstructorParams(
    wrapper: InstanceWrapper,
    moduleRef: Module,
  ): Promise<void> {
    const { metatype } = wrapper;
    if (!metatype) {
      wrapper.setResolved();
      return;
    }

    // 关键：使用 design:paramtypes 获取构造函数参数类型
    const dependencies: Type<any>[] =
      Reflect.getMetadata('design:paramtypes', metatype) || [];

    console.log(`[Injector] 解析 ${metatype.name} 的依赖:`, dependencies.map(d => d.name));

    // 解析每个依赖
    const instances = await Promise.all(
      dependencies.map((dep, index) =>
        this.resolveSingleParam(dep, moduleRef, wrapper, index)
      )
    );

    // 创建实例
    wrapper.instance = new metatype(...instances);
    wrapper.setResolved();

    console.log(`[Injector] ✓ ${metatype.name} 实例化完成`);
  }

  // 解析单个参数
  private async resolveSingleParam(
    dependency: Type<any>,
    moduleRef: Module,
    parentWrapper: InstanceWrapper,
    index: number,
  ): Promise<any> {
    // 在模块中查找依赖
    const dependencyWrapper = moduleRef.getProviderByKey(dependency);

    if (!dependencyWrapper) {
      throw new Error(
        `无法解析 ${parentWrapper.name} 的第 ${index} 个参数: ${dependency?.name || 'undefined'}`
      );
    }

    // 等待依赖解析完成（处理循环依赖）
    await dependencyWrapper.waitForResolved();

    // 如果依赖还没有实例，递归解析
    if (!dependencyWrapper.instance) {
      await this.loadProvider(dependencyWrapper, moduleRef);
    }

    return dependencyWrapper.instance;
  }
}
```

## 依赖解析流程

```
1. 扫描模块树
   └── DependenciesScanner.scan(AppModule)
       ├── 递归扫描所有模块
       ├── 注册 providers, controllers, exports
       └── 建立模块导入关系

2. 实例化
   └── 按模块深度排序（叶子模块先实例化）
       └── 对每个模块的 providers 和 controllers
           └── Injector.loadProvider(wrapper, moduleRef)
               ├── 获取 design:paramtypes
               ├── 递归解析每个依赖
               └── new Metatype(...resolvedDependencies)
```

### 实例化顺序示例

```typescript
@Module({ providers: [DatabaseService] })
class DatabaseModule {}

@Module({
  imports: [DatabaseModule],
  providers: [CatsService],
})
class CatsModule {}

@Module({ imports: [CatsModule] })
class AppModule {}
```

实例化顺序：
1. DatabaseModule (distance: 2) → DatabaseService
2. CatsModule (distance: 1) → CatsService (依赖 DatabaseService)
3. AppModule (distance: 0)

## 循环依赖处理

NestJS 使用 `pendingPromise` 机制处理循环依赖：

```typescript
// A 依赖 B，B 依赖 A
@Injectable()
class A {
  constructor(@Inject(forwardRef(() => B)) private b: B) {}
}

@Injectable()
class B {
  constructor(@Inject(forwardRef(() => A)) private a: A) {}
}
```

解析流程：
1. 开始解析 A，设置 A.pendingPromise
2. A 需要 B，开始解析 B
3. B 需要 A，但 A 有 pendingPromise，等待...
4. A 完成解析，B 获取 A 的实例
5. B 完成解析

## 模块导入导出

### 导出机制

```typescript
@Module({
  providers: [CatsService, LoggerService],
  exports: [CatsService],  // 只导出 CatsService
})
class CatsModule {}

@Module({
  imports: [CatsModule],
  providers: [DogsService],
})
class DogsModule {}
// DogsService 可以注入 CatsService，但不能注入 LoggerService
```

### 查找逻辑

```typescript
getProviderByKey(key: any): InstanceWrapper | undefined {
  // 1. 先在当前模块查找
  if (this.providers.has(key)) {
    return this.providers.get(key);
  }

  // 2. 在导入的模块中查找（只查找导出的）
  for (const importedModule of this.imports) {
    if (importedModule.exports.has(key)) {
      return importedModule.providers.get(key);
    }
  }

  // 3. 在全局提供者中查找
  return this.globalProviders.get(key);
}
```

## 与真实 NestJS 的对比

| 概念 | MiniNest | 真实 NestJS |
|-----|----------|------------|
| 容器 | NestContainer | NestContainer + ModulesContainer |
| 模块 | Module | Module (更复杂的导入导出逻辑) |
| 实例包装 | InstanceWrapper | InstanceWrapper (支持更多 scope) |
| 注入器 | Injector | Injector (支持循环依赖、异步工厂等) |
| Token | 类引用 | 类引用 + 字符串 + Symbol |
| Scope | 仅 SINGLETON | SINGLETON + REQUEST + TRANSIENT |

## 测试 DI 容器

```typescript
// injector.spec.ts
describe('Injector', () => {
  it('应该正确解析依赖', async () => {
    @Injectable()
    class Logger {}

    @Injectable()
    class CatsService {
      constructor(public logger: Logger) {}
    }

    const container = new NestContainer();
    const moduleRef = container.addModule(TestModule, []);
    container.addProvider(Logger, 'TestModule');
    container.addProvider(CatsService, 'TestModule');

    const injector = new Injector();
    const loggerWrapper = moduleRef.providers.get(Logger)!;
    const catsServiceWrapper = moduleRef.providers.get(CatsService)!;

    await injector.loadProvider(loggerWrapper, moduleRef);
    await injector.loadProvider(catsServiceWrapper, moduleRef);

    expect(catsServiceWrapper.instance).to.be.instanceOf(CatsService);
    expect(catsServiceWrapper.instance.logger).to.be.instanceOf(Logger);
  });
});
```

## 总结

1. **Provider**: 定义如何创建依赖
2. **Token**: 依赖的唯一标识符
3. **InstanceWrapper**: 包装实例，管理生命周期
4. **Injector**: 核心，使用 `design:paramtypes` 解析依赖
5. **Module**: 组织 providers，控制可见性

## 进一步阅读

- NestJS 源码: `packages/core/injector/`
- 设计模式: 控制反转 (IoC)、依赖注入 (DI)
