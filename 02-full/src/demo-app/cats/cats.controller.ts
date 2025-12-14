/**
 * CatsController - 猫咪控制器 (完整版)
 *
 * 演示守卫、管道、拦截器、异常过滤器的使用
 */
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  UsePipes,
  UseInterceptors,
  UseFilters,
  NotFoundException,
  BadRequestException,
} from '../../mini-nest';
import { CatsService } from './cats.service';
import { CreateCatDto } from './dto/create-cat.dto';
import { AuthGuard } from '../common/guards/auth.guard';
import { ValidationPipe, ParseIntPipe } from '../common/pipes/validation.pipe';
import { LoggingInterceptor, TransformInterceptor } from '../common/interceptors/logging.interceptor';
import { HttpExceptionFilter } from '../common/filters/http-exception.filter';

// 控制器级别装饰器 - 应用于所有路由
@Controller('cats')
@UseInterceptors(LoggingInterceptor) // 所有请求都记录日志
@UseFilters(HttpExceptionFilter) // 统一异常处理
export class CatsController {
  constructor(private readonly catsService: CatsService) {
    console.log('  [CatsController] 实例已创建');
  }

  /**
   * GET /cats - 获取所有猫咪
   * 无需认证
   */
  @Get()
  @UseInterceptors(TransformInterceptor) // 包装响应格式
  findAll() {
    console.log('  [CatsController] findAll() 被调用');
    return this.catsService.findAll();
  }

  /**
   * GET /cats/search?name=xxx - 搜索猫咪
   */
  @Get('search')
  search(@Query('name') name: string) {
    console.log(`  [CatsController] search() 搜索: ${name}`);
    if (!name) {
      throw new BadRequestException('请提供搜索关键词');
    }
    const cats = this.catsService.findAll();
    return cats.filter(cat => cat.name.includes(name));
  }

  /**
   * GET /cats/:id - 获取单个猫咪
   * 使用 ParseIntPipe 转换 id 参数
   */
  @Get(':id')
  @UsePipes(ParseIntPipe)
  findOne(@Param('id') id: number) {
    console.log(`  [CatsController] findOne(${id}) 被调用`);
    const cat = this.catsService.findOne(id);
    if (!cat) {
      throw new NotFoundException(`猫咪 #${id} 不存在`);
    }
    return cat;
  }

  /**
   * POST /cats - 创建猫咪
   * 需要认证 + 参数验证
   */
  @Post()
  @UseGuards(AuthGuard) // 需要认证
  @UsePipes(ValidationPipe) // 验证请求体
  create(@Body() createCatDto: CreateCatDto) {
    console.log('  [CatsController] create() 被调用');
    return this.catsService.create(createCatDto);
  }

  /**
   * PUT /cats/:id - 更新猫咪
   * 需要认证
   */
  @Put(':id')
  @UseGuards(AuthGuard)
  update(@Param('id') id: string, @Body() updateCatDto: CreateCatDto) {
    console.log(`  [CatsController] update(${id}) 被调用`);
    const numId = parseInt(id, 10);
    const cat = this.catsService.update(numId, updateCatDto);
    if (!cat) {
      throw new NotFoundException(`猫咪 #${id} 不存在`);
    }
    return cat;
  }

  /**
   * DELETE /cats/:id - 删除猫咪
   * 需要认证
   */
  @Delete(':id')
  @UseGuards(AuthGuard)
  remove(@Param('id') id: string) {
    console.log(`  [CatsController] remove(${id}) 被调用`);
    const numId = parseInt(id, 10);
    const success = this.catsService.remove(numId);
    if (!success) {
      throw new NotFoundException(`猫咪 #${id} 不存在`);
    }
    return { message: `猫咪 #${id} 已删除` };
  }
}
