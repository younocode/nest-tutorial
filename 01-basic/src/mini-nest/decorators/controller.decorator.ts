/**
 * @Controller 装饰器实现
 *
 * 核心原理：
 * 1. 标记类为控制器
 * 2. 存储路由前缀路径
 * 3. 路由系统会扫描控制器并注册路由
 *
 * 参考真实 NestJS：packages/common/decorators/core/controller.decorator.ts
 */
import 'reflect-metadata';
import { CONTROLLER_WATERMARK, PATH_METADATA, SCOPE_OPTIONS_METADATA } from '../constants';
import { ControllerOptions, Scope } from '../interfaces';

/**
 * 将一个类标记为 HTTP 控制器
 *
 * 使用方法：
 * ```typescript
 * @Controller('cats')
 * class CatsController {
 *   @Get()
 *   findAll() { return []; }
 * }
 * ```
 *
 * 这样 CatsController 的所有路由都会以 /cats 为前缀
 * 例如：GET /cats, POST /cats, GET /cats/:id 等
 *
 * @param prefixOrOptions 路由前缀字符串或配置对象
 * @returns 类装饰器
 */
export function Controller(prefixOrOptions?: string | ControllerOptions): ClassDecorator {
  // 解析参数，支持字符串或对象两种形式
  const defaultPath = '/';

  let path: string;
  let scopeOptions: { scope?: Scope };

  if (typeof prefixOrOptions === 'string') {
    // @Controller('cats') 形式
    path = prefixOrOptions;
    scopeOptions = {};
  } else if (prefixOrOptions) {
    // @Controller({ path: 'cats', scope: Scope.REQUEST }) 形式
    path = prefixOrOptions.path || defaultPath;
    scopeOptions = { scope: prefixOrOptions.scope };
  } else {
    // @Controller() 形式，无路由前缀
    path = defaultPath;
    scopeOptions = {};
  }

  return (target: object) => {
    // 标记为控制器
    // 扫描器会检查这个标记来识别控制器类
    Reflect.defineMetadata(CONTROLLER_WATERMARK, true, target);

    // 存储路由路径前缀
    // 路由系统会读取这个值来组合完整路径
    Reflect.defineMetadata(PATH_METADATA, path, target);

    // 存储作用域选项
    Reflect.defineMetadata(SCOPE_OPTIONS_METADATA, scopeOptions, target);
  };
}
