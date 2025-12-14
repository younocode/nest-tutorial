/**
 * @UseGuards 装饰器
 *
 * 用于在控制器或方法上绑定守卫
 * 守卫在路由处理之前执行，用于权限验证
 *
 * 参考：packages/common/decorators/core/use-guards.decorator.ts
 */
import 'reflect-metadata';
import { GUARDS_METADATA } from '../constants';
import { CanActivate, Type } from '../interfaces';

/**
 * 绑定守卫到控制器或方法
 *
 * @example
 * // 控制器级别
 * @UseGuards(AuthGuard)
 * @Controller('cats')
 * class CatsController {}
 *
 * @example
 * // 方法级别
 * @UseGuards(RolesGuard)
 * @Get()
 * findAll() {}
 */
export function UseGuards(...guards: (Type<CanActivate> | CanActivate)[]): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      // 方法装饰器
      Reflect.defineMetadata(GUARDS_METADATA, guards, descriptor.value);
      return descriptor;
    }
    // 类装饰器
    Reflect.defineMetadata(GUARDS_METADATA, guards, target);
    return target;
  };
}
