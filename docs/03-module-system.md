# 模块系统详解

模块是 NestJS 组织代码的基本单元。本文将深入讲解模块系统的工作原理，包括模块扫描、依赖解析和导入导出机制。

## 什么是模块

模块是用 `@Module()` 装饰器标注的类，用于组织相关的功能。每个 NestJS 应用至少有一个根模块。

```typescript
@Module({
  imports: [DatabaseModule],      // 导入的模块
  controllers: [CatsController],  // 控制器
  providers: [CatsService],       // 提供者
  exports: [CatsService],         // 导出给其他模块使用
})
export class CatsModule {}
```

## 模块元数据

`@Module()` 装饰器接收一个描述模块的元数据对象：

| 属性 | 说明 |
|-----|------|
| imports | 导入其他模块，使其导出的提供者在本模块可用 |
| controllers | 本模块的控制器，会被实例化 |
| providers | 本模块的提供者，可被注入到控制器或其他提供者 |
| exports | 本模块导出的提供者，可被其他导入本模块的模块使用 |

### @Module() 装饰器实现

```typescript
// module.decorator.ts
export const MODULE_METADATA = {
  IMPORTS: 'imports',
  CONTROLLERS: 'controllers',
  PROVIDERS: 'providers',
  EXPORTS: 'exports',
};

export interface ModuleMetadata {
  imports?: Type<any>[];
  controllers?: Type<any>[];
  providers?: Type<any>[];
  exports?: Type<any>[];
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    // 存储各种元数据
    Reflect.defineMetadata(MODULE_METADATA.IMPORTS, metadata.imports || [], target);
    Reflect.defineMetadata(MODULE_METADATA.CONTROLLERS, metadata.controllers || [], target);
    Reflect.defineMetadata(MODULE_METADATA.PROVIDERS, metadata.providers || [], target);
    Reflect.defineMetadata(MODULE_METADATA.EXPORTS, metadata.exports || [], target);
  };
}
```

## 模块扫描器 (DependenciesScanner)

模块扫描器负责递归扫描所有模块，建立模块依赖树。

### 扫描流程

```
scan(AppModule)
├── scanForModules(AppModule, [])
│   ├── container.addModule(AppModule, [])
│   └── 获取 imports: [CatsModule, UsersModule]
│       ├── scanForModules(CatsModule, [AppModule])
│       │   ├── container.addModule(CatsModule, [AppModule])
│       │   └── 获取 imports: [DatabaseModule]
│       │       └── scanForModules(DatabaseModule, [AppModule, CatsModule])
│       └── scanForModules(UsersModule, [AppModule])
└── scanModulesForDependencies()
    └── 对每个模块注册 providers, controllers, exports
```

### 扫描器实现

```typescript
// scanner.ts
export class DependenciesScanner {
  constructor(private readonly container: NestContainer) {}

  async scan(module: Type<any>): Promise<void> {
    // 第一阶段：扫描所有模块
    await this.scanForModules(module);

    // 第二阶段：扫描各模块的依赖
    await this.scanModulesForDependencies();

    // 第三阶段：绑定全局作用域
    this.container.bindGlobalScope();
  }

  // 递归扫描模块
  private async scanForModules(
    module: Type<any>,
    scope: Type<any>[] = [],
    registry: Type<any>[] = [],
  ): Promise<void> {
    // 防止重复扫描
    if (registry.includes(module)) return;
    registry.push(module);

    // 添加模块到容器
    await this.container.addModule(module, scope);

    // 递归扫描导入的模块
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) || [];
    for (const innerModule of imports) {
      await this.scanForModules(innerModule, [...scope, module], registry);
    }
  }

  // 扫描各模块的依赖
  private async scanModulesForDependencies(): Promise<void> {
    const modules = this.container.getModules();

    for (const [token, moduleRef] of modules) {
      const { metatype } = moduleRef;

      // 注册导入关系
      await this.reflectImports(metatype, token);

      // 注册提供者
      this.reflectProviders(metatype, token);

      // 注册控制器
      this.reflectControllers(metatype, token);

      // 注册导出
      this.reflectExports(metatype, token);
    }
  }

  private async reflectImports(module: Type<any>, token: string): Promise<void> {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) || [];
    for (const relatedModule of imports) {
      await this.container.addImport(relatedModule, token);
    }
  }

  private reflectProviders(module: Type<any>, token: string): void {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) || [];
    providers.forEach((provider: Type<any>) => {
      this.container.addProvider(provider, token);
    });
  }

  private reflectControllers(module: Type<any>, token: string): void {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) || [];
    controllers.forEach((controller: Type<any>) => {
      this.container.addController(controller, token);
    });
  }

  private reflectExports(module: Type<any>, token: string): void {
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, module) || [];
    exports.forEach((exportToken: any) => {
      this.container.addExport(token, exportToken);
    });
  }
}
```

## 模块深度 (Distance)

模块深度用于确定实例化顺序。深度越大的模块（叶子模块）先实例化。

```
AppModule (distance: 0)
├── CatsModule (distance: 1)
│   └── DatabaseModule (distance: 2)
└── UsersModule (distance: 1)
    └── DatabaseModule (distance: 2) // 重复，不再计算
```

实例化顺序：DatabaseModule → CatsModule, UsersModule → AppModule

### 实现

```typescript
// container.ts
addModule(metatype: Type<any>, scope: Type<any>[]): Module {
  const module = new Module(metatype, scope);
  module.distance = scope.length;  // scope 数组长度就是深度
  this.modules.set(token, module);
  return module;
}

// 实例化时按深度排序
const modules = [...container.getModules().values()]
  .sort((a, b) => b.distance - a.distance);  // 深度大的先实例化
```

## 模块导入导出机制

### 基本规则

1. **providers 是模块私有的**: 默认只能在本模块内使用
2. **exports 控制可见性**: 只有导出的 provider 才能被其他模块使用
3. **imports 获取外部依赖**: 导入模块后可以使用其导出的 provider

### 示例

```typescript
// database.module.ts
@Module({
  providers: [
    DatabaseConnection,  // 私有
    QueryBuilder,        // 私有
  ],
  exports: [DatabaseConnection],  // 只导出 DatabaseConnection
})
export class DatabaseModule {}

// cats.module.ts
@Module({
  imports: [DatabaseModule],
  providers: [CatsService],  // CatsService 可以注入 DatabaseConnection
})
export class CatsModule {}

// CatsService
@Injectable()
export class CatsService {
  constructor(
    private db: DatabaseConnection,  // ✓ 可以注入
    // private qb: QueryBuilder,      // ✗ 无法注入，QueryBuilder 未导出
  ) {}
}
```

### 依赖查找逻辑

```typescript
// module.ts
getProviderByKey(key: any): InstanceWrapper | undefined {
  // 1. 在当前模块的 providers 中查找
  if (this.providers.has(key)) {
    return this.providers.get(key);
  }

  // 2. 在导入的模块中查找（只查找已导出的）
  for (const importedModule of this.imports) {
    // 检查是否在导出列表中
    if (importedModule.exports.has(key)) {
      const wrapper = importedModule.providers.get(key);
      if (wrapper) return wrapper;
    }
  }

  return undefined;
}
```

## 全局模块

全局模块的提供者可以被所有模块访问，无需显式导入。

```typescript
@Global()
@Module({
  providers: [ConfigService],
  exports: [ConfigService],
})
export class ConfigModule {}
```

### 实现原理

```typescript
// container.ts
bindGlobalScope(): void {
  this.modules.forEach(module => {
    // 检查是否是全局模块
    const isGlobal = Reflect.getMetadata(GLOBAL_MODULE_METADATA, module.metatype);
    if (isGlobal) {
      module.exports.forEach(exportToken => {
        const wrapper = module.providers.get(exportToken);
        if (wrapper) {
          // 添加到全局提供者
          this.globalProviders.set(exportToken, wrapper);
        }
      });
    }
  });
}

// 查找时也检查全局提供者
getProviderByKey(key: any): InstanceWrapper | undefined {
  // ... 先检查本模块和导入的模块

  // 3. 在全局提供者中查找
  return this.globalProviders.get(key);
}
```

## 动态模块

动态模块允许运行时配置模块。

```typescript
@Module({})
export class DatabaseModule {
  static forRoot(options: DatabaseOptions): DynamicModule {
    return {
      module: DatabaseModule,
      providers: [
        {
          provide: 'DATABASE_OPTIONS',
          useValue: options,
        },
        DatabaseService,
      ],
      exports: [DatabaseService],
    };
  }
}

// 使用
@Module({
  imports: [DatabaseModule.forRoot({ host: 'localhost' })],
})
export class AppModule {}
```

## 模块树可视化

```typescript
// 打印模块树
function printModuleTree(container: NestContainer) {
  console.log('\n=== 模块树 ===');
  const modules = [...container.getModules().entries()];

  modules.forEach(([token, module]) => {
    const indent = '  '.repeat(module.distance);
    console.log(`${indent}[${module.distance}] ${token}`);
    console.log(`${indent}    providers: ${[...module.providers.keys()].map(k => k.name).join(', ')}`);
    console.log(`${indent}    controllers: ${[...module.controllers.keys()].map(k => k.name).join(', ')}`);
    console.log(`${indent}    exports: ${[...module.exports].map(k => k.name).join(', ')}`);
  });
}
```

输出示例：

```
=== 模块树 ===
    [2] DatabaseModule
        providers: DatabaseConnection
        controllers:
        exports: DatabaseConnection
  [1] CatsModule
      providers: CatsService
      controllers: CatsController
      exports: CatsService
[0] AppModule
    providers:
    controllers:
    exports:
```

## 最佳实践

### 1. 功能模块化

每个功能域一个模块：

```
src/
├── users/
│   ├── users.module.ts
│   ├── users.controller.ts
│   └── users.service.ts
├── cats/
│   ├── cats.module.ts
│   ├── cats.controller.ts
│   └── cats.service.ts
└── app.module.ts
```

### 2. 共享模块

将公共功能提取到共享模块：

```typescript
@Module({
  providers: [UtilService, LoggerService],
  exports: [UtilService, LoggerService],
})
export class SharedModule {}
```

### 3. 核心模块

全局单例放在核心模块：

```typescript
@Global()
@Module({
  providers: [ConfigService, DatabaseService],
  exports: [ConfigService, DatabaseService],
})
export class CoreModule {}
```

### 4. 避免循环导入

```typescript
// ❌ 错误：循环导入
// a.module.ts imports b.module.ts
// b.module.ts imports a.module.ts

// ✓ 正确：提取共享部分到第三个模块
// shared.module.ts 被 a 和 b 导入
```

## 测试模块

```typescript
// scanner.spec.ts
describe('DependenciesScanner', () => {
  it('应该正确扫描模块树', async () => {
    @Injectable()
    class TestService {}

    @Controller('test')
    class TestController {}

    @Module({
      providers: [TestService],
      controllers: [TestController],
    })
    class TestModule {}

    const container = new NestContainer();
    const scanner = new DependenciesScanner(container);

    await scanner.scan(TestModule);

    const moduleRef = container.getModules().get('TestModule');
    expect(moduleRef).to.exist;
    expect(moduleRef!.providers.has(TestService)).to.be.true;
    expect(moduleRef!.controllers.has(TestController)).to.be.true;
  });
});
```

## 与真实 NestJS 的对比

| 功能 | MiniNest | 真实 NestJS |
|-----|----------|------------|
| 基本模块 | ✓ | ✓ |
| 动态模块 | 简化版 | 完整支持 |
| 全局模块 | ✓ | ✓ |
| 模块重导出 | ✗ | ✓ |
| 异步模块 | ✗ | ✓ (forRootAsync) |

## 总结

1. **@Module()**: 装饰器，存储模块元数据
2. **DependenciesScanner**: 递归扫描模块树
3. **Module Distance**: 控制实例化顺序
4. **导入导出**: 控制提供者的可见性
5. **全局模块**: 使提供者全局可用

## 进一步阅读

- NestJS 源码: `packages/core/scanner.ts`
- NestJS 源码: `packages/core/injector/module.ts`
