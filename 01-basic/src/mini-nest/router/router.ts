/**
 * RouterExplorer - 路由探索器
 *
 * 核心原理：
 * 1. 扫描控制器方法上的路由元数据
 * 2. 将路由注册到 HTTP 服务器
 * 3. 处理请求参数的提取和注入
 *
 * 参考真实 NestJS：packages/core/router/router-explorer.ts
 */
import 'reflect-metadata';
import * as http from 'http';
import { Type, RequestMethod, RouteParamtypes, RouteParamMetadata } from '../interfaces';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '../constants';
import { Module } from '../core/module';
import { InstanceWrapper } from '../core/instance-wrapper';

/**
 * 路由信息
 */
interface RouteInfo {
  method: string;           // HTTP 方法
  path: string;             // 路由路径
  handler: Function;        // 处理函数
  instance: any;            // 控制器实例
  methodName: string;       // 方法名
}

/**
 * 路由探索器
 *
 * 负责：
 * 1. 扫描控制器并提取路由信息
 * 2. 注册路由到 HTTP 服务器
 * 3. 处理请求和响应
 */
export class RouterExplorer {
  /**
   * 存储所有注册的路由
   */
  private routes: RouteInfo[] = [];

  /**
   * 探索模块中的所有控制器并注册路由
   *
   * @param moduleRef 模块引用
   */
  explore(moduleRef: Module): void {
    const controllers = moduleRef.controllers;

    controllers.forEach((wrapper, metatype) => {
      this.exploreController(wrapper, metatype);
    });
  }

  /**
   * 探索单个控制器
   *
   * 扫描控制器的所有方法，找出带有 @Get(), @Post() 等装饰器的方法
   */
  private exploreController(wrapper: InstanceWrapper, metatype: Type<any>): void {
    const instance = wrapper.instance;
    if (!instance) {
      return;
    }

    // 获取控制器的路由前缀
    // 例如：@Controller('cats') -> controllerPath = 'cats'
    const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype) || '/';

    // 扫描控制器原型上的所有方法
    const methodNames = this.scanForPaths(metatype.prototype);

    methodNames.forEach(methodName => {
      const method = instance[methodName];
      if (typeof method !== 'function') {
        return;
      }

      // 获取方法上的路由元数据
      const routePath = Reflect.getMetadata(PATH_METADATA, method);
      const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, method);

      // 如果没有路由装饰器，跳过
      if (routePath === undefined || requestMethod === undefined) {
        return;
      }

      // 组合完整路径
      const fullPath = this.normalizePath(controllerPath, routePath);

      // 注册路由
      this.routes.push({
        method: requestMethod,
        path: fullPath,
        handler: method,
        instance,
        methodName,
      });

      console.log(`[路由] ${requestMethod.toUpperCase().padEnd(6)} ${fullPath} -> ${metatype.name}.${methodName}()`);
    });
  }

  /**
   * 扫描类原型上的所有方法名
   */
  private scanForPaths(prototype: any): string[] {
    return Object.getOwnPropertyNames(prototype)
      .filter(name => name !== 'constructor' && typeof prototype[name] === 'function');
  }

  /**
   * 规范化路径
   * 确保路径以 / 开头，不以 / 结尾
   */
  private normalizePath(...paths: string[]): string {
    const fullPath = paths
      .map(p => p.replace(/^\/+|\/+$/g, '')) // 去除首尾的 /
      .filter(p => p)                         // 过滤空字符串
      .join('/');
    return '/' + fullPath;
  }

  /**
   * 获取所有注册的路由
   */
  getRoutes(): RouteInfo[] {
    return this.routes;
  }

  /**
   * 创建 HTTP 请求处理器
   *
   * 这个方法返回一个函数，用于处理所有 HTTP 请求
   *
   * 处理流程：
   * 1. 解析请求 URL 和方法
   * 2. 匹配路由
   * 3. 解析参数
   * 4. 调用控制器方法
   * 5. 返回响应
   */
  createRequestHandler() {
    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const method = (req.method || 'GET').toLowerCase();
      const pathname = url.pathname;

      console.log(`\n[请求] ${method.toUpperCase()} ${pathname}`);

      // 查找匹配的路由
      const route = this.findRoute(method, pathname);

      if (!route) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          statusCode: 404,
          message: `Cannot ${method.toUpperCase()} ${pathname}`,
        }));
        return;
      }

      try {
        // 解析请求体
        const body = await this.parseBody(req);

        // 从路径中提取参数
        const params = this.extractPathParams(route.path, pathname);

        // 获取方法的参数元数据
        const argsMetadata = Reflect.getMetadata(
          ROUTE_ARGS_METADATA,
          route.instance.constructor,
          route.methodName,
        ) || {};

        // 构建调用参数
        const args = this.resolveParams(argsMetadata, req, res, body, params, url.searchParams);

        // 调用控制器方法
        const result = await route.handler.apply(route.instance, args);

        // 发送响应
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result));
      } catch (error) {
        console.error('[错误]', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          statusCode: 500,
          message: error instanceof Error ? error.message : 'Internal Server Error',
        }));
      }
    };
  }

  /**
   * 查找匹配的路由
   *
   * 支持路径参数，如 /cats/:id
   */
  private findRoute(method: string, pathname: string): RouteInfo | undefined {
    return this.routes.find(route => {
      if (route.method !== method) {
        return false;
      }

      // 将路由路径转换为正则表达式
      // /cats/:id -> /cats/([^/]+)
      const routePattern = route.path.replace(/:([^\/]+)/g, '([^/]+)');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(pathname);
    });
  }

  /**
   * 从路径中提取参数
   *
   * 例如：
   * routePath: /cats/:id
   * actualPath: /cats/123
   * 返回：{ id: '123' }
   */
  private extractPathParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');

    routeParts.forEach((part, index) => {
      if (part.startsWith(':')) {
        const paramName = part.slice(1);
        params[paramName] = actualParts[index];
      }
    });

    return params;
  }

  /**
   * 解析请求体
   */
  private parseBody(req: http.IncomingMessage): Promise<any> {
    return new Promise((resolve) => {
      const chunks: Buffer[] = [];
      req.on('data', chunk => chunks.push(chunk));
      req.on('end', () => {
        const body = Buffer.concat(chunks).toString();
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(body || {});
        }
      });
    });
  }

  /**
   * 解析路由参数
   *
   * 根据参数装饰器的元数据，从请求中提取对应的值
   *
   * 例如：
   * findOne(@Param('id') id: string, @Body() body: any)
   *
   * argsMetadata:
   * {
   *   '5:0': { index: 0, data: 'id', type: RouteParamtypes.PARAM },
   *   '3:1': { index: 1, data: undefined, type: RouteParamtypes.BODY },
   * }
   */
  private resolveParams(
    argsMetadata: Record<string, RouteParamMetadata>,
    req: http.IncomingMessage,
    res: http.ServerResponse,
    body: any,
    params: Record<string, string>,
    query: URLSearchParams,
  ): any[] {
    const args: any[] = [];

    // 按参数索引排序
    const sortedKeys = Object.keys(argsMetadata).sort((a, b) => {
      const indexA = argsMetadata[a].index;
      const indexB = argsMetadata[b].index;
      return indexA - indexB;
    });

    for (const key of sortedKeys) {
      const { index, data, type } = argsMetadata[key];

      switch (type) {
        case RouteParamtypes.REQUEST:
          // @Req() - 注入原始请求对象
          args[index] = req;
          break;

        case RouteParamtypes.RESPONSE:
          // @Res() - 注入原始响应对象
          args[index] = res;
          break;

        case RouteParamtypes.BODY:
          // @Body() 或 @Body('field')
          args[index] = data ? body?.[data] : body;
          break;

        case RouteParamtypes.PARAM:
          // @Param() 或 @Param('id')
          args[index] = data ? params[data] : params;
          break;

        case RouteParamtypes.QUERY:
          // @Query() 或 @Query('page')
          args[index] = data ? query.get(data) : Object.fromEntries(query);
          break;

        case RouteParamtypes.HEADERS:
          // @Headers() 或 @Headers('authorization')
          args[index] = data ? req.headers[data.toLowerCase()] : req.headers;
          break;

        default:
          args[index] = undefined;
      }
    }

    return args;
  }
}
