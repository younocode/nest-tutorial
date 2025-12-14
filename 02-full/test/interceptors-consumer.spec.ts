/**
 * InterceptorsConsumer 单元测试
 */
import 'reflect-metadata';
import { expect } from 'chai';
import { InterceptorsConsumer } from '../src/mini-nest/interceptors/interceptors-consumer';
import { NestInterceptor, ExecutionContext, CallHandler } from '../src/mini-nest';

describe('InterceptorsConsumer', () => {
  let interceptorsConsumer: InterceptorsConsumer;
  let mockContext: ExecutionContext;

  beforeEach(() => {
    interceptorsConsumer = new InterceptorsConsumer();
    mockContext = {
      getRequest: <T = any>() => ({
        method: 'GET',
        url: '/test',
        headers: {},
      }) as T,
      getResponse: <T = any>() => ({}) as T,
      getClass: <T = any>() => (class TestController {}) as any,
      getHandler: () => function testHandler() {},
    };
  });

  describe('intercept', () => {
    it('没有拦截器时应该直接执行处理器', async () => {
      let handlerCalled = false;
      const handler = async () => {
        handlerCalled = true;
        return { data: 'test' };
      };

      const result = await interceptorsConsumer.intercept([], mockContext, handler);

      expect(handlerCalled).to.be.true;
      expect(result).to.deep.equal({ data: 'test' });
    });

    it('单个拦截器应该能够包装响应', async () => {
      const interceptor: NestInterceptor = {
        intercept: async (context, next) => {
          const result = await next.handle();
          return { wrapped: result };
        },
      };

      const result = await interceptorsConsumer.intercept(
        [interceptor],
        mockContext,
        async () => 'original'
      );

      expect(result).to.deep.equal({ wrapped: 'original' });
    });

    it('多个拦截器应该按正确顺序执行（洋葱模型）', async () => {
      const order: string[] = [];

      const interceptor1: NestInterceptor = {
        intercept: async (context, next) => {
          order.push('interceptor1-before');
          const result = await next.handle();
          order.push('interceptor1-after');
          return result;
        },
      };

      const interceptor2: NestInterceptor = {
        intercept: async (context, next) => {
          order.push('interceptor2-before');
          const result = await next.handle();
          order.push('interceptor2-after');
          return result;
        },
      };

      await interceptorsConsumer.intercept(
        [interceptor1, interceptor2],
        mockContext,
        async () => {
          order.push('handler');
          return 'done';
        }
      );

      expect(order).to.deep.equal([
        'interceptor1-before',
        'interceptor2-before',
        'handler',
        'interceptor2-after',
        'interceptor1-after',
      ]);
    });

    it('拦截器应该能够修改响应', async () => {
      const transformInterceptor: NestInterceptor = {
        intercept: async (context, next) => {
          const result = await next.handle();
          return {
            success: true,
            data: result,
            timestamp: 'mocked-time',
          };
        },
      };

      const result = await interceptorsConsumer.intercept(
        [transformInterceptor],
        mockContext,
        async () => ({ name: 'test' })
      );

      expect(result).to.deep.equal({
        success: true,
        data: { name: 'test' },
        timestamp: 'mocked-time',
      });
    });

    it('拦截器应该能够阻止处理器执行', async () => {
      let handlerCalled = false;

      const cacheInterceptor: NestInterceptor = {
        intercept: async () => {
          // 直接返回缓存，不调用 next.handle()
          return { cached: true };
        },
      };

      const result = await interceptorsConsumer.intercept(
        [cacheInterceptor],
        mockContext,
        async () => {
          handlerCalled = true;
          return { cached: false };
        }
      );

      expect(handlerCalled).to.be.false;
      expect(result).to.deep.equal({ cached: true });
    });

    it('拦截器抛出异常应该传播', async () => {
      const errorInterceptor: NestInterceptor = {
        intercept: async () => {
          throw new Error('拦截器错误');
        },
      };

      try {
        await interceptorsConsumer.intercept(
          [errorInterceptor],
          mockContext,
          async () => 'success'
        );
        expect.fail('应该抛出异常');
      } catch (error: any) {
        expect(error.message).to.equal('拦截器错误');
      }
    });

    it('拦截器应该能够访问执行上下文', async () => {
      let receivedContext: ExecutionContext | null = null;

      const loggingInterceptor: NestInterceptor = {
        intercept: async (context, next) => {
          receivedContext = context;
          return next.handle();
        },
      };

      await interceptorsConsumer.intercept(
        [loggingInterceptor],
        mockContext,
        async () => 'done'
      );

      expect(receivedContext).to.equal(mockContext);
      expect(receivedContext!.getRequest().method).to.equal('GET');
    });

    it('处理器异常应该能被拦截器捕获', async () => {
      const errorHandlingInterceptor: NestInterceptor = {
        intercept: async (context, next) => {
          try {
            return await next.handle();
          } catch (error: any) {
            return { error: error.message };
          }
        },
      };

      const result = await interceptorsConsumer.intercept(
        [errorHandlingInterceptor],
        mockContext,
        async () => {
          throw new Error('处理器错误');
        }
      );

      expect(result).to.deep.equal({ error: '处理器错误' });
    });
  });
});
