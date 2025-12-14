/**
 * @UseFilters() 装饰器
 *
 * 用于绑定异常过滤器到控制器或方法
 */
import 'reflect-metadata';
import { EXCEPTION_FILTERS_METADATA } from '../constants';
import { ExceptionFilter, Type } from '../interfaces';

export function UseFilters(...filters: (Type<ExceptionFilter> | ExceptionFilter)[]): MethodDecorator & ClassDecorator {
  return (target: any, propertyKey?: string | symbol, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      // 方法装饰器
      Reflect.defineMetadata(EXCEPTION_FILTERS_METADATA, filters, descriptor.value);
      return descriptor;
    }
    // 类装饰器
    Reflect.defineMetadata(EXCEPTION_FILTERS_METADATA, filters, target);
    return target;
  };
}
