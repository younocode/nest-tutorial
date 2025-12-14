/**
 * CatsService - 猫咪服务
 *
 * 提供猫咪数据的 CRUD 操作
 */
import { Injectable } from '../../mini-nest';
import { Cat } from './cat.interface';
import { CreateCatDto, UpdateCatDto } from './dto/create-cat.dto';

@Injectable()
export class CatsService {
  private cats: Cat[] = [
    { id: 1, name: '小橘', age: 2, breed: '橘猫', createdAt: new Date() },
    { id: 2, name: '小黑', age: 3, breed: '狸花猫', createdAt: new Date() },
  ];
  private nextId = 3;

  findAll(): Cat[] {
    console.log('  [CatsService] findAll() - 返回所有猫咪');
    return this.cats;
  }

  findOne(id: number): Cat | undefined {
    console.log(`  [CatsService] findOne(${id}) - 查找猫咪`);
    return this.cats.find(cat => cat.id === id);
  }

  create(createCatDto: CreateCatDto): Cat {
    console.log(`  [CatsService] create() - 创建猫咪:`, createCatDto);
    const newCat: Cat = {
      id: this.nextId++,
      ...createCatDto,
      createdAt: new Date(),
    };
    this.cats.push(newCat);
    return newCat;
  }

  update(id: number, updateCatDto: UpdateCatDto): Cat | undefined {
    console.log(`  [CatsService] update(${id}) - 更新猫咪:`, updateCatDto);
    const index = this.cats.findIndex(cat => cat.id === id);
    if (index === -1) return undefined;

    this.cats[index] = {
      ...this.cats[index],
      ...updateCatDto,
    };
    return this.cats[index];
  }

  remove(id: number): boolean {
    console.log(`  [CatsService] remove(${id}) - 删除猫咪`);
    const index = this.cats.findIndex(cat => cat.id === id);
    if (index === -1) return false;

    this.cats.splice(index, 1);
    return true;
  }
}
