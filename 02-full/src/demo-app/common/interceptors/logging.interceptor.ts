/**
 * LoggingInterceptor - 日志拦截器示例
 *
 * 演示拦截器的前置/后置处理能力
 * 记录请求处理时间
 */
import { NestInterceptor, ExecutionContext, CallHandler } from '../../../mini-nest';

export class LoggingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.getRequest();
    const method = request.method;
    const url = request.url;

    console.log(`  [LoggingInterceptor] → 请求开始: ${method} ${url}`);
    const startTime = Date.now();

    // 执行后续处理（控制器方法）
    const result = await next.handle();

    const duration = Date.now() - startTime;
    console.log(`  [LoggingInterceptor] ← 请求结束: ${method} ${url} [${duration}ms]`);

    return result;
  }
}

/**
 * TransformInterceptor - 响应转换拦截器
 *
 * 统一包装响应格式
 */
export class TransformInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    console.log(`  [TransformInterceptor] 前置处理...`);

    const result = await next.handle();

    console.log(`  [TransformInterceptor] 后置处理: 包装响应数据`);

    // 统一响应格式
    return {
      success: true,
      data: result,
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * CacheInterceptor - 缓存拦截器示例
 *
 * 演示如何实现简单的内存缓存
 */
export class CacheInterceptor implements NestInterceptor {
  private cache = new Map<string, { data: any; expiry: number }>();
  private readonly ttl: number;

  constructor(ttlSeconds: number = 60) {
    this.ttl = ttlSeconds * 1000;
  }

  async intercept(context: ExecutionContext, next: CallHandler): Promise<any> {
    const request = context.getRequest();
    const cacheKey = `${request.method}:${request.url}`;

    // 检查缓存
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiry > Date.now()) {
      console.log(`  [CacheInterceptor] ✓ 缓存命中: ${cacheKey}`);
      return cached.data;
    }

    console.log(`  [CacheInterceptor] ✗ 缓存未命中: ${cacheKey}`);

    // 执行请求并缓存结果
    const result = await next.handle();

    this.cache.set(cacheKey, {
      data: result,
      expiry: Date.now() + this.ttl,
    });

    console.log(`  [CacheInterceptor] 已缓存结果，TTL: ${this.ttl / 1000}秒`);
    return result;
  }
}
