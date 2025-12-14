/**
 * @UseInterceptors 装饰器
 *
 * 用于在控制器或方法上绑定拦截器
 * 拦截器可以在请求前后执行逻辑
 *
 * 参考：packages/common/decorators/core/use-interceptors.decorator.ts
 */
import 'reflect-metadata';
import { INTERCEPTORS_METADATA } from '../constants';
import { NestInterceptor, Type } from '../interfaces';

/**
 * 绑定拦截器到控制器或方法
 *
 * @example
 * @UseInterceptors(LoggingInterceptor)
 * @Controller('cats')
 * class CatsController {}
 */
export function UseInterceptors(...interceptors: (Type<NestInterceptor> | NestInterceptor)[]): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(INTERCEPTORS_METADATA, interceptors, target);
    return target;
  };
}
