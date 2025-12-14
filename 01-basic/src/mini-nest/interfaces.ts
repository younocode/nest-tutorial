/**
 * 类型定义文件
 *
 * 定义框架中使用的核心接口和类型
 * 在真实 NestJS 中，这些类型分散在 packages/common/interfaces/ 目录下
 */

// ==================== 基础类型 ====================

/**
 * 通用类类型，表示一个可以被 new 的类
 *
 * @example
 * function createInstance<T>(cls: Type<T>): T {
 *   return new cls();
 * }
 */
export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

/**
 * 注入令牌类型
 * 可以是类、字符串或 Symbol
 *
 * 类：最常用，直接使用类作为令牌
 * 字符串/Symbol：用于非类类型的注入，如配置对象
 */
export type InjectionToken = Type<any> | string | symbol;

// ==================== 作用域 ====================

/**
 * 提供者的作用域枚举
 *
 * 在真实 NestJS 中定义在 packages/common/interfaces/scope-options.interface.ts
 */
export enum Scope {
  /**
   * 默认作用域 - 单例模式
   * 整个应用生命周期内只有一个实例
   * 所有模块共享同一个实例
   */
  DEFAULT = 0,

  /**
   * 瞬态作用域
   * 每次注入都创建新的实例
   * 不会在消费者之间共享
   */
  TRANSIENT = 1,

  /**
   * 请求作用域
   * 每个 HTTP 请求创建一个实例
   * 同一请求内共享，不同请求之间隔离
   */
  REQUEST = 2,
}

/**
 * 作用域选项接口
 */
export interface ScopeOptions {
  scope?: Scope;
}

// ==================== 模块 ====================

/**
 * 模块元数据接口
 *
 * @Module() 装饰器接收此类型的参数
 */
export interface ModuleMetadata {
  /**
   * 导入的其他模块
   * 导入后可以使用这些模块导出的提供者
   */
  imports?: Type<any>[];

  /**
   * 当前模块的提供者（服务）
   * 由 Nest 注入器实例化，可以在模块内共享
   */
  providers?: Type<any>[];

  /**
   * 当前模块的控制器
   * 处理 HTTP 请求的类
   */
  controllers?: Type<any>[];

  /**
   * 导出的提供者
   * 其他模块导入本模块后，可以使用这些提供者
   */
  exports?: Type<any>[];
}

// ==================== 控制器 ====================

/**
 * 控制器选项
 */
export interface ControllerOptions {
  /**
   * 路由前缀路径
   */
  path?: string;

  /**
   * 控制器作用域
   */
  scope?: Scope;
}

// ==================== HTTP ====================

/**
 * HTTP 请求方法枚举
 */
export enum RequestMethod {
  GET = 'get',
  POST = 'post',
  PUT = 'put',
  DELETE = 'delete',
  PATCH = 'patch',
  OPTIONS = 'options',
  HEAD = 'head',
  ALL = 'all',
}

/**
 * 路由定义
 */
export interface RouteDefinition {
  /**
   * 路由路径
   */
  path: string;

  /**
   * HTTP 方法
   */
  method: RequestMethod;

  /**
   * 处理方法名称
   */
  methodName: string;
}

// ==================== 路由参数 ====================

/**
 * 路由参数类型枚举
 * 用于区分不同类型的参数装饰器
 */
export enum RouteParamtypes {
  REQUEST = 0,
  RESPONSE = 1,
  BODY = 3,
  QUERY = 4,
  PARAM = 5,
  HEADERS = 6,
}

/**
 * 路由参数元数据
 */
export interface RouteParamMetadata {
  /**
   * 参数在方法签名中的索引位置
   */
  index: number;

  /**
   * 额外数据，如 @Param('id') 中的 'id'
   */
  data?: string;

  /**
   * 参数类型
   */
  type: RouteParamtypes;
}

// ==================== 提供者 ====================

/**
 * 提供者定义
 * 简化版只支持类提供者
 * 真实 NestJS 还支持 useValue, useFactory, useExisting 等
 */
export type Provider = Type<any>;
