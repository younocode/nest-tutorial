/**
 * MiniNestFactory & MiniNestApplication - 完整版
 */
import * as http from 'http';
import { Type } from './interfaces';
import { NestContainer } from './core/container';
import { DependenciesScanner } from './core/scanner';
import { Injector } from './core/injector';
import { RouterExplorer } from './router/router';

export class MiniNestApplication {
  private server: http.Server | null = null;

  constructor(
    private readonly container: NestContainer,
    private readonly routerExplorer: RouterExplorer,
  ) {}

  async listen(port: number): Promise<void> {
    const handler = this.routerExplorer.createRequestHandler();
    this.server = http.createServer(handler);

    return new Promise((resolve) => {
      this.server!.listen(port, () => {
        console.log('\n========================================');
        console.log(`🚀 MiniNest 完整版已启动`);
        console.log(`   监听端口: ${port}`);
        console.log(`   访问地址: http://localhost:${port}`);
        console.log('========================================\n');
        resolve();
      });
    });
  }

  async close(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server!.close(() => resolve());
      });
    }
  }

  get<T>(token: Type<T>): T | undefined {
    for (const [, moduleRef] of this.container.getModules()) {
      const wrapper = moduleRef.providers.get(token);
      if (wrapper?.instance) return wrapper.instance as T;
    }
    return undefined;
  }

  getHttpServer(): http.Server | null {
    return this.server;
  }
}

export class MiniNestFactory {
  static async create(module: Type<any>): Promise<MiniNestApplication> {
    console.log('\n╔══════════════════════════════════════╗');
    console.log('║   MiniNest 完整版 - 启动流程         ║');
    console.log('╚══════════════════════════════════════╝\n');

    console.log('[1/4] 创建 DI 容器');
    const container = new NestContainer();

    console.log('[2/4] 扫描模块依赖');
    const scanner = new DependenciesScanner(container);
    await scanner.scan(module);

    console.log('[3/4] 实例化提供者和控制器');
    const injector = new Injector();
    await this.createInstances(container, injector);

    console.log('\n[4/4] 注册路由映射');
    const routerExplorer = new RouterExplorer();
    container.getModules().forEach(moduleRef => {
      routerExplorer.explore(moduleRef);
    });

    return new MiniNestApplication(container, routerExplorer);
  }

  private static async createInstances(container: NestContainer, injector: Injector): Promise<void> {
    const modules = [...container.getModules().values()].sort((a, b) => a.distance - b.distance);

    for (const moduleRef of modules) {
      for (const [, wrapper] of moduleRef.providers) {
        await injector.loadProvider(wrapper, moduleRef);
      }
    }

    for (const moduleRef of modules) {
      for (const [, wrapper] of moduleRef.controllers) {
        await injector.loadController(wrapper, moduleRef);
      }
    }
  }
}
