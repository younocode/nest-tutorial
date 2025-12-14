/**
 * CatsService - 猫咪服务
 *
 * 使用 @Injectable() 装饰器标记为可注入的提供者
 * 可以被控制器或其他服务通过构造函数注入
 */
import { Injectable } from '../../mini-nest';
import { Cat } from './cat.interface';

@Injectable()
export class CatsService {
  /**
   * 存储猫咪数据的数组（模拟数据库）
   */
  private readonly cats: Cat[] = [
    { id: 1, name: 'Tom', age: 3, breed: '英国短毛猫' },
    { id: 2, name: 'Jerry', age: 2, breed: '波斯猫' },
  ];

  /**
   * ID 计数器
   */
  private idCounter = 3;

  /**
   * 创建新猫咪
   */
  create(cat: Omit<Cat, 'id'>): Cat {
    const newCat: Cat = {
      id: this.idCounter++,
      ...cat,
    };
    this.cats.push(newCat);
    console.log(`[CatsService] 创建猫咪: ${newCat.name}`);
    return newCat;
  }

  /**
   * 获取所有猫咪
   */
  findAll(): Cat[] {
    console.log(`[CatsService] 获取所有猫咪，共 ${this.cats.length} 只`);
    return this.cats;
  }

  /**
   * 根据 ID 获取猫咪
   */
  findOne(id: number): Cat | undefined {
    const cat = this.cats.find(cat => cat.id === id);
    console.log(`[CatsService] 查找猫咪 ID=${id}, 结果: ${cat ? cat.name : '未找到'}`);
    return cat;
  }

  /**
   * 删除猫咪
   */
  remove(id: number): boolean {
    const index = this.cats.findIndex(cat => cat.id === id);
    if (index !== -1) {
      const removed = this.cats.splice(index, 1)[0];
      console.log(`[CatsService] 删除猫咪: ${removed.name}`);
      return true;
    }
    return false;
  }
}
