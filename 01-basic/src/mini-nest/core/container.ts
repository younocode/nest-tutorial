/**
 * NestContainer - 依赖注入容器
 *
 * 核心原理：
 * 1. 管理所有模块的注册和存储
 * 2. 提供模块、提供者、控制器的查找功能
 * 3. 处理全局模块的绑定
 *
 * 参考真实 NestJS：packages/core/injector/container.ts
 */
import { Type } from '../interfaces';
import { Module } from './module';

/**
 * 模块容器
 * 继承 Map，存储 token -> Module 的映射
 */
export class ModulesContainer extends Map<string, Module> {}

/**
 * NestJS 的核心容器类
 *
 * 职责：
 * 1. 存储所有注册的模块（ModulesContainer）
 * 2. 管理全局模块（对所有模块可见）
 * 3. 提供模块和提供者的访问接口
 *
 * 这是整个 DI 系统的中心，所有模块、提供者、控制器都注册在这里
 */
export class NestContainer {
  /**
   * 所有模块的存储
   * key: 模块令牌（通常是类名）
   * value: Module 实例
   */
  private readonly modules = new ModulesContainer();

  /**
   * 全局模块集合
   * 使用 @Global() 装饰的模块会被添加到这里
   * 全局模块对所有其他模块可见，无需显式导入
   */
  private readonly globalModules = new Set<Module>();

  /**
   * 添加模块到容器
   *
   * @param metatype 模块类
   * @param scope 模块的作用域链（父模块路径）
   * @returns 模块引用和是否新插入的标记
   */
  async addModule(
    metatype: Type<any>,
    scope: Type<any>[],
  ): Promise<{ moduleRef: Module; inserted: boolean }> {
    // 生成模块的唯一令牌
    const token = this.generateModuleToken(metatype);

    // 检查是否已存在，避免重复注册
    if (this.modules.has(token)) {
      return {
        moduleRef: this.modules.get(token)!,
        inserted: false,
      };
    }

    // 创建新模块实例
    const moduleRef = new Module(metatype, token);

    // 计算模块距离（用于确定初始化顺序）
    moduleRef.distance = scope.length;

    // 存储到容器
    this.modules.set(token, moduleRef);

    return { moduleRef, inserted: true };
  }

  /**
   * 生成模块的唯一令牌
   *
   * 简化版：使用类名作为令牌
   * 真实 NestJS 使用更复杂的哈希算法来处理同名模块
   */
  private generateModuleToken(metatype: Type<any>): string {
    return metatype.name;
  }

  /**
   * 获取所有模块
   */
  getModules(): ModulesContainer {
    return this.modules;
  }

  /**
   * 根据令牌获取模块
   */
  getModuleByKey(moduleKey: string): Module | undefined {
    return this.modules.get(moduleKey);
  }

  /**
   * 添加提供者到指定模块
   *
   * @param provider 提供者类
   * @param token 模块令牌
   */
  addProvider(provider: Type<any>, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) {
      throw new Error(`未知模块: ${token}`);
    }
    moduleRef.addProvider(provider);
  }

  /**
   * 添加控制器到指定模块
   */
  addController(controller: Type<any>, token: string): void {
    const moduleRef = this.modules.get(token);
    if (!moduleRef) {
      throw new Error(`未知模块: ${token}`);
    }
    moduleRef.addController(controller);
  }

  /**
   * 添加导入关系
   *
   * 将 relatedModule 添加到 token 模块的 imports 中
   */
  async addImport(relatedModule: Type<any>, token: string): Promise<void> {
    const moduleRef = this.modules.get(token);
    const relatedModuleRef = this.modules.get(relatedModule.name);

    if (moduleRef && relatedModuleRef) {
      moduleRef.addImport(relatedModuleRef);
    }
  }

  /**
   * 添加导出
   */
  addExport(token: string, exportToken: any): void {
    const moduleRef = this.modules.get(token);
    if (moduleRef) {
      moduleRef.addExport(exportToken);
    }
  }

  /**
   * 添加全局模块
   *
   * 全局模块对所有模块可见，通常用于配置、数据库连接等
   */
  addGlobalModule(module: Module): void {
    this.globalModules.add(module);
  }

  /**
   * 将全局模块绑定到所有其他模块
   *
   * 在所有模块扫描完成后调用
   * 将全局模块添加到每个非全局模块的 imports 中
   */
  bindGlobalScope(): void {
    this.modules.forEach(moduleRef => {
      this.globalModules.forEach(globalModule => {
        if (moduleRef !== globalModule) {
          moduleRef.addImport(globalModule);
        }
      });
    });
  }

  /**
   * 清空容器
   * 用于测试或应用重启
   */
  clear(): void {
    this.modules.clear();
    this.globalModules.clear();
  }
}
