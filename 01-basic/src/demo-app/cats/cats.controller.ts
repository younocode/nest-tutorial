/**
 * CatsController - 猫咪控制器
 *
 * 演示：
 * 1. @Controller() 装饰器设置路由前缀
 * 2. @Get(), @Post() 等装饰器处理 HTTP 请求
 * 3. @Param(), @Body() 等装饰器提取请求参数
 * 4. 通过构造函数注入 CatsService
 */
import { Controller, Get, Post, Delete, Param, Body, Query } from '../../mini-nest';
import { CatsService } from './cats.service';
import { Cat } from './cat.interface';

@Controller('cats')
export class CatsController {
  /**
   * 构造函数注入
   *
   * CatsService 会被 DI 容器自动解析和注入
   * 这就是依赖注入的魔力！
   *
   * TypeScript 会在编译时生成 'design:paramtypes' 元数据
   * 包含 [CatsService]，注入器读取这个元数据来解析依赖
   */
  constructor(private readonly catsService: CatsService) {
    console.log('[CatsController] 控制器已创建，CatsService 已注入');
  }

  /**
   * GET /cats
   * 获取所有猫咪
   */
  @Get()
  findAll(): Cat[] {
    return this.catsService.findAll();
  }

  /**
   * GET /cats/search?breed=xxx
   * 按品种搜索（演示 @Query 装饰器）
   */
  @Get('search')
  search(@Query('breed') breed: string): Cat[] {
    const cats = this.catsService.findAll();
    if (!breed) {
      return cats;
    }
    return cats.filter(cat => cat.breed.includes(breed));
  }

  /**
   * GET /cats/:id
   * 根据 ID 获取单个猫咪
   *
   * @Param('id') 从路径中提取 id 参数
   */
  @Get(':id')
  findOne(@Param('id') id: string): Cat | { message: string } {
    const cat = this.catsService.findOne(parseInt(id, 10));
    if (!cat) {
      return { message: `猫咪 ID=${id} 不存在` };
    }
    return cat;
  }

  /**
   * POST /cats
   * 创建新猫咪
   *
   * @Body() 提取请求体
   */
  @Post()
  create(@Body() createCatDto: Omit<Cat, 'id'>): Cat {
    return this.catsService.create(createCatDto);
  }

  /**
   * DELETE /cats/:id
   * 删除猫咪
   */
  @Delete(':id')
  remove(@Param('id') id: string): { success: boolean; message: string } {
    const success = this.catsService.remove(parseInt(id, 10));
    return {
      success,
      message: success ? `猫咪 ID=${id} 已删除` : `猫咪 ID=${id} 不存在`,
    };
  }
}
