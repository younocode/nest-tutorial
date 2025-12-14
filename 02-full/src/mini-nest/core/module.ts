/**
 * Module 类 - 与基础版相同
 */
import { Type, InjectionToken } from '../interfaces';
import { InstanceWrapper } from './instance-wrapper';

export class Module {
  public readonly token: string;
  public readonly metatype: Type<any>;
  private readonly _providers = new Map<InjectionToken, InstanceWrapper>();
  private readonly _controllers = new Map<Type<any>, InstanceWrapper>();
  private readonly _imports = new Set<Module>();
  private readonly _exports = new Set<InjectionToken>();
  public distance: number = 0;

  constructor(metatype: Type<any>, token: string) {
    this.metatype = metatype;
    this.token = token;
  }

  get providers(): Map<InjectionToken, InstanceWrapper> { return this._providers; }
  addProvider(provider: Type<any>): void {
    const wrapper = new InstanceWrapper({ name: provider.name, token: provider, metatype: provider, host: this });
    this._providers.set(provider, wrapper);
  }
  getProviderByKey(token: InjectionToken): InstanceWrapper | undefined { return this._providers.get(token); }

  get controllers(): Map<Type<any>, InstanceWrapper> { return this._controllers; }
  addController(controller: Type<any>): void {
    const wrapper = new InstanceWrapper({ name: controller.name, token: controller, metatype: controller, host: this });
    this._controllers.set(controller, wrapper);
  }

  get imports(): Set<Module> { return this._imports; }
  addImport(moduleRef: Module): void { this._imports.add(moduleRef); }

  get exports(): Set<InjectionToken> { return this._exports; }
  addExport(token: InjectionToken): void { this._exports.add(token); }
  hasExport(token: InjectionToken): boolean { return this._exports.has(token); }
}
