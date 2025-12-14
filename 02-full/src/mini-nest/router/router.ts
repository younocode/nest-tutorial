/**
 * RouterExplorer - 完整版路由探索器
 *
 * 增加了对守卫、管道、拦截器、异常过滤器的支持
 */
import 'reflect-metadata';
import * as http from 'http';
import { Type, RequestMethod, RouteParamtypes, RouteParamMetadata } from '../interfaces';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '../constants';
import { Module } from '../core/module';
import { InstanceWrapper } from '../core/instance-wrapper';
import { RouterExecutionContext } from './router-execution-context';

interface RouteInfo {
  method: string;
  path: string;
  handler: Function;
  instance: any;
  methodName: string;
  controllerClass: Type<any>;
  requestHandler: (req: http.IncomingMessage, res: http.ServerResponse) => Promise<void>;
}

export class RouterExplorer {
  private routes: RouteInfo[] = [];
  private executionContext = new RouterExecutionContext();

  explore(moduleRef: Module): void {
    moduleRef.controllers.forEach((wrapper, metatype) => {
      this.exploreController(wrapper, metatype);
    });
  }

  private exploreController(wrapper: InstanceWrapper, metatype: Type<any>): void {
    const instance = wrapper.instance;
    if (!instance) return;

    const controllerPath = Reflect.getMetadata(PATH_METADATA, metatype) || '/';
    const methodNames = Object.getOwnPropertyNames(metatype.prototype)
      .filter(name => name !== 'constructor' && typeof metatype.prototype[name] === 'function');

    methodNames.forEach(methodName => {
      const method = instance[methodName];
      if (typeof method !== 'function') return;

      const routePath = Reflect.getMetadata(PATH_METADATA, method);
      const requestMethod: RequestMethod = Reflect.getMetadata(METHOD_METADATA, method);

      if (routePath === undefined || requestMethod === undefined) return;

      const fullPath = this.normalizePath(controllerPath, routePath);

      // 创建参数解析函数
      const resolveParams = this.createParamsResolver(metatype, methodName, fullPath);

      // 创建请求体解析函数
      const parseBody = this.createBodyParser();

      // 使用执行上下文创建请求处理函数
      const requestHandler = this.executionContext.create(
        instance,
        method,
        methodName,
        metatype,
        resolveParams,
        parseBody,
      );

      this.routes.push({
        method: requestMethod,
        path: fullPath,
        handler: method,
        instance,
        methodName,
        controllerClass: metatype,
        requestHandler,
      });

      console.log(`[路由] ${requestMethod.toUpperCase().padEnd(6)} ${fullPath} -> ${metatype.name}.${methodName}()`);
    });
  }

  private normalizePath(...paths: string[]): string {
    const fullPath = paths.map(p => p.replace(/^\/+|\/+$/g, '')).filter(p => p).join('/');
    return '/' + fullPath;
  }

  getRoutes(): RouteInfo[] {
    return this.routes;
  }

  createRequestHandler() {
    return async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const method = (req.method || 'GET').toLowerCase();
      const pathname = url.pathname;

      console.log(`\n${'='.repeat(50)}`);
      console.log(`[请求] ${method.toUpperCase()} ${pathname}`);
      console.log('='.repeat(50));

      const route = this.findRoute(method, pathname);

      if (!route) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ statusCode: 404, message: `Cannot ${method.toUpperCase()} ${pathname}` }));
        return;
      }

      // 使用路由的请求处理函数
      await route.requestHandler(req, res);
    };
  }

  private findRoute(method: string, pathname: string): RouteInfo | undefined {
    return this.routes.find(route => {
      if (route.method !== method) return false;
      const routePattern = route.path.replace(/:([^\/]+)/g, '([^/]+)');
      const regex = new RegExp(`^${routePattern}$`);
      return regex.test(pathname);
    });
  }

  private createParamsResolver(controllerClass: Type<any>, methodName: string, routePath: string) {
    return (req: http.IncomingMessage, res: http.ServerResponse, body: any): any[] => {
      const url = new URL(req.url || '/', `http://${req.headers.host}`);
      const pathname = url.pathname;
      const params = this.extractPathParams(routePath, pathname);
      const argsMetadata: Record<string, RouteParamMetadata> = Reflect.getMetadata(ROUTE_ARGS_METADATA, controllerClass, methodName) || {};

      const args: any[] = [];
      const sortedKeys = Object.keys(argsMetadata).sort((a, b) => argsMetadata[a].index - argsMetadata[b].index);

      for (const key of sortedKeys) {
        const { index, data, type } = argsMetadata[key];
        switch (type) {
          case RouteParamtypes.REQUEST: args[index] = req; break;
          case RouteParamtypes.RESPONSE: args[index] = res; break;
          case RouteParamtypes.BODY: args[index] = data ? body?.[data] : body; break;
          case RouteParamtypes.PARAM: args[index] = data ? params[data] : params; break;
          case RouteParamtypes.QUERY: args[index] = data ? url.searchParams.get(data) : Object.fromEntries(url.searchParams); break;
          case RouteParamtypes.HEADERS: args[index] = data ? req.headers[data.toLowerCase()] : req.headers; break;
          default: args[index] = undefined;
        }
      }
      return args;
    };
  }

  private extractPathParams(routePath: string, actualPath: string): Record<string, string> {
    const params: Record<string, string> = {};
    const routeParts = routePath.split('/');
    const actualParts = actualPath.split('/');
    routeParts.forEach((part, index) => {
      if (part.startsWith(':')) params[part.slice(1)] = actualParts[index];
    });
    return params;
  }

  private createBodyParser() {
    return (req: http.IncomingMessage): Promise<any> => {
      return new Promise((resolve) => {
        const chunks: Buffer[] = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
          const body = Buffer.concat(chunks).toString();
          try { resolve(JSON.parse(body)); }
          catch { resolve(body || {}); }
        });
      });
    };
  }
}
