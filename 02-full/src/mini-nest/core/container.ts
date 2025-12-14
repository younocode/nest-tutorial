/**
 * NestContainer - 与基础版相同
 */
import { Type } from '../interfaces';
import { Module } from './module';

export class ModulesContainer extends Map<string, Module> {}

export class NestContainer {
  private readonly modules = new ModulesContainer();
  private readonly globalModules = new Set<Module>();

  async addModule(metatype: Type<any>, scope: Type<any>[]): Promise<{ moduleRef: Module; inserted: boolean }> {
    const token = metatype.name;
    if (this.modules.has(token)) {
      return { moduleRef: this.modules.get(token)!, inserted: false };
    }
    const moduleRef = new Module(metatype, token);
    moduleRef.distance = scope.length;
    this.modules.set(token, moduleRef);
    return { moduleRef, inserted: true };
  }

  getModules(): ModulesContainer { return this.modules; }
  getModuleByKey(moduleKey: string): Module | undefined { return this.modules.get(moduleKey); }

  addProvider(provider: Type<any>, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) throw new Error(`未知模块: ${token}`);
    moduleRef.addProvider(provider);
  }

  addController(controller: Type<any>, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) throw new Error(`未知模块: ${token}`);
    moduleRef.addController(controller);
  }

  async addImport(relatedModule: Type<any>, token: string): Promise<void> {
    const moduleRef = this.modules.get(token);
    const relatedModuleRef = this.modules.get(relatedModule.name);
    if (moduleRef && relatedModuleRef) moduleRef.addImport(relatedModuleRef);
  }

  addExport(token: string, exportToken: any): void {
    const moduleRef = this.modules.get(token);
    if (moduleRef) moduleRef.addExport(exportToken);
  }

  addGlobalModule(module: Module): void { this.globalModules.add(module); }

  bindGlobalScope(): void {
    this.modules.forEach(moduleRef => {
      this.globalModules.forEach(globalModule => {
        if (moduleRef !== globalModule) moduleRef.addImport(globalModule);
      });
    });
  }

  clear(): void {
    this.modules.clear();
    this.globalModules.clear();
  }
}
