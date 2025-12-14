/**
 * @Catch 装饰器
 *
 * 用于标记异常过滤器处理哪些类型的异常
 *
 * 参考：packages/common/decorators/core/catch.decorator.ts
 */
import 'reflect-metadata';
import { FILTER_CATCH_EXCEPTIONS } from '../constants';
import { Type } from '../interfaces';

/**
 * 标记异常过滤器捕获的异常类型
 *
 * @example
 * @Catch(HttpException)
 * class HttpExceptionFilter implements ExceptionFilter {
 *   catch(exception: HttpException, host: ArgumentsHost) {}
 * }
 *
 * @example
 * // 捕获所有异常
 * @Catch()
 * class AllExceptionsFilter implements ExceptionFilter {
 *   catch(exception: unknown, host: ArgumentsHost) {}
 * }
 */
export function Catch(...exceptions: Type<any>[]): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(FILTER_CATCH_EXCEPTIONS, exceptions, target);
  };
}
