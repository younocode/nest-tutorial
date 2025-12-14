/**
 * Injector - 与基础版相同
 */
import 'reflect-metadata';
import { Type, InjectionToken } from '../interfaces';
import { PARAMTYPES_METADATA } from '../constants';
import { Module } from './module';
import { InstanceWrapper } from './instance-wrapper';

export class Injector {
  async loadProvider(wrapper: InstanceWrapper, moduleRef: Module): Promise<void> {
    if (wrapper.isResolved) return;
    await this.resolveConstructorParams(wrapper, moduleRef);
  }

  async loadController(wrapper: InstanceWrapper, moduleRef: Module): Promise<void> {
    if (wrapper.isResolved) return;
    await this.resolveConstructorParams(wrapper, moduleRef);
  }

  private async resolveConstructorParams(wrapper: InstanceWrapper, moduleRef: Module): Promise<void> {
    const { metatype } = wrapper;
    if (!metatype) {
      wrapper.setResolved();
      return;
    }

    const dependencies: Type<any>[] = Reflect.getMetadata(PARAMTYPES_METADATA, metatype) || [];

    const instances = await Promise.all(
      dependencies.map((dependency, index) => this.resolveSingleParam(dependency, moduleRef, wrapper, index))
    );

    wrapper.instance = new metatype(...instances);
    wrapper.setResolved();
  }

  private async resolveSingleParam(
    dependency: Type<any>,
    moduleRef: Module,
    wrapper: InstanceWrapper,
    index: number,
  ): Promise<any> {
    if (!dependency) {
      throw new Error(`无法解析 ${wrapper.name} 的第 ${index} 个参数的依赖`);
    }

    let instanceWrapper = moduleRef.providers.get(dependency);
    if (!instanceWrapper) {
      const found = await this.lookupComponentInImports(moduleRef, dependency);
      if (found) {
        instanceWrapper = found;
      }
    }

    if (!instanceWrapper) {
      throw new Error(`无法解析依赖 ${dependency.name}`);
    }

    if (!instanceWrapper.isResolved) {
      await this.loadProvider(instanceWrapper, instanceWrapper.host || moduleRef);
    }

    return instanceWrapper.instance;
  }

  private async lookupComponentInImports(moduleRef: Module, token: InjectionToken): Promise<InstanceWrapper | null> {
    for (const relatedModule of moduleRef.imports) {
      if (!relatedModule.hasExport(token)) {
        const found = await this.lookupComponentInImports(relatedModule, token);
        if (found) return found;
        continue;
      }
      const provider = relatedModule.providers.get(token);
      if (provider) return provider;
    }
    return null;
  }
}
