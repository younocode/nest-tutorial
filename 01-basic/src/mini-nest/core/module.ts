/**
 * Module 类 - 模块实例
 *
 * 核心原理：
 * 1. 存储模块的所有提供者、控制器、导入和导出
 * 2. 管理模块内的依赖关系
 * 3. 作为依赖解析时的搜索范围
 *
 * 参考真实 NestJS：packages/core/injector/module.ts
 */
import { Type, InjectionToken } from '../interfaces';
import { InstanceWrapper } from './instance-wrapper';

/**
 * 模块类
 *
 * 每个 @Module() 装饰的类都会对应一个 Module 实例
 * 它是组织代码的基本单位，包含：
 * - providers: 本模块的服务
 * - controllers: 本模块的控制器
 * - imports: 导入的其他模块
 * - exports: 导出的提供者
 */
export class Module {
  /**
   * 模块的唯一标识（通常是类名）
   */
  public readonly token: string;

  /**
   * 模块类本身
   */
  public readonly metatype: Type<any>;

  /**
   * 提供者映射表
   * key: 注入令牌（通常是类）
   * value: InstanceWrapper（包含实例和元信息）
   */
  private readonly _providers = new Map<InjectionToken, InstanceWrapper>();

  /**
   * 控制器映射表
   */
  private readonly _controllers = new Map<Type<any>, InstanceWrapper>();

  /**
   * 导入的模块集合
   * 导入模块后，可以使用其导出的 providers
   */
  private readonly _imports = new Set<Module>();

  /**
   * 导出的提供者令牌集合
   * 其他模块导入本模块后，只能使用导出的 providers
   */
  private readonly _exports = new Set<InjectionToken>();

  /**
   * 模块在依赖树中的距离
   * 根模块距离为 0，每导入一层 +1
   * 用于确定初始化顺序（距离小的先初始化）
   */
  public distance: number = 0;

  constructor(metatype: Type<any>, token: string) {
    this.metatype = metatype;
    this.token = token;
  }

  // ==================== Providers ====================

  /**
   * 获取所有提供者
   */
  get providers(): Map<InjectionToken, InstanceWrapper> {
    return this._providers;
  }

  /**
   * 添加提供者
   *
   * 创建 InstanceWrapper 并存储到 _providers 映射表
   * 此时还不会创建实例，只是注册
   */
  addProvider(provider: Type<any>): void {
    const wrapper = new InstanceWrapper({
      name: provider.name,
      token: provider,
      metatype: provider,
      host: this,
    });
    this._providers.set(provider, wrapper);
  }

  /**
   * 根据令牌获取提供者
   */
  getProviderByKey(token: InjectionToken): InstanceWrapper | undefined {
    return this._providers.get(token);
  }

  // ==================== Controllers ====================

  /**
   * 获取所有控制器
   */
  get controllers(): Map<Type<any>, InstanceWrapper> {
    return this._controllers;
  }

  /**
   * 添加控制器
   */
  addController(controller: Type<any>): void {
    const wrapper = new InstanceWrapper({
      name: controller.name,
      token: controller,
      metatype: controller,
      host: this,
    });
    this._controllers.set(controller, wrapper);
  }

  // ==================== Imports ====================

  /**
   * 获取导入的模块
   */
  get imports(): Set<Module> {
    return this._imports;
  }

  /**
   * 添加导入的模块
   *
   * 导入模块后，本模块可以使用被导入模块导出的 providers
   */
  addImport(moduleRef: Module): void {
    this._imports.add(moduleRef);
  }

  // ==================== Exports ====================

  /**
   * 获取导出的令牌
   */
  get exports(): Set<InjectionToken> {
    return this._exports;
  }

  /**
   * 添加导出
   *
   * 只有导出的 providers 才能被其他模块使用
   */
  addExport(token: InjectionToken): void {
    this._exports.add(token);
  }

  /**
   * 检查是否导出了某个提供者
   *
   * 在依赖解析时，会检查导入模块是否导出了所需的提供者
   */
  hasExport(token: InjectionToken): boolean {
    return this._exports.has(token);
  }
}
