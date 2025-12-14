/**
 * GuardsConsumer - 守卫消费者
 *
 * 负责执行守卫链
 * 所有守卫都返回 true 才能继续处理请求
 *
 * 参考：packages/core/guards/guards-consumer.ts
 */
import { ExecutionContext, CanActivate, Type } from '../interfaces';
import { ForbiddenException } from '../exceptions/http-exception';

/**
 * 守卫消费者
 *
 * 职责：
 * 1. 按顺序执行所有守卫
 * 2. 如果任何守卫返回 false，抛出 ForbiddenException
 * 3. 所有守卫都通过才允许继续
 */
export class GuardsConsumer {
  /**
   * 尝试激活守卫
   *
   * @param guards 守卫实例数组
   * @param context 执行上下文
   * @returns 是否所有守卫都通过
   */
  async tryActivate(
    guards: CanActivate[],
    context: ExecutionContext,
  ): Promise<boolean> {
    // 如果没有守卫，直接通过
    if (!guards || guards.length === 0) {
      return true;
    }

    // 顺序执行每个守卫
    for (const guard of guards) {
      const result = await this.pickResult(guard.canActivate(context));

      if (!result) {
        console.log(`[守卫] ${guard.constructor.name} 拒绝访问`);
        throw new ForbiddenException('Forbidden resource');
      }

      console.log(`[守卫] ${guard.constructor.name} 通过`);
    }

    return true;
  }

  /**
   * 处理守卫返回值
   * 支持同步和异步返回
   */
  private async pickResult(result: boolean | Promise<boolean>): Promise<boolean> {
    return result;
  }
}
