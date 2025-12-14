/**
 * DependenciesScanner 单元测试
 *
 * 测试模块扫描功能
 */
import 'reflect-metadata';
import { expect } from 'chai';
import { Injectable, Controller, Module } from '../src/mini-nest';
import { NestContainer } from '../src/mini-nest/core/container';
import { DependenciesScanner } from '../src/mini-nest/core/scanner';

describe('DependenciesScanner', () => {
  let container: NestContainer;
  let scanner: DependenciesScanner;

  beforeEach(() => {
    container = new NestContainer();
    scanner = new DependenciesScanner(container);
  });

  describe('scan', () => {
    it('应该扫描并注册单个模块', async () => {
      @Module({})
      class TestModule {}

      await scanner.scan(TestModule);

      const modules = container.getModules();
      expect(modules.size).to.equal(1);
      expect(modules.has('TestModule')).to.be.true;
    });

    it('应该扫描模块的 providers', async () => {
      @Injectable()
      class TestService {}

      @Module({
        providers: [TestService],
      })
      class TestModule {}

      await scanner.scan(TestModule);

      const moduleRef = container.getModuleByKey('TestModule')!;
      expect(moduleRef.providers.size).to.equal(1);
      expect(moduleRef.providers.has(TestService)).to.be.true;
    });

    it('应该扫描模块的 controllers', async () => {
      @Controller('test')
      class TestController {}

      @Module({
        controllers: [TestController],
      })
      class TestModule {}

      await scanner.scan(TestModule);

      const moduleRef = container.getModuleByKey('TestModule')!;
      expect(moduleRef.controllers.size).to.equal(1);
      expect(moduleRef.controllers.has(TestController)).to.be.true;
    });

    it('应该递归扫描导入的模块', async () => {
      @Module({})
      class ChildModule {}

      @Module({
        imports: [ChildModule],
      })
      class ParentModule {}

      @Module({
        imports: [ParentModule],
      })
      class RootModule {}

      await scanner.scan(RootModule);

      const modules = container.getModules();
      expect(modules.size).to.equal(3);
      expect(modules.has('RootModule')).to.be.true;
      expect(modules.has('ParentModule')).to.be.true;
      expect(modules.has('ChildModule')).to.be.true;
    });

    it('应该正确处理模块导入关系', async () => {
      @Injectable()
      class SharedService {}

      @Module({
        providers: [SharedService],
        exports: [SharedService],
      })
      class SharedModule {}

      @Module({
        imports: [SharedModule],
      })
      class AppModule {}

      await scanner.scan(AppModule);

      const appModuleRef = container.getModuleByKey('AppModule')!;
      const sharedModuleRef = container.getModuleByKey('SharedModule')!;

      // AppModule 应该导入了 SharedModule
      expect(appModuleRef.imports.has(sharedModuleRef)).to.be.true;

      // SharedModule 应该导出了 SharedService
      expect(sharedModuleRef.exports.has(SharedService)).to.be.true;
    });

    it('应该处理模块距离（distance）', async () => {
      @Module({})
      class Level2Module {}

      @Module({
        imports: [Level2Module],
      })
      class Level1Module {}

      @Module({
        imports: [Level1Module],
      })
      class RootModule {}

      await scanner.scan(RootModule);

      const rootRef = container.getModuleByKey('RootModule')!;
      const level1Ref = container.getModuleByKey('Level1Module')!;
      const level2Ref = container.getModuleByKey('Level2Module')!;

      expect(rootRef.distance).to.equal(0);
      expect(level1Ref.distance).to.equal(1);
      expect(level2Ref.distance).to.equal(2);
    });

    it('应该避免重复扫描循环导入的模块', async () => {
      // 注意：这里无法真正测试循环导入，因为 TypeScript 不允许
      // 但我们可以测试同一模块被多次导入的情况

      @Module({})
      class SharedModule {}

      @Module({
        imports: [SharedModule],
      })
      class ModuleA {}

      @Module({
        imports: [SharedModule],
      })
      class ModuleB {}

      @Module({
        imports: [ModuleA, ModuleB],
      })
      class RootModule {}

      await scanner.scan(RootModule);

      // SharedModule 应该只被注册一次
      const modules = container.getModules();
      let sharedCount = 0;
      modules.forEach((_, key) => {
        if (key === 'SharedModule') sharedCount++;
      });
      expect(sharedCount).to.equal(1);
    });
  });
});
