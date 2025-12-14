/**
 * @Module 装饰器实现
 *
 * 核心原理：
 * 1. 将模块配置（imports, providers, controllers, exports）存储为元数据
 * 2. 这些元数据在应用启动时被 DependenciesScanner 扫描和处理
 *
 * 参考真实 NestJS：packages/common/decorators/modules/module.decorator.ts
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '../constants';
import { ModuleMetadata } from '../interfaces';

/**
 * 验证模块元数据的 key 是否有效
 * 只允许 imports, providers, controllers, exports 这四个属性
 */
function validateModuleKeys(keys: string[]): void {
  const validKeys = Object.values(MODULE_METADATA);
  keys.forEach(key => {
    if (!validKeys.includes(key)) {
      throw new Error(
        `@Module() 装饰器中发现无效属性 '${key}'。` +
        `有效属性为：${validKeys.join(', ')}`
      );
    }
  });
}

/**
 * 将一个类标记为 NestJS 模块
 *
 * 使用方法：
 * ```typescript
 * @Module({
 *   imports: [OtherModule],      // 导入其他模块
 *   providers: [CatsService],    // 注册服务
 *   controllers: [CatsController], // 注册控制器
 *   exports: [CatsService],      // 导出供其他模块使用
 * })
 * class CatsModule {}
 * ```
 *
 * 模块是 NestJS 组织代码的基本单位：
 * - imports: 导入的模块，可以使用它们导出的 providers
 * - providers: 本模块的服务，可被注入到控制器或其他服务
 * - controllers: 本模块的控制器，处理 HTTP 请求
 * - exports: 导出的 providers，其他模块导入本模块后可以使用
 *
 * @param metadata 模块配置
 * @returns 类装饰器
 */
export function Module(metadata: ModuleMetadata): ClassDecorator {
  // 验证元数据的属性名是否有效
  const propsKeys = Object.keys(metadata);
  validateModuleKeys(propsKeys);

  return (target: Function) => {
    // 遍历 metadata 的每个属性，分别存储为元数据
    // 这样扫描器可以分别读取 imports, providers, controllers, exports
    for (const property in metadata) {
      if (Object.hasOwnProperty.call(metadata, property)) {
        // 使用属性名作为元数据 key
        // 例如：Reflect.defineMetadata('providers', [CatsService], CatsModule)
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }

    // 注意：装饰器不会修改类本身
    // 它只是在类上附加了元数据，供后续的扫描器读取
  };
}
