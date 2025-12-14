/**
 * 类型定义 - 完整版
 *
 * 在基础版的基础上，添加守卫、管道、拦截器、异常过滤器相关的接口
 */

// ==================== 基础类型（与基础版相同） ====================

export interface Type<T = any> extends Function {
  new (...args: any[]): T;
}

export type InjectionToken = Type<any> | string | symbol;

export enum Scope {
  DEFAULT = 0,
  TRANSIENT = 1,
  REQUEST = 2,
}

export interface ScopeOptions {
  scope?: Scope;
}

export interface ModuleMetadata {
  imports?: Type<any>[];
  providers?: Type<any>[];
  controllers?: Type<any>[];
  exports?: Type<any>[];
}

export interface ControllerOptions {
  path?: string;
  scope?: Scope;
}

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

export interface RouteDefinition {
  path: string;
  method: RequestMethod;
  methodName: string;
}

export enum RouteParamtypes {
  REQUEST = 0,
  RESPONSE = 1,
  BODY = 3,
  QUERY = 4,
  PARAM = 5,
  HEADERS = 6,
}

export interface RouteParamMetadata {
  index: number;
  data?: string;
  type: RouteParamtypes;
}

export type Provider = Type<any>;

// ==================== 完整版新增接口 ====================

/**
 * 执行上下文
 *
 * 提供请求处理过程中的上下文信息
 * 守卫、拦截器等都会接收这个上下文
 */
export interface ExecutionContext {
  /**
   * 获取请求对象
   */
  getRequest<T = any>(): T;

  /**
   * 获取响应对象
   */
  getResponse<T = any>(): T;

  /**
   * 获取处理器类
   */
  getClass<T = any>(): Type<T>;

  /**
   * 获取处理器方法
   */
  getHandler(): Function;
}

/**
 * 守卫接口
 *
 * 守卫用于决定请求是否应该被处理
 * 常用于权限验证、角色检查等
 *
 * 参考：packages/common/interfaces/features/can-activate.interface.ts
 */
export interface CanActivate {
  /**
   * 判断请求是否可以继续
   *
   * @param context 执行上下文
   * @returns true 允许继续，false 拒绝（抛出 ForbiddenException）
   */
  canActivate(context: ExecutionContext): boolean | Promise<boolean>;
}

/**
 * 管道接口
 *
 * 管道用于数据转换和验证
 * 常用于参数验证、类型转换等
 *
 * 参考：packages/common/interfaces/features/pipe-transform.interface.ts
 */
export interface PipeTransform<T = any, R = any> {
  /**
   * 转换输入值
   *
   * @param value 输入值
   * @param metadata 参数元数据
   * @returns 转换后的值
   */
  transform(value: T, metadata: ArgumentMetadata): R | Promise<R>;
}

/**
 * 参数元数据
 */
export interface ArgumentMetadata {
  /**
   * 参数类型：'body' | 'query' | 'param' | 'custom'
   */
  type: 'body' | 'query' | 'param' | 'custom';

  /**
   * 参数的元类型（如 String, Number）
   */
  metatype?: Type<any>;

  /**
   * 参数名称（如 @Param('id') 中的 'id'）
   */
  data?: string;
}

/**
 * 调用处理器接口
 *
 * 用于拦截器中调用下一个处理器
 */
export interface CallHandler<T = any> {
  /**
   * 调用路由处理器
   * 返回 Observable 以支持 RxJS 操作
   */
  handle(): Promise<T>;
}

/**
 * 拦截器接口
 *
 * 拦截器可以在请求处理前后执行逻辑
 * 常用于日志、缓存、响应转换等
 *
 * 参考：packages/common/interfaces/features/nest-interceptor.interface.ts
 */
export interface NestInterceptor<T = any, R = any> {
  /**
   * 拦截方法
   *
   * @param context 执行上下文
   * @param next 调用处理器，用于调用下一个拦截器或路由处理器
   * @returns 处理后的响应
   */
  intercept(context: ExecutionContext, next: CallHandler<T>): Promise<R>;
}

/**
 * 参数主机接口
 *
 * 提供访问请求/响应对象的方法
 */
export interface ArgumentsHost {
  /**
   * 获取参数数组 [request, response, next]
   */
  getArgs<T extends any[] = any[]>(): T;

  /**
   * 获取指定索引的参数
   */
  getArgByIndex<T = any>(index: number): T;

  /**
   * 切换到 HTTP 上下文
   */
  switchToHttp(): HttpArgumentsHost;
}

/**
 * HTTP 参数主机
 */
export interface HttpArgumentsHost {
  getRequest<T = any>(): T;
  getResponse<T = any>(): T;
  getNext<T = any>(): T;
}

/**
 * 异常过滤器接口
 *
 * 用于捕获和处理异常
 *
 * 参考：packages/common/interfaces/exceptions/exception-filter.interface.ts
 */
export interface ExceptionFilter<T = any> {
  /**
   * 捕获异常
   *
   * @param exception 捕获的异常
   * @param host 参数主机
   */
  catch(exception: T, host: ArgumentsHost): void;
}
