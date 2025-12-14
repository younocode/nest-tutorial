/**
 * CreateCatDto - 创建猫咪的数据传输对象
 *
 * DTO (Data Transfer Object) 用于定义数据结构
 * 真实场景中会配合 class-validator 使用装饰器验证
 */
export class CreateCatDto {
  name!: string;
  age!: number;
  breed?: string;
}

/**
 * UpdateCatDto - 更新猫咪的数据传输对象
 */
export class UpdateCatDto {
  name?: string;
  age?: number;
  breed?: string;
}
