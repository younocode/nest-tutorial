/**
 * DependenciesScanner - 依赖扫描器
 *
 * 核心原理：
 * 1. 从根模块开始，递归扫描所有模块及其导入
 * 2. 读取每个模块的 providers、controllers、exports 元数据
 * 3. 将它们注册到容器中
 *
 * 这是应用启动的第一步！
 *
 * 参考真实 NestJS：packages/core/scanner.ts
 */
import 'reflect-metadata';
import { Type } from '../interfaces';
import { MODULE_METADATA } from '../constants';
import { NestContainer } from './container';

/**
 * 依赖扫描器
 *
 * 职责：
 * 1. 扫描模块树
 * 2. 注册模块、提供者、控制器
 * 3. 建立模块间的导入导出关系
 */
export class DependenciesScanner {
  constructor(private readonly container: NestContainer) {}

  /**
   * 扫描入口
   *
   * 从根模块开始，完成整个应用的扫描
   *
   * @param module 根模块（通常是 AppModule）
   */
  async scan(module: Type<any>): Promise<void> {
    console.log('\n[扫描器] 开始扫描模块...');

    // 第一步：递归扫描所有模块
    // 从根模块开始，找出所有通过 imports 引入的模块
    await this.scanForModules(module);

    // 第二步：扫描每个模块的依赖
    // 读取 providers, controllers, imports, exports 并注册到容器
    await this.scanModulesForDependencies();

    // 第三步：绑定全局模块
    // 将 @Global() 标记的模块添加到所有其他模块的 imports 中
    this.container.bindGlobalScope();

    console.log('[扫描器] 扫描完成\n');
  }

  /**
   * 递归扫描模块
   *
   * 从根模块开始，深度优先遍历所有 imports 中的模块
   *
   * @param module 当前模块
   * @param scope 模块的作用域链（用于计算模块距离）
   * @param registry 已扫描模块的注册表（防止重复扫描）
   */
  private async scanForModules(
    module: Type<any>,
    scope: Type<any>[] = [],
    registry: Type<any>[] = [],
  ): Promise<void> {
    // 防止重复扫描（处理循环导入）
    if (registry.includes(module)) {
      return;
    }
    registry.push(module);

    console.log(`[扫描器] 发现模块: ${module.name}`);

    // 将模块添加到容器
    await this.container.addModule(module, scope);

    // 获取模块的 imports 元数据
    const imports = this.reflectMetadata(module, MODULE_METADATA.IMPORTS);

    // 递归扫描导入的模块
    for (const innerModule of imports) {
      await this.scanForModules(
        innerModule,
        [...scope, module], // 更新作用域链
        registry,
      );
    }
  }

  /**
   * 扫描模块的依赖
   *
   * 遍历所有已注册的模块，读取并注册它们的：
   * - imports（导入关系）
   * - providers（提供者）
   * - controllers（控制器）
   * - exports（导出）
   */
  private async scanModulesForDependencies(): Promise<void> {
    const modules = this.container.getModules();

    for (const [token, moduleRef] of modules) {
      const { metatype } = moduleRef;

      console.log(`[扫描器] 处理模块 ${metatype.name} 的依赖...`);

      // 处理导入关系
      await this.reflectImports(metatype, token);

      // 注册提供者
      this.reflectProviders(metatype, token);

      // 注册控制器
      this.reflectControllers(metatype, token);

      // 处理导出
      this.reflectExports(metatype, token);
    }
  }

  /**
   * 处理模块导入
   *
   * 读取 @Module({ imports: [...] }) 中的模块
   * 并建立模块间的导入关系
   */
  private async reflectImports(module: Type<any>, token: string): Promise<void> {
    const imports = this.reflectMetadata(module, MODULE_METADATA.IMPORTS);

    for (const relatedModule of imports) {
      await this.container.addImport(relatedModule, token);
    }
  }

  /**
   * 处理提供者
   *
   * 读取 @Module({ providers: [...] }) 中的提供者
   * 并注册到容器
   */
  private reflectProviders(module: Type<any>, token: string): void {
    const providers = this.reflectMetadata(module, MODULE_METADATA.PROVIDERS);

    providers.forEach((provider: Type<any>) => {
      console.log(`[扫描器]   注册提供者: ${provider.name}`);
      this.container.addProvider(provider, token);
    });
  }

  /**
   * 处理控制器
   *
   * 读取 @Module({ controllers: [...] }) 中的控制器
   * 并注册到容器
   */
  private reflectControllers(module: Type<any>, token: string): void {
    const controllers = this.reflectMetadata(module, MODULE_METADATA.CONTROLLERS);

    controllers.forEach((controller: Type<any>) => {
      console.log(`[扫描器]   注册控制器: ${controller.name}`);
      this.container.addController(controller, token);
    });
  }

  /**
   * 处理导出
   *
   * 读取 @Module({ exports: [...] }) 中的导出
   * 只有导出的提供者才能被其他模块使用
   */
  private reflectExports(module: Type<any>, token: string): void {
    const exports = this.reflectMetadata(module, MODULE_METADATA.EXPORTS);

    exports.forEach((exportToken: any) => {
      console.log(`[扫描器]   导出: ${exportToken.name || exportToken}`);
      this.container.addExport(token, exportToken);
    });
  }

  /**
   * 反射获取模块元数据
   *
   * 读取 @Module() 装饰器存储的元数据
   */
  private reflectMetadata(metatype: Type<any>, metadataKey: string): any[] {
    return Reflect.getMetadata(metadataKey, metatype) || [];
  }
}
