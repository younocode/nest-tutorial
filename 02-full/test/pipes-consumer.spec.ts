/**
 * PipesConsumer 单元测试
 */
import 'reflect-metadata';
import { expect } from 'chai';
import { PipesConsumer } from '../src/mini-nest/pipes/pipes-consumer';
import { PipeTransform, ArgumentMetadata, BadRequestException } from '../src/mini-nest';

describe('PipesConsumer', () => {
  let pipesConsumer: PipesConsumer;

  beforeEach(() => {
    pipesConsumer = new PipesConsumer();
  });

  describe('applyPipes', () => {
    it('没有管道时应该返回原始值', async () => {
      const value = { name: 'test' };
      const metadata: ArgumentMetadata = { type: 'body', data: undefined };

      const result = await pipesConsumer.applyPipes(value, metadata, []);
      expect(result).to.equal(value);
    });

    it('单个管道应该正确转换值', async () => {
      const pipe: PipeTransform = {
        transform: (value) => value.toUpperCase(),
      };
      const metadata: ArgumentMetadata = { type: 'param', data: 'name' };

      const result = await pipesConsumer.applyPipes('test', metadata, [pipe]);
      expect(result).to.equal('TEST');
    });

    it('多个管道应该按顺序执行', async () => {
      const pipe1: PipeTransform = {
        transform: (value) => value + '-first',
      };
      const pipe2: PipeTransform = {
        transform: (value) => value + '-second',
      };
      const metadata: ArgumentMetadata = { type: 'param', data: 'id' };

      const result = await pipesConsumer.applyPipes('value', metadata, [pipe1, pipe2]);
      expect(result).to.equal('value-first-second');
    });

    it('异步管道应该正确工作', async () => {
      const asyncPipe: PipeTransform = {
        transform: async (value) => {
          await new Promise(resolve => setTimeout(resolve, 10));
          return value * 2;
        },
      };
      const metadata: ArgumentMetadata = { type: 'param', data: 'num' };

      const result = await pipesConsumer.applyPipes(5, metadata, [asyncPipe]);
      expect(result).to.equal(10);
    });

    it('管道应该接收到正确的元数据', async () => {
      let receivedMetadata: ArgumentMetadata | null = null;
      const pipe: PipeTransform = {
        transform: (value, metadata) => {
          receivedMetadata = metadata;
          return value;
        },
      };
      const metadata: ArgumentMetadata = { type: 'query', data: 'search' };

      await pipesConsumer.applyPipes('test', metadata, [pipe]);
      expect(receivedMetadata).to.deep.equal(metadata);
    });

    it('验证管道抛出异常时应该传播', async () => {
      const validationPipe: PipeTransform = {
        transform: (value) => {
          if (!value || value.length < 3) {
            throw new BadRequestException('值长度必须大于 3');
          }
          return value;
        },
      };
      const metadata: ArgumentMetadata = { type: 'body', data: 'name' };

      try {
        await pipesConsumer.applyPipes('ab', metadata, [validationPipe]);
        expect.fail('应该抛出异常');
      } catch (error) {
        expect(error).to.be.instanceOf(BadRequestException);
      }
    });

    it('ParseIntPipe 示例应该正确转换字符串为数字', async () => {
      const parseIntPipe: PipeTransform = {
        transform: (value) => {
          const val = parseInt(value, 10);
          if (isNaN(val)) {
            throw new BadRequestException('必须是整数');
          }
          return val;
        },
      };
      const metadata: ArgumentMetadata = { type: 'param', data: 'id' };

      const result = await pipesConsumer.applyPipes('42', metadata, [parseIntPipe]);
      expect(result).to.equal(42);
      expect(typeof result).to.equal('number');
    });
  });
});
