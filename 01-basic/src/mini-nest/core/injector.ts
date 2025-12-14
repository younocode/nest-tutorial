/**
 * Injector - 依赖注入器
 *
 * 核心原理：
 * 1. 使用 reflect-metadata 获取类的构造函数参数类型
 * 2. 递归解析和实例化所有依赖
 * 3. 处理依赖查找（当前模块 -> 导入模块）
 *
 * 这是 DI 系统的核心！
 *
 * 参考真实 NestJS：packages/core/injector/injector.ts
 */
import 'reflect-metadata';
import { Type, InjectionToken } from '../interfaces';
import { PARAMTYPES_METADATA } from '../constants';
import { Module } from './module';
import { InstanceWrapper } from './instance-wrapper';

/**
 * 依赖注入器
 *
 * 负责：
 * 1. 解析依赖关系
 * 2. 创建实例
 * 3. 管理依赖查找范围
 */
export class Injector {
  /**
   * 加载提供者实例
   *
   * @param wrapper 要加载的实例包装器
   * @param moduleRef 所属模块
   */
  async loadProvider(wrapper: InstanceWrapper, moduleRef: Module): Promise<void> {
    // 如果已经解析过，直接返回（单例模式的缓存）
    if (wrapper.isResolved) {
      return;
    }

    // 解析构造函数参数并创建实例
    await this.resolveConstructorParams(wrapper, moduleRef);
  }

  /**
   * 加载控制器实例
   * 与 loadProvider 类似，但用于控制器
   */
  async loadController(wrapper: InstanceWrapper, moduleRef: Module): Promise<void> {
    if (wrapper.isResolved) {
      return;
    }
    await this.resolveConstructorParams(wrapper, moduleRef);
  }

  /**
   * 解析构造函数参数并创建实例
   *
   * 这是 DI 的核心方法！
   *
   * 步骤：
   * 1. 通过反射获取构造函数参数类型
   * 2. 递归解析每个依赖
   * 3. 使用解析好的依赖创建实例
   *
   * 例如：
   * ```typescript
   * class CatsController {
   *   constructor(private catsService: CatsService) {}
   * }
   * ```
   *
   * 执行流程：
   * 1. 获取参数类型 -> [CatsService]
   * 2. 在模块中查找 CatsService 的 InstanceWrapper
   * 3. 如果 CatsService 还没实例化，递归解析它的依赖
   * 4. 获取 CatsService 实例
   * 5. new CatsController(catsServiceInstance)
   */
  private async resolveConstructorParams(
    wrapper: InstanceWrapper,
    moduleRef: Module,
  ): Promise<void> {
    const { metatype } = wrapper;

    // 如果没有类构造函数，直接标记为已解析
    if (!metatype) {
      wrapper.setResolved();
      return;
    }

    // 步骤 1: 获取构造函数参数类型
    // TypeScript 编译时会将类型信息存储在 'design:paramtypes' 元数据中
    const dependencies: Type<any>[] = this.reflectConstructorParams(metatype);

    console.log(`   解析 ${wrapper.name} 的依赖: [${dependencies.map(d => d?.name || 'undefined').join(', ')}]`);

    // 步骤 2: 解析每个依赖
    const instances = await Promise.all(
      dependencies.map((dependency, index) =>
        this.resolveSingleParam(dependency, moduleRef, wrapper, index)
      )
    );

    // 步骤 3: 创建实例
    wrapper.instance = this.instantiateClass(metatype, instances);
    wrapper.setResolved();
  }

  /**
   * 反射获取构造函数参数类型
   *
   * 关键点：
   * TypeScript 在编译时会生成 'design:paramtypes' 元数据
   * 前提是：
   * 1. 类上有装饰器（如 @Injectable(), @Controller()）
   * 2. tsconfig.json 启用了 emitDecoratorMetadata
   *
   * 例如：
   * @Injectable()
   * class CatsService {}
   *
   * @Controller()
   * class CatsController {
   *   constructor(private catsService: CatsService) {}
   * }
   *
   * Reflect.getMetadata('design:paramtypes', CatsController) 返回 [CatsService]
   */
  private reflectConstructorParams<T>(metatype: Type<T>): Type<any>[] {
    return Reflect.getMetadata(PARAMTYPES_METADATA, metatype) || [];
  }

  /**
   * 解析单个依赖
   *
   * @param dependency 依赖类型
   * @param moduleRef 当前模块
   * @param wrapper 请求依赖的包装器（用于错误信息）
   * @param index 参数索引（用于错误信息）
   */
  private async resolveSingleParam(
    dependency: Type<any>,
    moduleRef: Module,
    wrapper: InstanceWrapper,
    index: number,
  ): Promise<any> {
    // 检查依赖是否有效
    if (!dependency) {
      throw new Error(
        `无法解析 ${wrapper.name} 的第 ${index} 个参数的依赖。\n` +
        `可能原因：\n` +
        `1. 该类型未在模块的 providers 中注册\n` +
        `2. 存在循环依赖\n` +
        `3. 参数类型是接口（接口在运行时不存在）`
      );
    }

    // 首先在当前模块中查找
    let instanceWrapper = moduleRef.providers.get(dependency);

    // 如果当前模块没有，则在导入的模块中查找
    if (!instanceWrapper) {
      const found = await this.lookupComponentInImports(moduleRef, dependency);
      if (found) {
        instanceWrapper = found;
      }
    }

    // 如果还是找不到，抛出错误
    if (!instanceWrapper) {
      throw new Error(
        `无法解析依赖 ${dependency.name}。\n` +
        `请确保它在 ${moduleRef.metatype.name} 模块的 providers 中注册，\n` +
        `或者在导入的模块中导出。`
      );
    }

    // 递归加载依赖（如果还没有加载）
    if (!instanceWrapper.isResolved) {
      await this.loadProvider(instanceWrapper, instanceWrapper.host || moduleRef);
    }

    return instanceWrapper.instance;
  }

  /**
   * 在导入的模块中查找提供者
   *
   * 查找规则：
   * 1. 遍历当前模块的 imports
   * 2. 检查每个导入模块是否导出了该提供者
   * 3. 如果导出了，返回该提供者的 InstanceWrapper
   * 4. 如果没有，递归搜索导入模块的 imports
   *
   * 注意：只有被 exports 的提供者才能被其他模块使用
   */
  private async lookupComponentInImports(
    moduleRef: Module,
    token: InjectionToken,
  ): Promise<InstanceWrapper | null> {
    // 遍历当前模块导入的所有模块
    for (const relatedModule of moduleRef.imports) {
      // 检查是否导出了这个提供者
      if (!relatedModule.hasExport(token)) {
        // 没有导出，尝试在该模块的导入中继续查找
        const found = await this.lookupComponentInImports(relatedModule, token);
        if (found) {
          return found;
        }
        continue;
      }

      // 已导出，获取提供者
      const provider = relatedModule.providers.get(token);
      if (provider) {
        return provider;
      }
    }

    return null;
  }

  /**
   * 实例化类
   *
   * 使用解析好的依赖作为构造函数参数创建实例
   *
   * @param metatype 类的构造函数
   * @param dependencies 已解析的依赖实例数组
   */
  private instantiateClass<T>(metatype: Type<T>, dependencies: any[]): T {
    return new metatype(...dependencies);
  }
}
