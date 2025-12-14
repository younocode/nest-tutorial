/**
 * @UsePipes 装饰器
 *
 * 用于在控制器或方法上绑定管道
 * 管道用于数据验证和转换
 *
 * 参考：packages/common/decorators/core/use-pipes.decorator.ts
 */
import 'reflect-metadata';
import { PIPES_METADATA } from '../constants';
import { PipeTransform, Type } from '../interfaces';

/**
 * 绑定管道到控制器或方法
 *
 * @example
 * @UsePipes(ValidationPipe)
 * @Post()
 * create(@Body() dto: CreateCatDto) {}
 */
export function UsePipes(...pipes: (Type<PipeTransform> | PipeTransform)[]): MethodDecorator & ClassDecorator {
  return (
    target: any,
    key?: string | symbol,
    descriptor?: TypedPropertyDescriptor<any>,
  ) => {
    if (descriptor) {
      Reflect.defineMetadata(PIPES_METADATA, pipes, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(PIPES_METADATA, pipes, target);
    return target;
  };
}
