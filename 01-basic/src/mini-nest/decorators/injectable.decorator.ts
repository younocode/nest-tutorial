/**
 * @Injectable 装饰器实现
 *
 * 核心原理：
 * 1. 使用 Reflect.defineMetadata 将元数据存储到类上
 * 2. 标记一个类为"可注入的"，使 DI 容器能够识别和管理它
 *
 * 参考真实 NestJS：packages/common/decorators/core/injectable.decorator.ts
 */
import 'reflect-metadata';
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from '../constants';
import { ScopeOptions } from '../interfaces';

/**
 * 将一个类标记为可注入的提供者
 *
 * 使用方法：
 * ```typescript
 * @Injectable()
 * class CatsService {
 *   findAll() { return []; }
 * }
 * ```
 *
 * 当 DI 容器扫描到这个类时，会检查 INJECTABLE_WATERMARK 元数据
 * 如果存在，则知道这个类可以被实例化并注入到其他类中
 *
 * @param options 可选的作用域配置
 * @returns 类装饰器
 */
export function Injectable(options?: ScopeOptions): ClassDecorator {
  return (target: object) => {
    // 设置水印，表示这是一个可注入的类
    // 扫描器在处理 providers 时会检查这个标记
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);

    // 存储作用域选项
    // 默认是 SINGLETON（单例），也可以设置为 TRANSIENT 或 REQUEST
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options || {}, target);

    // 装饰器本身不需要返回任何东西
    // 它的作用只是在类上添加元数据
  };
}
