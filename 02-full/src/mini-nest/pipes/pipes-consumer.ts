/**
 * PipesConsumer - 管道消费者
 *
 * 负责执行管道链
 * 管道按顺序执行，前一个的输出是后一个的输入
 *
 * 参考：packages/core/pipes/pipes-consumer.ts
 */
import { PipeTransform, ArgumentMetadata } from '../interfaces';

/**
 * 管道消费者
 *
 * 职责：
 * 1. 按顺序应用管道
 * 2. 传递转换后的值给下一个管道
 * 3. 返回最终转换的值
 */
export class PipesConsumer {
  /**
   * 应用管道链
   *
   * @param value 原始值
   * @param metadata 参数元数据
   * @param pipes 管道实例数组
   * @returns 转换后的值
   *
   * @example
   * // 原始值经过多个管道转换
   * // value -> pipe1.transform -> pipe2.transform -> result
   */
  async applyPipes<T = any>(
    value: T,
    metadata: ArgumentMetadata,
    pipes: PipeTransform[],
  ): Promise<any> {
    // 如果没有管道，直接返回原值
    if (!pipes || pipes.length === 0) {
      return value;
    }

    // 使用 reduce 链式应用管道
    // 前一个管道的输出是后一个管道的输入
    let transformedValue = value;

    for (const pipe of pipes) {
      console.log(`[管道] 执行 ${pipe.constructor.name}.transform()`);
      transformedValue = await pipe.transform(transformedValue, metadata);
    }

    return transformedValue;
  }
}
