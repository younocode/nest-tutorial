/**
 * Cat 接口 - 定义猫咪数据结构
 */
export interface Cat {
  id: number;
  name: string;
  age: number;
  breed?: string;
  createdAt: Date;
}
