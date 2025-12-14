/**
 * @Controller 装饰器 - 与基础版相同
 */
import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA, SCOPE_OPTIONS_METADATA } from '../constants';
import { ControllerOptions, Scope } from '../interfaces';

export function Controller(prefixOrOptions?: string | ControllerOptions): ClassDecorator {
  const defaultPath = '/';
  let path: string;
  let scopeOptions: { scope?: Scope };

  if (typeof prefixOrOptions === 'string') {
    path = prefixOrOptions;
    scopeOptions = {};
  } else if (prefixOrOptions) {
    path = prefixOrOptions.path || defaultPath;
    scopeOptions = { scope: prefixOrOptions.scope };
  } else {
    path = defaultPath;
    scopeOptions = {};
  }

  return (target: object) => {
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);
    Reflect.defineMetadata(PATH_METADATA, path, target);
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
  };
}
