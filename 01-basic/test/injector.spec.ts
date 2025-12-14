/**
 * Injector 单元测试
 *
 * 测试依赖注入的核心功能
 */
import 'reflect-metadata';
import { expect } from 'chai';
import { Injectable, Module } from '../src/mini-nest';
import { NestContainer } from '../src/mini-nest/core/container';
import { DependenciesScanner } from '../src/mini-nest/core/scanner';
import { Injector } from '../src/mini-nest/core/injector';

describe('Injector', () => {
  let container: NestContainer;
  let scanner: DependenciesScanner;
  let injector: Injector;

  beforeEach(() => {
    container = new NestContainer();
    scanner = new DependenciesScanner(container);
    injector = new Injector();
  });

  describe('loadProvider', () => {
    it('应该能够实例化没有依赖的服务', async () => {
      // 定义一个简单的服务
      @Injectable()
      class SimpleService {
        getValue() {
          return 'hello';
        }
      }

      @Module({
        providers: [SimpleService],
      })
      class TestModule {}

      // 扫描模块
      await scanner.scan(TestModule);

      // 获取模块和服务包装器
      const moduleRef = container.getModuleByKey('TestModule')!;
      const wrapper = moduleRef.providers.get(SimpleService)!;

      // 加载服务实例
      await injector.loadProvider(wrapper, moduleRef);

      // 验证实例已创建
      expect(wrapper.isResolved).to.be.true;
      expect(wrapper.instance).to.be.instanceOf(SimpleService);
      expect(wrapper.instance!.getValue()).to.equal('hello');
    });

    it('应该能够解析和注入依赖', async () => {
      // 定义依赖服务
      @Injectable()
      class DatabaseService {
        query() {
          return ['data1', 'data2'];
        }
      }

      // 定义使用依赖的服务
      @Injectable()
      class UserService {
        db: DatabaseService;

        constructor(db: DatabaseService) {
          this.db = db;
        }

        getUsers() {
          return this.db.query();
        }
      }

      @Module({
        providers: [DatabaseService, UserService],
      })
      class TestModule {}

      await scanner.scan(TestModule);

      const moduleRef = container.getModuleByKey('TestModule')!;

      // 先加载 DatabaseService
      const dbWrapper = moduleRef.providers.get(DatabaseService)!;
      await injector.loadProvider(dbWrapper, moduleRef);

      // 再加载 UserService
      const userWrapper = moduleRef.providers.get(UserService)!;
      await injector.loadProvider(userWrapper, moduleRef);

      // 验证依赖已注入
      expect(userWrapper.instance!.db).to.be.instanceOf(DatabaseService);
      expect(userWrapper.instance!.getUsers()).to.deep.equal(['data1', 'data2']);
    });

    it('应该能够自动解析依赖链', async () => {
      @Injectable()
      class ServiceA {
        name = 'A';
      }

      @Injectable()
      class ServiceB {
        a: ServiceA;
        constructor(a: ServiceA) {
          this.a = a;
        }
      }

      @Injectable()
      class ServiceC {
        b: ServiceB;
        constructor(b: ServiceB) {
          this.b = b;
        }
      }

      @Module({
        providers: [ServiceA, ServiceB, ServiceC],
      })
      class TestModule {}

      await scanner.scan(TestModule);

      const moduleRef = container.getModuleByKey('TestModule')!;
      const wrapperC = moduleRef.providers.get(ServiceC)!;

      // 只加载 ServiceC，应该自动解析整个依赖链
      await injector.loadProvider(wrapperC, moduleRef);

      expect(wrapperC.instance!.b).to.be.instanceOf(ServiceB);
      expect(wrapperC.instance!.b.a).to.be.instanceOf(ServiceA);
      expect(wrapperC.instance!.b.a.name).to.equal('A');
    });
  });

  describe('跨模块依赖', () => {
    it('应该能够解析从其他模块导出的依赖', async () => {
      @Injectable()
      class SharedService {
        getMessage() {
          return 'shared';
        }
      }

      @Module({
        providers: [SharedService],
        exports: [SharedService],
      })
      class SharedModule {}

      @Injectable()
      class AppService {
        shared: SharedService;
        constructor(shared: SharedService) {
          this.shared = shared;
        }
      }

      @Module({
        imports: [SharedModule],
        providers: [AppService],
      })
      class AppModule {}

      await scanner.scan(AppModule);

      // 先实例化 SharedModule 的服务
      const sharedModuleRef = container.getModuleByKey('SharedModule')!;
      const sharedWrapper = sharedModuleRef.providers.get(SharedService)!;
      await injector.loadProvider(sharedWrapper, sharedModuleRef);

      // 再实例化 AppModule 的服务
      const appModuleRef = container.getModuleByKey('AppModule')!;
      const appWrapper = appModuleRef.providers.get(AppService)!;
      await injector.loadProvider(appWrapper, appModuleRef);

      // AppService 应该注入了 SharedService
      expect(appWrapper.instance!.shared).to.be.instanceOf(SharedService);
      expect(appWrapper.instance!.shared.getMessage()).to.equal('shared');
    });
  });
});
