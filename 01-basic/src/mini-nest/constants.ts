/**
 * 元数据 Key 常量
 *
 * 在真实的 NestJS 中，这些常量定义在 packages/common/constants.ts
 * 装饰器使用这些 key 将元数据存储到类或方法上，后续扫描器和注入器会读取这些元数据
 *
 * 核心原理：
 * - 装饰器执行时：Reflect.defineMetadata(KEY, value, target)
 * - 扫描/注入时：Reflect.getMetadata(KEY, target)
 */

// ==================== 类标记 ====================

/**
 * 标记一个类是否为可注入的提供者
 * @Injectable() 装饰器会设置此标记
 */
export const INJECTABLE_WATERMARK = '__injectable__';

/**
 * 标记一个类是否为控制器
 * @Controller() 装饰器会设置此标记
 */
export const CONTROLLER_WATERMARK = '__controller__';

// ==================== 模块元数据 ====================

/**
 * 模块元数据的 key
 * @Module() 装饰器会存储这些元数据
 */
export const MODULE_METADATA = {
  IMPORTS: 'imports',         // 导入的其他模块
  PROVIDERS: 'providers',     // 提供者（服务）
  CONTROLLERS: 'controllers', // 控制器
  EXPORTS: 'exports',         // 导出的提供者
};

// ==================== 路由元数据 ====================

/**
 * 存储控制器或方法的路由路径
 */
export const PATH_METADATA = 'path';

/**
 * 存储方法的 HTTP 请求方法类型
 */
export const METHOD_METADATA = 'method';

/**
 * 存储路由参数的元数据
 * 用于 @Param(), @Body(), @Query() 等参数装饰器
 */
export const ROUTE_ARGS_METADATA = '__routeArguments__';

// ==================== 作用域元数据 ====================

/**
 * 存储提供者的作用域选项
 * 支持 SINGLETON、TRANSIENT、REQUEST 三种作用域
 */
export const SCOPE_OPTIONS_METADATA = '__scope_options__';

// ==================== TypeScript 内置元数据 ====================

/**
 * TypeScript 编译器自动生成的参数类型元数据
 * 需要开启 emitDecoratorMetadata 选项
 *
 * 例如：
 * class CatsController {
 *   constructor(private catsService: CatsService) {}
 * }
 *
 * Reflect.getMetadata('design:paramtypes', CatsController) 返回 [CatsService]
 */
export const PARAMTYPES_METADATA = 'design:paramtypes';

/**
 * TypeScript 编译器自动生成的属性类型元数据
 */
export const TYPE_METADATA = 'design:type';

/**
 * TypeScript 编译器自动生成的返回类型元数据
 */
export const RETURN_TYPE_METADATA = 'design:returntype';
