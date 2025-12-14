/**
 * CatsService 单元测试
 *
 * 演示如何测试 NestJS 服务
 */
import 'reflect-metadata';
import { expect } from 'chai';
import { CatsService } from '../src/demo-app/cats/cats.service';
import { Cat } from '../src/demo-app/cats/cat.interface';

describe('CatsService', () => {
  let catsService: CatsService;

  beforeEach(() => {
    // 每个测试前创建新的服务实例
    catsService = new CatsService();
  });

  describe('findAll', () => {
    it('应该返回初始的猫咪列表', () => {
      const cats = catsService.findAll();

      expect(cats).to.be.an('array');
      expect(cats.length).to.equal(2);
      expect(cats[0].name).to.equal('Tom');
      expect(cats[1].name).to.equal('Jerry');
    });
  });

  describe('findOne', () => {
    it('应该根据 ID 返回猫咪', () => {
      const cat = catsService.findOne(1);

      expect(cat).to.not.be.undefined;
      expect(cat!.name).to.equal('Tom');
      expect(cat!.breed).to.equal('英国短毛猫');
    });

    it('不存在的 ID 应该返回 undefined', () => {
      const cat = catsService.findOne(999);

      expect(cat).to.be.undefined;
    });
  });

  describe('create', () => {
    it('应该创建新猫咪并返回带 ID 的对象', () => {
      const newCat = {
        name: 'Kitty',
        age: 1,
        breed: '暹罗猫',
      };

      const created = catsService.create(newCat);

      expect(created).to.have.property('id');
      expect(created.id).to.equal(3); // 初始有 2 只，新的 ID 是 3
      expect(created.name).to.equal('Kitty');
      expect(created.age).to.equal(1);
      expect(created.breed).to.equal('暹罗猫');
    });

    it('创建后应该能通过 findAll 获取到', () => {
      catsService.create({
        name: 'Kitty',
        age: 1,
        breed: '暹罗猫',
      });

      const cats = catsService.findAll();

      expect(cats.length).to.equal(3);
      expect(cats[2].name).to.equal('Kitty');
    });

    it('连续创建应该有递增的 ID', () => {
      const cat1 = catsService.create({ name: 'Cat1', age: 1, breed: 'A' });
      const cat2 = catsService.create({ name: 'Cat2', age: 2, breed: 'B' });

      expect(cat1.id).to.equal(3);
      expect(cat2.id).to.equal(4);
    });
  });

  describe('remove', () => {
    it('应该删除存在的猫咪并返回 true', () => {
      const result = catsService.remove(1);

      expect(result).to.be.true;

      const cats = catsService.findAll();
      expect(cats.length).to.equal(1);
      expect(cats[0].name).to.equal('Jerry');
    });

    it('删除不存在的猫咪应该返回 false', () => {
      const result = catsService.remove(999);

      expect(result).to.be.false;

      const cats = catsService.findAll();
      expect(cats.length).to.equal(2); // 数量不变
    });

    it('删除后应该无法再找到该猫咪', () => {
      catsService.remove(1);

      const cat = catsService.findOne(1);

      expect(cat).to.be.undefined;
    });
  });
});
