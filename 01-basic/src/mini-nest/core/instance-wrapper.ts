/**
 * InstanceWrapper - 实例包装器
 *
 * 核心原理：
 * 1. 包装每个提供者/控制器的元信息和实例
 * 2. 管理实例的生命周期和作用域
 * 3. 支持延迟实例化（懒加载）
 *
 * 参考真实 NestJS：packages/core/injector/instance-wrapper.ts
 */
import { Type, Scope, InjectionToken } from '../interfaces';
import { PARAMTYPES_METADATA } from '../constants';

/**
 * 实例包装器类
 *
 * 每个提供者（Service）和控制器（Controller）都会被包装成一个 InstanceWrapper
 * 它存储了创建和管理实例所需的所有信息
 *
 * 为什么需要包装器？
 * 1. 延迟实例化：不是立即创建实例，而是在需要时才创建
 * 2. 缓存实例：单例模式下，同一个实例可以被多次注入
 * 3. 存储元信息：如作用域、依赖关系等
 */
export class InstanceWrapper<T = any> {
  /**
   * 提供者名称（通常是类名）
   * 用于日志和调试
   */
  public readonly name: string;

  /**
   * 注入令牌
   * 用于在容器中查找这个提供者
   * 通常就是类本身，也可以是字符串或 Symbol
   */
  public readonly token: InjectionToken;

  /**
   * 类的构造函数（元类型）
   * 用于创建实例：new metatype(...deps)
   */
  public metatype: Type<T> | null;

  /**
   * 实例的作用域
   * DEFAULT: 单例，整个应用共享一个实例
   * TRANSIENT: 每次注入都创建新实例
   * REQUEST: 每个请求创建一个实例
   */
  public scope: Scope = Scope.DEFAULT;

  /**
   * 所属模块的引用
   * 用于在依赖解析时确定搜索范围
   */
  public host?: any;

  /**
   * 缓存的实例
   * 单例模式下，实例创建后会缓存在这里
   */
  private _instance: T | null = null;

  /**
   * 是否已解析（已创建实例）
   */
  private _isResolved: boolean = false;

  constructor(metadata: {
    name: string;
    token: InjectionToken;
    metatype: Type<T> | null;
    scope?: Scope;
    instance?: T;
    host?: any;
  }) {
    this.name = metadata.name;
    this.token = metadata.token;
    this.metatype = metadata.metatype;
    this.scope = metadata.scope || Scope.DEFAULT;
    this.host = metadata.host;

    // 如果初始化时提供了实例，直接标记为已解析
    if (metadata.instance) {
      this._instance = metadata.instance;
      this._isResolved = true;
    }
  }

  /**
   * 获取实例
   */
  get instance(): T | null {
    return this._instance;
  }

  /**
   * 设置实例
   * 设置后自动标记为已解析
   */
  set instance(value: T | null) {
    this._instance = value;
    if (value !== null) {
      this._isResolved = true;
    }
  }

  /**
   * 检查是否已解析（已创建实例）
   */
  get isResolved(): boolean {
    return this._isResolved;
  }

  /**
   * 标记为已解析
   */
  setResolved(): void {
    this._isResolved = true;
  }

  /**
   * 检查是否为单例作用域
   */
  get isSingleton(): boolean {
    return this.scope === Scope.DEFAULT;
  }

  /**
   * 检查是否为瞬态作用域
   */
  get isTransient(): boolean {
    return this.scope === Scope.TRANSIENT;
  }

  /**
   * 获取构造函数参数的类型（即依赖列表）
   *
   * 这是依赖注入的关键！
   * TypeScript 编译器会将参数类型存储在 'design:paramtypes' 元数据中
   * 前提是启用了 emitDecoratorMetadata 选项
   *
   * 例如：
   * class CatsController {
   *   constructor(private catsService: CatsService) {}
   * }
   *
   * 调用此方法返回 [CatsService]
   */
  getConstructorDependencies(): Type<any>[] {
    if (!this.metatype) {
      return [];
    }
    return Reflect.getMetadata(PARAMTYPES_METADATA, this.metatype) || [];
  }
}
