/**
 * HTTP 方法装饰器和参数装饰器实现
 *
 * 核心原理：
 * 1. 方法装饰器在方法上存储路径和 HTTP 方法类型
 * 2. 参数装饰器在方法上存储参数位置和来源信息
 * 3. 路由系统会扫描这些元数据来注册路由和解析参数
 *
 * 参考真实 NestJS：packages/common/decorators/http/request-mapping.decorator.ts
 */
import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '../constants';
import { RequestMethod, RouteParamtypes } from '../interfaces';

// ==================== HTTP 方法装饰器 ====================

/**
 * 创建 HTTP 方法装饰器的工厂函数
 *
 * 工厂模式：@Get(), @Post() 等装饰器都通过这个工厂函数创建
 * 它们的区别只是 HTTP 方法不同
 *
 * @param method HTTP 方法类型
 */
function createMappingDecorator(method: RequestMethod) {
  return (path?: string): MethodDecorator => {
    return (
      target: object,           // 类的原型
      key: string | symbol,     // 方法名
      descriptor: PropertyDescriptor, // 方法描述符
    ) => {
      // 存储路由路径
      // 如果没有指定路径，默认为 '/'
      Reflect.defineMetadata(PATH_METADATA, path || '/', descriptor.value);

      // 存储 HTTP 方法类型
      Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);

      return descriptor;
    };
  };
}

/**
 * @Get() 装饰器 - 处理 HTTP GET 请求
 *
 * 使用方法：
 * ```typescript
 * @Get('all')
 * findAll() { return []; }
 * // 匹配 GET /cats/all
 * ```
 */
export const Get = createMappingDecorator(RequestMethod.GET);

/**
 * @Post() 装饰器 - 处理 HTTP POST 请求
 *
 * 使用方法：
 * ```typescript
 * @Post()
 * create(@Body() dto: CreateCatDto) { return dto; }
 * // 匹配 POST /cats
 * ```
 */
export const Post = createMappingDecorator(RequestMethod.POST);

/**
 * @Put() 装饰器 - 处理 HTTP PUT 请求
 */
export const Put = createMappingDecorator(RequestMethod.PUT);

/**
 * @Delete() 装饰器 - 处理 HTTP DELETE 请求
 */
export const Delete = createMappingDecorator(RequestMethod.DELETE);

/**
 * @Patch() 装饰器 - 处理 HTTP PATCH 请求
 */
export const Patch = createMappingDecorator(RequestMethod.PATCH);

// ==================== 参数装饰器 ====================

/**
 * 创建参数装饰器的工厂函数
 *
 * 参数装饰器的核心原理：
 * 1. 在方法上存储参数位置和类型信息
 * 2. 路由执行时根据这些信息从请求中提取对应的值
 *
 * 存储格式：
 * {
 *   '3:0': { index: 0, data: undefined, type: RouteParamtypes.BODY },
 *   '5:1': { index: 1, data: 'id', type: RouteParamtypes.PARAM },
 * }
 *
 * key 格式为 `${type}:${index}`，确保每个参数的 key 唯一
 *
 * @param paramtype 参数类型
 */
function createRouteParamDecorator(paramtype: RouteParamtypes) {
  return (data?: string): ParameterDecorator => {
    return (
      target: Object,            // 类的原型（实例方法）或类本身（静态方法）
      key: string | symbol | undefined, // 方法名
      index: number,             // 参数在方法签名中的索引
    ) => {
      // 获取已存在的参数元数据，如果没有则初始化为空对象
      const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key!) || {};

      // 添加新的参数信息
      // 使用 `${paramtype}:${index}` 作为 key，确保唯一性
      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        {
          ...args,
          [`${paramtype}:${index}`]: {
            index,           // 参数在方法中的位置
            data,            // 额外数据，如 @Param('id') 中的 'id'
            type: paramtype, // 参数类型
          },
        },
        target.constructor,
        key!,
      );
    };
  };
}

/**
 * @Req() 装饰器 - 注入原始请求对象
 *
 * 使用方法：
 * ```typescript
 * findAll(@Req() req: Request) {
 *   console.log(req.headers);
 * }
 * ```
 */
export const Req = createRouteParamDecorator(RouteParamtypes.REQUEST);

/**
 * @Res() 装饰器 - 注入原始响应对象
 *
 * 注意：使用 @Res() 后，你需要手动发送响应
 */
export const Res = createRouteParamDecorator(RouteParamtypes.RESPONSE);

/**
 * @Body() 装饰器 - 注入请求体
 *
 * 使用方法：
 * ```typescript
 * create(@Body() dto: CreateCatDto) { return dto; }
 * // 或者获取特定字段
 * create(@Body('name') name: string) { return name; }
 * ```
 */
export const Body = createRouteParamDecorator(RouteParamtypes.BODY);

/**
 * @Query() 装饰器 - 注入查询参数
 *
 * 使用方法：
 * ```typescript
 * findAll(@Query('page') page: string) { return page; }
 * // GET /cats?page=1 -> page = '1'
 * ```
 */
export const Query = createRouteParamDecorator(RouteParamtypes.QUERY);

/**
 * @Param() 装饰器 - 注入路由参数
 *
 * 使用方法：
 * ```typescript
 * findOne(@Param('id') id: string) { return id; }
 * // GET /cats/123 -> id = '123'
 * ```
 */
export const Param = createRouteParamDecorator(RouteParamtypes.PARAM);

/**
 * @Headers() 装饰器 - 注入请求头
 *
 * 使用方法：
 * ```typescript
 * findAll(@Headers('authorization') auth: string) { return auth; }
 * ```
 */
export const Headers = createRouteParamDecorator(RouteParamtypes.HEADERS);
