/**
 * HTTP 装饰器 - 与基础版相同
 */
import 'reflect-metadata';
import { PATH_METADATA, METHOD_METADATA, ROUTE_ARGS_METADATA } from '../constants';
import { RequestMethod, RouteParamtypes } from '../interfaces';

function createMappingDecorator(method: RequestMethod) {
  return (path?: string): MethodDecorator => {
    return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
      Reflect.defineMetadata(PATH_METADATA, path || '/', descriptor.value);
      Reflect.defineMetadata(METHOD_METADATA, method, descriptor.value);
      return descriptor;
    };
  };
}

export const Get = createMappingDecorator(RequestMethod.GET);
export const Post = createMappingDecorator(RequestMethod.POST);
export const Put = createMappingDecorator(RequestMethod.PUT);
export const Delete = createMappingDecorator(RequestMethod.DELETE);
export const Patch = createMappingDecorator(RequestMethod.PATCH);

function createRouteParamDecorator(paramtype: RouteParamtypes) {
  return (data?: string): ParameterDecorator => {
    return (target: Object, key: string | symbol | undefined, index: number) => {
      const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key!) || {};
      Reflect.defineMetadata(
        ROUTE_ARGS_METADATA,
        { ...args, [`${paramtype}:${index}`]: { index, data, type: paramtype } },
        target.constructor,
        key!,
      );
    };
  };
}

export const Req = createRouteParamDecorator(RouteParamtypes.REQUEST);
export const Res = createRouteParamDecorator(RouteParamtypes.RESPONSE);
export const Body = createRouteParamDecorator(RouteParamtypes.BODY);
export const Query = createRouteParamDecorator(RouteParamtypes.QUERY);
export const Param = createRouteParamDecorator(RouteParamtypes.PARAM);
export const Headers = createRouteParamDecorator(RouteParamtypes.HEADERS);
