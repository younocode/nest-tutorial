/**
 * @Injectable 装饰器 - 与基础版相同
 */
import 'reflect-metadata';
import { INJECTABLE_WATERMARK, SCOPE_OPTIONS_METADATA } from '../constants';
import { ScopeOptions } from '../interfaces';

export function Injectable(options?: ScopeOptions): ClassDecorator {
  return (target: object) => {
    Reflect.defineMetadata(INJECTABLE_WATERMARK, true, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, options || {}, target);
  };
}
