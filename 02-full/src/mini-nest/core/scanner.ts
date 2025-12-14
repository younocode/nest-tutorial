/**
 * DependenciesScanner - 与基础版相同
 */
import 'reflect-metadata';
import { Type } from '../interfaces';
import { MODULE_METADATA } from '../constants';
import { NestContainer } from './container';

export class DependenciesScanner {
  constructor(private readonly container: NestContainer) {}

  async scan(module: Type<any>): Promise<void> {
    await this.scanForModules(module);
    await this.scanModulesForDependencies();
    this.container.bindGlobalScope();
  }

  private async scanForModules(module: Type<any>, scope: Type<any>[] = [], registry: Type<any>[] = []): Promise<void> {
    if (registry.includes(module)) return;
    registry.push(module);
    await this.container.addModule(module, scope);
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) || [];
    for (const innerModule of imports) {
      await this.scanForModules(innerModule, [...scope, module], registry);
    }
  }

  private async scanModulesForDependencies(): Promise<void> {
    const modules = this.container.getModules();
    for (const [token, moduleRef] of modules) {
      const { metatype } = moduleRef;
      await this.reflectImports(metatype, token);
      this.reflectProviders(metatype, token);
      this.reflectControllers(metatype, token);
      this.reflectExports(metatype, token);
    }
  }

  private async reflectImports(module: Type<any>, token: string): Promise<void> {
    const imports = Reflect.getMetadata(MODULE_METADATA.IMPORTS, module) || [];
    for (const relatedModule of imports) {
      await this.container.addImport(relatedModule, token);
    }
  }

  private reflectProviders(module: Type<any>, token: string): void {
    const providers = Reflect.getMetadata(MODULE_METADATA.PROVIDERS, module) || [];
    providers.forEach((provider: Type<any>) => this.container.addProvider(provider, token));
  }

  private reflectControllers(module: Type<any>, token: string): void {
    const controllers = Reflect.getMetadata(MODULE_METADATA.CONTROLLERS, module) || [];
    controllers.forEach((controller: Type<any>) => this.container.addController(controller, token));
  }

  private reflectExports(module: Type<any>, token: string): void {
    const exports = Reflect.getMetadata(MODULE_METADATA.EXPORTS, module) || [];
    exports.forEach((exportToken: any) => this.container.addExport(token, exportToken));
  }
}
