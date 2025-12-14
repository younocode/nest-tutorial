/**
 * MiniNestFactory & MiniNestApplication
 *
 * 核心原理：
 * 1. 创建并初始化 DI 容器
 * 2. 扫描模块依赖
 * 3. 实例化所有提供者和控制器
 * 4. 注册路由并启动 HTTP 服务器
 *
 * 参考真实 NestJS：packages/core/nest-factory.ts
 */
import * as http from 'http';
import { Type } from './interfaces';
import { NestContainer } from './core/container';
import { DependenciesScanner } from './core/scanner';
import { Injector } from './core/injector';
import { RouterExplorer } from './router/router';
import { Module } from './core/module';

/**
 * MiniNest 应用实例
 *
 * 表示一个运行中的 NestJS 应用
 * 提供启动服务器、获取提供者等方法
 */
export class MiniNestApplication {
  private server: http.Server | null = null;

  constructor(
    private readonly container: NestContainer,
    private readonly routerExplorer: RouterExplorer,
  ) {}

  /**
   * 启动 HTTP 服务器
   *
   * @param port 监听端口
   */
  async listen(port: number): Promise<void> {
    // 创建请求处理器
    const handler = this.routerExplorer.createRequestHandler();

    // 创建 HTTP 服务器
    this.server = http.createServer(handler);

    return new Promise((resolve) => {
      this.server!.listen(port, () => {
        console.log('\n========================================');
        console.log(`🚀 MiniNest 应用已启动`);
        console.log(`   监听端口: ${port}`);
        console.log(`   访问地址: http://localhost:${port}`);
        console.log('========================================\n');
        resolve();
      });
    });
  }

  /**
   * 关闭应用
   */
  async close(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          console.log('应用已关闭');
          resolve();
        });
      });
    }
  }

  /**
   * 获取提供者实例
   *
   * 通过令牌（通常是类）获取容器中的提供者实例
   * 用于在应用启动后获取服务
   */
  get<T>(token: Type<T>): T | undefined {
    const modules = this.container.getModules();

    for (const [, moduleRef] of modules) {
      const wrapper = moduleRef.providers.get(token);
      if (wrapper?.instance) {
        return wrapper.instance as T;
      }
    }

    return undefined;
  }

  /**
   * 获取 HTTP 服务器实例
   */
  getHttpServer(): http.Server | null {
    return this.server;
  }
}

/**
 * MiniNest 工厂类
 *
 * 应用的启动入口点
 * 负责创建和初始化整个应用
 */
export class MiniNestFactory {
  /**
   * 创建 MiniNest 应用实例
   *
   * 完整的启动流程：
   * 1. 创建 DI 容器
   * 2. 扫描模块依赖（使用 DependenciesScanner）
   * 3. 实例化提供者和控制器（使用 Injector）
   * 4. 注册路由（使用 RouterExplorer）
   *
   * @param module 根模块（通常是 AppModule）
   */
  static async create(module: Type<any>): Promise<MiniNestApplication> {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║     MiniNest 启动流程演示            ║');
    console.log('╚══════════════════════════════════════╝\n');

    // 步骤 1: 创建容器
    console.log('[1/4] 创建 DI 容器');
    const container = new NestContainer();

    // 步骤 2: 扫描模块
    console.log('[2/4] 扫描模块依赖');
    const scanner = new DependenciesScanner(container);
    await scanner.scan(module);

    // 步骤 3: 实例化依赖
    console.log('[3/4] 实例化提供者和控制器');
    const injector = new Injector();
    await this.createInstances(container, injector);

    // 步骤 4: 注册路由
    console.log('\n[4/4] 注册路由映射');
    const routerExplorer = new RouterExplorer();
    container.getModules().forEach(moduleRef => {
      routerExplorer.explore(moduleRef);
    });

    return new MiniNestApplication(container, routerExplorer);
  }

  /**
   * 创建所有模块的实例
   *
   * 按模块距离顺序初始化：
   * 1. 首先实例化所有提供者
   * 2. 然后实例化所有控制器
   *
   * 提供者必须先于控制器实例化，因为控制器可能依赖提供者
   */
  private static async createInstances(
    container: NestContainer,
    injector: Injector,
  ): Promise<void> {
    const modules = container.getModules();

    // 按距离排序模块（距离小的先初始化）
    const sortedModules = [...modules.values()].sort((a, b) => a.distance - b.distance);

    // 首先实例化所有提供者
    for (const moduleRef of sortedModules) {
      console.log(`\n[注入器] 处理模块: ${moduleRef.metatype.name}`);

      for (const [, wrapper] of moduleRef.providers) {
        console.log(`[注入器] 实例化提供者: ${wrapper.name}`);
        await injector.loadProvider(wrapper, moduleRef);
        console.log(`[注入器] ✓ ${wrapper.name} 实例化完成`);
      }
    }

    // 然后实例化所有控制器
    for (const moduleRef of sortedModules) {
      for (const [, wrapper] of moduleRef.controllers) {
        console.log(`[注入器] 实例化控制器: ${wrapper.name}`);
        await injector.loadController(wrapper, moduleRef);
        console.log(`[注入器] ✓ ${wrapper.name} 实例化完成`);
      }
    }
  }
}
