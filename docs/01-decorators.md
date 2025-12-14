# 装饰器原理详解

装饰器是 NestJS 最核心的特性之一。本文将深入讲解 TypeScript 装饰器的工作原理，以及 NestJS 如何利用装饰器实现依赖注入和路由绑定。

## 什么是装饰器

装饰器是一种特殊的声明，可以附加到类、方法、属性或参数上。装饰器使用 `@expression` 语法，其中 `expression` 必须是一个函数，会在运行时被调用。

```typescript
@Controller('cats')
class CatsController {
  @Get()
  findAll() {}
}
```

## 装饰器类型

TypeScript 支持以下几种装饰器：

### 1. 类装饰器 (Class Decorator)

类装饰器应用于类构造函数，接收类的构造函数作为参数。

```typescript
function Controller(prefix: string) {
  return (target: Function) => {
    // target 是被装饰的类
    console.log(`注册控制器: ${target.name}, 路径前缀: ${prefix}`);
  };
}

@Controller('cats')
class CatsController {}
```

**执行时机**: 类定义时立即执行，不需要实例化。

### 2. 方法装饰器 (Method Decorator)

方法装饰器接收三个参数：
- `target`: 类的原型对象
- `propertyKey`: 方法名称
- `descriptor`: 属性描述符

```typescript
function Get(path: string = '') {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    console.log(`注册路由: GET /${path} -> ${propertyKey}()`);
  };
}

class CatsController {
  @Get('all')
  findAll() {}
}
```

### 3. 参数装饰器 (Parameter Decorator)

参数装饰器接收三个参数：
- `target`: 类的原型对象
- `propertyKey`: 方法名称
- `parameterIndex`: 参数索引

```typescript
function Body() {
  return (target: any, propertyKey: string, parameterIndex: number) => {
    console.log(`参数 ${parameterIndex} 来自请求体`);
  };
}

class CatsController {
  create(@Body() data: any) {}
}
```

### 4. 属性装饰器 (Property Decorator)

属性装饰器接收两个参数：
- `target`: 类的原型对象
- `propertyKey`: 属性名称

```typescript
function Inject(token: any) {
  return (target: any, propertyKey: string) => {
    console.log(`注入 ${token.name} 到 ${propertyKey}`);
  };
}
```

## reflect-metadata

`reflect-metadata` 是一个用于添加元数据的库，NestJS 大量依赖它来存储和读取装饰器信息。

### 安装和使用

```bash
npm install reflect-metadata
```

```typescript
import 'reflect-metadata';

// 定义元数据
Reflect.defineMetadata('key', 'value', target);

// 读取元数据
const value = Reflect.getMetadata('key', target);
```

### NestJS 中的应用

```typescript
// constants.ts - 定义元数据 key
const CONTROLLER_WATERMARK = '__controller__';
const PATH_METADATA = 'path';
const METHOD_METADATA = 'method';

// controller.decorator.ts
function Controller(prefix: string = '/') {
  return (target: Function) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    Reflect.defineMetadata(PATH_METADATA, prefix, target);
  };
}

// 后续读取
const isController = Reflect.getMetadata(CONTROLLER_WATERMARK, SomeClass);
const path = Reflect.getMetadata(PATH_METADATA, SomeClass);
```

## 装饰器执行顺序

当多个装饰器应用于一个声明时，执行顺序如下：

1. 参数装饰器，然后是方法、访问符或属性装饰器（从下到上）
2. 类装饰器

```typescript
@ClassDecorator          // 最后执行
class Example {
  @PropertyDecorator     // 第 2 个执行
  property: string;

  @MethodDecorator       // 第 3 个执行
  method(@ParamDecorator arg: any) {}  // ParamDecorator 第 1 个执行
}
```

## NestJS 装饰器实现

### @Injectable()

```typescript
// injectable.decorator.ts
import 'reflect-metadata';
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from '../constants';

export function Injectable(options?: { scope?: string }): ClassDecorator {
  return (target: Function) => {
    // 标记为可注入
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
    // 存储作用域选项
    if (options?.scope) {
      Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options, target);
    }
  };
}
```

### @Controller()

```typescript
// controller.decorator.ts
import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA } from '../constants';

export function Controller(prefix: string = '/'): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    Reflect.defineMetadata(PATH_METADATA, prefix, target);
  };
}
```

### @Get(), @Post() 等 HTTP 方法装饰器

```typescript
// http.decorator.ts
import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA, RequestMethod } from '../constants';

function createMappingDecorator(method: RequestMethod) {
  return (path: string = ''): MethodDecorator => {
    return (target, propertyKey, descriptor) => {
      Reflect.defineMetadata(PATH_METADATA, path, descriptor.value!);
      Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value!);
    };
  };
}

export const Get = createMappingDecorator(RequestMethod.GET);
export const Post = createMappingDecorator(RequestMethod.POST);
export const Put = createMappingDecorator(RequestMethod.PUT);
export const Delete = createMappingDecorator(RequestMethod.DELETE);
```

### @Param(), @Body(), @Query() 参数装饰器

```typescript
// http.decorator.ts
import 'reflect-metadata';
import { ROUTE_ARGS_METADATA, RouteParamtypes } from '../constants';

function createParamDecorator(paramtype: RouteParamtypes) {
  return (data?: string): ParameterDecorator => {
    return (target, propertyKey, parameterIndex) => {
      // 获取已存在的参数元数据
      const existingParams = Reflect.getMetadata(
        ROUTE_ARGS_METADATA,
        target.constructor,
        propertyKey as string
      ) || {};

      // 添加新的参数信息
      existingParams[`${paramtype}:${parameterIndex}`] = {
        index: parameterIndex,
        data,
        type: paramtype,
      };

      // 保存更新后的元数据
      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        existingParams,
        target.constructor,
        propertyKey as string
      );
    };
  };
}

export const Param = createParamDecorator(RouteParamtypes.PARAM);
export const Body = createParamDecorator(RouteParamtypes.BODY);
export const Query = createParamDecorator(RouteParamtypes.QUERY);
```

### @Module()

```typescript
// module.decorator.ts
import 'reflect-metadata';
import { MODULE_METADATA } from '../constants';

export interface ModuleMetadata {
  imports?: any[];
  controllers?: any[];
  providers?: any[];
  exports?: any[];
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  return (target: Function) => {
    Reflect.defineMetadata(MODULE_METADATA.IMPORTS, metadata.imports || [], target);
    Reflect.defineMetadata(MODULE_METADATA.CONTROLLERS, metadata.controllers || [], target);
    Reflect.defineMetadata(MODULE_METADATA.PROVIDERS, metadata.providers || [], target);
    Reflect.defineMetadata(MODULE_METADATA.EXPORTS, metadata.exports || [], target);
  };
}
```

## design:paramtypes - 构造函数参数类型

TypeScript 编译器会自动为使用了装饰器的类生成 `design:paramtypes` 元数据，这是 NestJS 实现自动依赖注入的关键。

### 启用条件

需要在 `tsconfig.json` 中启用：

```json
{
  "compilerOptions": {
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  }
}
```

### 工作原理

```typescript
@Injectable()
class CatsService {
  constructor(private logger: Logger, private config: ConfigService) {}
}

// TypeScript 编译后会自动添加:
Reflect.metadata('design:paramtypes', [Logger, ConfigService])(CatsService);

// 因此我们可以在运行时获取构造函数参数类型
const paramTypes = Reflect.getMetadata('design:paramtypes', CatsService);
// paramTypes = [Logger, ConfigService]
```

### 在依赖注入中的应用

```typescript
// injector.ts
async resolveConstructorParams(wrapper: InstanceWrapper, moduleRef: Module) {
  const { metatype } = wrapper;

  // 获取构造函数参数类型
  const dependencies = Reflect.getMetadata('design:paramtypes', metatype) || [];

  // 解析每个依赖
  const instances = await Promise.all(
    dependencies.map(dep => this.resolveSingleParam(dep, moduleRef))
  );

  // 使用解析的依赖创建实例
  wrapper.instance = new metatype(...instances);
}
```

## 实践示例

完整的装饰器使用示例：

```typescript
import 'reflect-metadata';

// 定义元数据 key
const INJECTABLE = '__injectable__';
const CONTROLLER = '__controller__';
const PATH = 'path';
const METHOD = 'method';
const PARAMS = 'params';

// 装饰器实现
function Injectable(): ClassDecorator {
  return target => {
    Reflect.defineMetadata(INJECTABLE, true, target);
  };
}

function Controller(path: string): ClassDecorator {
  return target => {
    Reflect.defineMetadata(CONTROLLER, true, target);
    Reflect.defineMetadata(PATH, path, target);
  };
}

function Get(path: string = ''): MethodDecorator {
  return (target, key, descriptor) => {
    Reflect.defineMetadata(PATH, path, descriptor.value!);
    Reflect.defineMetadata(METHOD, 'GET', descriptor.value!);
  };
}

// 使用装饰器
@Injectable()
class CatsService {
  findAll() {
    return ['cat1', 'cat2'];
  }
}

@Controller('cats')
class CatsController {
  constructor(private catsService: CatsService) {}

  @Get()
  findAll() {
    return this.catsService.findAll();
  }
}

// 读取元数据
console.log('CatsService 是可注入的:', Reflect.getMetadata(INJECTABLE, CatsService)); // true
console.log('CatsController 路径:', Reflect.getMetadata(PATH, CatsController)); // 'cats'
console.log('findAll 方法:', Reflect.getMetadata(METHOD, CatsController.prototype.findAll)); // 'GET'

// 获取构造函数参数类型（需要 emitDecoratorMetadata）
const deps = Reflect.getMetadata('design:paramtypes', CatsController);
console.log('CatsController 依赖:', deps); // [CatsService]
```

## 总结

1. **装饰器本质**: 装饰器是在类定义时执行的函数，用于修改或增强类的行为
2. **reflect-metadata**: 提供了在运行时存储和读取元数据的能力
3. **design:paramtypes**: TypeScript 编译器自动生成的构造函数参数类型元数据
4. **NestJS 应用**: 利用装饰器 + 元数据实现了声明式的依赖注入和路由绑定

## 进一步阅读

- [TypeScript 装饰器文档](https://www.typescriptlang.org/docs/handbook/decorators.html)
- [reflect-metadata 库](https://github.com/rbuckton/reflect-metadata)
- NestJS 源码: `packages/common/decorators/`
