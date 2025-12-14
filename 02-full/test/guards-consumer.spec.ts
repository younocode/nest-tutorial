/**
 * GuardsConsumer 单元测试
 */
import 'reflect-metadata';
import { expect } from 'chai';
import { GuardsConsumer } from '../src/mini-nest/guards/guards-consumer';
import { CanActivate, ExecutionContext, ForbiddenException } from '../src/mini-nest';

describe('GuardsConsumer', () => {
  let guardsConsumer: GuardsConsumer;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    guardsConsumer = new GuardsConsumer();
    mockContext = {
      getRequest: <T = any>() => ({
        headers: { authorization: 'Bearer valid-token' },
        method: 'GET',
        url: '/test',
      }) as T,
      getResponse: <T = any>() => ({}) as T,
      getClass: <T = any>() => (class TestController {}) as any,
      getHandler: () => function testHandler() {},
    };
  });

  describe('tryActivate', () => {
    it('没有守卫时应该通过', async () => {
      await guardsConsumer.tryActivate([], mockContext);
      // 没有抛出异常就是通过
    });

    it('守卫返回 true 时应该通过', async () => {
      const guard: CanActivate = {
        canActivate: () => true,
      };

      await guardsConsumer.tryActivate([guard], mockContext);
    });

    it('守卫返回 Promise<true> 时应该通过', async () => {
      const guard: CanActivate = {
        canActivate: () => Promise.resolve(true),
      };

      await guardsConsumer.tryActivate([guard], mockContext);
    });

    it('守卫返回 false 时应该抛出 ForbiddenException', async () => {
      const guard: CanActivate = {
        canActivate: () => false,
      };

      try {
        await guardsConsumer.tryActivate([guard], mockContext);
        expect.fail('应该抛出异常');
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenException);
      }
    });

    it('多个守卫全部返回 true 时应该通过', async () => {
      const guard1: CanActivate = { canActivate: () => true };
      const guard2: CanActivate = { canActivate: () => Promise.resolve(true) };

      await guardsConsumer.tryActivate([guard1, guard2], mockContext);
    });

    it('任一守卫返回 false 时应该拒绝', async () => {
      const guard1: CanActivate = { canActivate: () => true };
      const guard2: CanActivate = { canActivate: () => false };

      try {
        await guardsConsumer.tryActivate([guard1, guard2], mockContext);
        expect.fail('应该抛出异常');
      } catch (error) {
        expect(error).to.be.instanceOf(ForbiddenException);
      }
    });

    it('守卫应该接收到正确的上下文', async () => {
      let receivedContext: ExecutionContext | null = null;
      const guard: CanActivate = {
        canActivate: (ctx) => {
          receivedContext = ctx;
          return true;
        },
      };

      await guardsConsumer.tryActivate([guard], mockContext);
      expect(receivedContext).to.equal(mockContext);
    });
  });
});
