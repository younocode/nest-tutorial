/**
 * InstanceWrapper - 与基础版相同
 */
import { Type, Scope, InjectionToken } from '../interfaces';
import { PARAMTYPES_METADATA } from '../constants';

export class InstanceWrapper<T = any> {
  public readonly name: string;
  public readonly token: InjectionToken;
  public metatype: Type<T> | null;
  public scope: Scope = Scope.DEFAULT;
  public host?: any;
  private _instance: T | null = null;
  private _isResolved: boolean = false;

  constructor(metadata: {
    name: string;
    token: InjectionToken;
    metatype: Type<T> | null;
    scope?: Scope;
    instance?: T;
    host?: any;
  }) {
    this.name = metadata.name;
    this.token = metadata.token;
    this.metatype = metadata.metatype;
    this.scope = metadata.scope || Scope.DEFAULT;
    this.host = metadata.host;
    if (metadata.instance) {
      this._instance = metadata.instance;
      this._isResolved = true;
    }
  }

  get instance(): T | null { return this._instance; }
  set instance(value: T | null) {
    this._instance = value;
    if (value !== null) this._isResolved = true;
  }

  get isResolved(): boolean { return this._isResolved; }
  setResolved(): void { this._isResolved = true; }
  get isSingleton(): boolean { return this.scope === Scope.DEFAULT; }
  get isTransient(): boolean { return this.scope === Scope.TRANSIENT; }

  getConstructorDependencies(): Type<any>[] {
    if (!this.metatype) return [];
    return Reflect.getMetadata(PARAMTYPES_METADATA, this.metatype) || [];
  }
}
