/**
 * @Module 装饰器 - 与基础版相同
 */
import 'reflect-metadata';
import { MODULE_METADATA } from '../constants';
import { ModuleMetadata } from '../interfaces';

function validateModuleKeys(keys: string[]): void {
  const validKeys = Object.values(MODULE_METADATA);
  keys.forEach(key => {
    if (!validKeys.includes(key)) {
      throw new Error(`@Module() 装饰器中发现无效属性 '${key}'`);
    }
  });
}

export function Module(metadata: ModuleMetadata): ClassDecorator {
  const propsKeys = Object.keys(metadata);
  validateModuleKeys(propsKeys);

  return (target: Function) => {
    for (const property in metadata) {
      if (Object.hasOwnProperty.call(metadata, property)) {
        Reflect.defineMetadata(property, (metadata as any)[property], target);
      }
    }
  };
}
