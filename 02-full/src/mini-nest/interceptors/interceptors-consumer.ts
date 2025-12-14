/**
 * InterceptorsConsumer - 拦截器消费者
 *
 * 负责执行拦截器链
 * 拦截器可以在请求处理前后执行逻辑
 *
 * 参考：packages/core/interceptors/interceptors-consumer.ts
 */
import { ExecutionContext, NestInterceptor, CallHandler } from '../interfaces';

/**
 * 拦截器消费者
 *
 * 拦截器的执行模式类似洋葱模型：
 * 请求 -> interceptor1 前 -> interceptor2 前 -> 处理器 -> interceptor2 后 -> interceptor1 后 -> 响应
 *
 * 每个拦截器可以：
 * 1. 在 next.handle() 之前执行前置逻辑
 * 2. 在 next.handle() 之后处理响应
 * 3. 完全替换响应
 * 4. 完全跳过处理器
 */
export class InterceptorsConsumer {
  /**
   * 拦截请求
   *
   * @param interceptors 拦截器实例数组
   * @param context 执行上下文
   * @param next 最终的处理器函数
   * @returns 处理后的响应
   */
  async intercept(
    interceptors: NestInterceptor[],
    context: ExecutionContext,
    next: () => Promise<any>,
  ): Promise<any> {
    // 如果没有拦截器，直接调用处理器
    if (!interceptors || interceptors.length === 0) {
      return next();
    }

    // 构建拦截器链
    // 从最后一个拦截器开始，向前包装
    // 每个拦截器的 next.handle() 调用下一个拦截器或最终处理器
    const pipeline = interceptors.reduceRight<() => Promise<any>>(
      (nextFn, interceptor) => {
        return async () => {
          console.log(`[拦截器] ${interceptor.constructor.name}.intercept() - 进入`);

          // 创建 CallHandler
          const callHandler: CallHandler = {
            handle: async () => {
              const result = await nextFn();
              return result;
            },
          };

          // 调用拦截器的 intercept 方法
          const result = await interceptor.intercept(context, callHandler);

          console.log(`[拦截器] ${interceptor.constructor.name}.intercept() - 退出`);
          return result;
        };
      },
      next,
    );

    return pipeline();
  }
}
