/**
 * RouterExecutionContext - 路由执行上下文
 *
 * 负责协调请求处理管道：守卫 -> 管道 -> 拦截器 -> 处理器 -> 异常过滤器
 *
 * 参考：packages/core/router/router-execution-context.ts
 */
import * as http from 'http';
import { ExecutionContext, CanActivate, PipeTransform, NestInterceptor, ExceptionFilter, Type, RouteParamtypes, ArgumentMetadata } from '../interfaces';
import { GUARDS_METADATA, PIPES_METADATA, INTERCEPTORS_METADATA, ROUTE_ARGS_METADATA, EXCEPTION_FILTERS_METADATA } from '../constants';
import { GuardsConsumer } from '../guards/guards-consumer';
import { PipesConsumer } from '../pipes/pipes-consumer';
import { InterceptorsConsumer } from '../interceptors/interceptors-consumer';
import { ExceptionsHandler, createArgumentsHost } from '../exceptions/exceptions-handler';

/**
 * 创建执行上下文
 */
function createExecutionContext(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  controllerClass: Type<any>,
  handler: Function,
): ExecutionContext {
  return {
    getRequest: <T = any>() => req as T,
    getResponse: <T = any>() => res as T,
    getClass: <T = any>() => controllerClass as Type<T>,
    getHandler: () => handler,
  };
}

/**
 * 路由执行上下文类
 *
 * 负责：
 * 1. 收集控制器和方法上的守卫、管道、拦截器、过滤器
 * 2. 按正确顺序执行请求处理管道
 */
export class RouterExecutionContext {
  private guardsConsumer = new GuardsConsumer();
  private pipesConsumer = new PipesConsumer();
  private interceptorsConsumer = new InterceptorsConsumer();
  private exceptionsHandler = new ExceptionsHandler();

  /**
   * 创建请求处理函数
   *
   * 这个函数包含完整的请求处理管道：
   * 1. 守卫 - 权限验证
   * 2. 管道 - 参数验证和转换
   * 3. 拦截器 - 前置/后置处理
   * 4. 处理器 - 控制器方法
   * 5. 异常过滤器 - 错误处理
   */
  create(
    instance: any,
    handler: Function,
    methodName: string,
    controllerClass: Type<any>,
    resolveParams: (req: http.IncomingMessage, res: http.ServerResponse, body: any) => any[],
    parseBody: (req: http.IncomingMessage) => Promise<any>,
  ) {
    // 收集守卫（控制器级别 + 方法级别）
    const guards = this.reflectGuards(controllerClass, handler);

    // 收集管道
    const pipes = this.reflectPipes(controllerClass, handler);

    // 收集拦截器
    const interceptors = this.reflectInterceptors(controllerClass, handler);

    // 收集异常过滤器
    const filters = this.reflectFilters(controllerClass, handler);
    this.exceptionsHandler.setCustomFilters(filters);

    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
      // 创建执行上下文
      const context = createExecutionContext(req, res, controllerClass, handler);

      try {
        // 步骤 1: 执行守卫
        console.log('\n[执行上下文] 1. 执行守卫');
        await this.guardsConsumer.tryActivate(guards, context);

        // 步骤 2: 解析请求体
        const body = await parseBody(req);

        // 步骤 3: 解析参数
        let args = resolveParams(req, res, body);

        // 步骤 4: 执行管道（验证和转换参数）
        console.log('[执行上下文] 2. 执行管道');
        args = await this.applyPipesToArgs(args, pipes, methodName, controllerClass);

        // 步骤 5: 执行拦截器和处理器
        console.log('[执行上下文] 3. 执行拦截器');
        const result = await this.interceptorsConsumer.intercept(
          interceptors,
          context,
          async () => {
            console.log('[执行上下文] 4. 执行控制器方法');
            return handler.apply(instance, args);
          },
        );

        // 步骤 6: 发送响应
        if (!res.writableEnded) {
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(result));
        }
      } catch (error) {
        // 步骤 7: 异常处理
        console.log('[执行上下文] 5. 异常处理');
        const host = createArgumentsHost(req, res);
        this.exceptionsHandler.handle(error, host);
      }
    };
  }

  /**
   * 对参数应用管道
   */
  private async applyPipesToArgs(
    args: any[],
    pipes: PipeTransform[],
    methodName: string,
    controllerClass: Type<any>,
  ): Promise<any[]> {
    if (pipes.length === 0) return args;

    // 获取参数元数据
    const argsMetadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, controllerClass, methodName) || {};

    const transformedArgs = [...args];

    for (const key of Object.keys(argsMetadata)) {
      const { index, data, type } = argsMetadata[key];
      const metadata: ArgumentMetadata = {
        type: this.paramTypeToString(type),
        data,
      };

      transformedArgs[index] = await this.pipesConsumer.applyPipes(
        args[index],
        metadata,
        pipes,
      );
    }

    return transformedArgs;
  }

  private paramTypeToString(type: RouteParamtypes): 'body' | 'query' | 'param' | 'custom' {
    switch (type) {
      case RouteParamtypes.BODY: return 'body';
      case RouteParamtypes.QUERY: return 'query';
      case RouteParamtypes.PARAM: return 'param';
      default: return 'custom';
    }
  }

  /**
   * 反射获取守卫
   */
  private reflectGuards(controllerClass: Type<any>, handler: Function): CanActivate[] {
    const controllerGuards = Reflect.getMetadata(GUARDS_METADATA, controllerClass) || [];
    const methodGuards = Reflect.getMetadata(GUARDS_METADATA, handler) || [];
    return [...this.instantiate<CanActivate>(controllerGuards), ...this.instantiate<CanActivate>(methodGuards)];
  }

  /**
   * 反射获取管道
   */
  private reflectPipes(controllerClass: Type<any>, handler: Function): PipeTransform[] {
    const controllerPipes = Reflect.getMetadata(PIPES_METADATA, controllerClass) || [];
    const methodPipes = Reflect.getMetadata(PIPES_METADATA, handler) || [];
    return [...this.instantiate<PipeTransform>(controllerPipes), ...this.instantiate<PipeTransform>(methodPipes)];
  }

  /**
   * 反射获取拦截器
   */
  private reflectInterceptors(controllerClass: Type<any>, handler: Function): NestInterceptor[] {
    const controllerInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, controllerClass) || [];
    const methodInterceptors = Reflect.getMetadata(INTERCEPTORS_METADATA, handler) || [];
    return [...this.instantiate<NestInterceptor>(controllerInterceptors), ...this.instantiate<NestInterceptor>(methodInterceptors)];
  }

  /**
   * 反射获取异常过滤器
   */
  private reflectFilters(controllerClass: Type<any>, handler: Function): ExceptionFilter[] {
    const controllerFilters = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, controllerClass) || [];
    const methodFilters = Reflect.getMetadata(EXCEPTION_FILTERS_METADATA, handler) || [];
    return [...this.instantiate<ExceptionFilter>(controllerFilters), ...this.instantiate<ExceptionFilter>(methodFilters)];
  }

  /**
   * 实例化类或返回已有实例
   */
  private instantiate<T>(items: (Type<T> | T)[]): T[] {
    return items.map(item => {
      if (typeof item === 'function') {
        return new (item as Type<T>)();
      }
      return item;
    });
  }
}
