/**
 * ValidationPipe - 验证管道示例
 *
 * 演示如何实现参数验证和转换
 * 真实场景中会使用 class-validator 和 class-transformer
 */
import { PipeTransform, ArgumentMetadata, BadRequestException } from '../../../mini-nest';

/**
 * 简单的验证管道
 * 检查值是否存在且不为空
 */
export class ValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): any {
    console.log(`  [ValidationPipe] 验证 ${metadata.type}${metadata.data ? `:${metadata.data}` : ''}`);

    // 对 body 参数进行验证
    if (metadata.type === 'body' && value !== undefined) {
      if (typeof value === 'object' && value !== null) {
        // 检查必填字段
        if ('name' in value && (!value.name || value.name.trim() === '')) {
          throw new BadRequestException('name 字段不能为空');
        }
        if ('age' in value && (typeof value.age !== 'number' || value.age < 0)) {
          throw new BadRequestException('age 字段必须是正整数');
        }
      }
    }

    console.log(`  [ValidationPipe] ✓ 验证通过`);
    return value;
  }
}

/**
 * ParseIntPipe - 整数转换管道
 *
 * 将字符串参数转换为整数
 */
export class ParseIntPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata): number {
    console.log(`  [ParseIntPipe] 转换 ${metadata.type}:${metadata.data} = "${value}"`);

    const val = parseInt(value, 10);

    if (isNaN(val)) {
      throw new BadRequestException(`参数 ${metadata.data} 必须是整数`);
    }

    console.log(`  [ParseIntPipe] ✓ 转换结果: ${val}`);
    return val;
  }
}

/**
 * DefaultValuePipe - 默认值管道
 *
 * 当值为 undefined 或 null 时提供默认值
 */
export class DefaultValuePipe implements PipeTransform {
  constructor(private readonly defaultValue: any) {}

  transform(value: any, metadata: ArgumentMetadata): any {
    if (value === undefined || value === null) {
      console.log(`  [DefaultValuePipe] 使用默认值: ${this.defaultValue}`);
      return this.defaultValue;
    }
    return value;
  }
}
