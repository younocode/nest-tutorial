/**
 * 元数据 Key 常量 - 完整版
 *
 * 在基础版的基础上，添加守卫、管道、拦截器、异常过滤器相关的常量
 */

// ==================== 基础常量（与基础版相同） ====================

export const INJECTABLE_WATERMARK = '__injectable__';
export const CONTROLLER_WATERMARK = '__controller__';

export const MODULE_METADATA = {
  IMPORTS: 'imports',
  PROVIDERS: 'providers',
  CONTROLLERS: 'controllers',
  EXPORTS: 'exports',
};

export const PATH_METADATA = 'path';
export const METHOD_METADATA = 'method';
export const ROUTE_ARGS_METADATA = '__routeArguments__';
export const SCOPE_OPTIONS_METADATA = '__scope_options__';

export const PARAMTYPES_METADATA = 'design:paramtypes';
export const TYPE_METADATA = 'design:type';
export const RETURN_TYPE_METADATA = 'design:returntype';

// ==================== 完整版新增常量 ====================

/**
 * 守卫元数据 key
 * @UseGuards() 装饰器使用
 */
export const GUARDS_METADATA = '__guards__';

/**
 * 管道元数据 key
 * @UsePipes() 装饰器使用
 */
export const PIPES_METADATA = '__pipes__';

/**
 * 拦截器元数据 key
 * @UseInterceptors() 装饰器使用
 */
export const INTERCEPTORS_METADATA = '__interceptors__';

/**
 * 异常过滤器元数据 key
 * @UseFilters() 装饰器使用
 */
export const FILTER_CATCH_EXCEPTIONS = '__filterCatchExceptions__';
export const EXCEPTION_FILTERS_METADATA = '__exceptionFilters__';

/**
 * 自定义装饰器元数据 key
 * 如 @Roles() 等自定义元数据
 */
export const CUSTOM_METADATA_KEY = '__customMetadata__';
