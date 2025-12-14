/**
 * ExceptionsHandler - 异常处理器
 *
 * 负责捕获和处理异常
 * 将异常转换为 HTTP 响应
 *
 * 参考：packages/core/exceptions/exceptions-handler.ts
 */
import * as http from 'http';
import { ExceptionFilter, ArgumentsHost, HttpArgumentsHost, Type } from '../interfaces';
import { HttpException } from './http-exception';
import { FILTER_CATCH_EXCEPTIONS } from '../constants';

/**
 * 创建 ArgumentsHost
 */
export function createArgumentsHost(
  req: http.IncomingMessage,
  res: http.ServerResponse,
): ArgumentsHost {
  const args = [req, res, () => {}];

  return {
    getArgs: <T extends any[] = any[]>() => args as T,
    getArgByIndex: <T = any>(index: number) => args[index] as T,
    switchToHttp: (): HttpArgumentsHost => ({
      getRequest: <T = any>() => req as T,
      getResponse: <T = any>() => res as T,
      getNext: <T = any>() => args[2] as T,
    }),
  };
}

/**
 * 异常处理器
 */
export class ExceptionsHandler {
  private filters: ExceptionFilter[] = [];

  /**
   * 设置自定义异常过滤器
   */
  setCustomFilters(filters: ExceptionFilter[]): void {
    this.filters = filters;
  }

  /**
   * 处理异常
   *
   * @param exception 捕获的异常
   * @param host ArgumentsHost
   */
  handle(exception: any, host: ArgumentsHost): void {
    // 尝试使用自定义过滤器处理
    const filter = this.findFilter(exception);
    if (filter) {
      console.log(`[异常过滤器] 使用 ${filter.constructor.name} 处理异常`);
      filter.catch(exception, host);
      return;
    }

    // 使用默认处理
    this.handleDefault(exception, host);
  }

  /**
   * 查找匹配的异常过滤器
   */
  private findFilter(exception: any): ExceptionFilter | undefined {
    for (const filter of this.filters) {
      const exceptionTypes = Reflect.getMetadata(
        FILTER_CATCH_EXCEPTIONS,
        filter.constructor,
      ) || [];

      // 如果没有指定异常类型，匹配所有异常
      if (exceptionTypes.length === 0) {
        return filter;
      }

      // 检查异常类型是否匹配
      for (const type of exceptionTypes) {
        if (exception instanceof type) {
          return filter;
        }
      }
    }

    return undefined;
  }

  /**
   * 默认异常处理
   */
  private handleDefault(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<http.ServerResponse>();

    let status = 500;
    let message = 'Internal Server Error';
    let body: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
        body = { statusCode: status, message };
      } else {
        body = { statusCode: status, ...exceptionResponse };
        message = (exceptionResponse as any).message || message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      body = { statusCode: status, message };
    } else {
      body = { statusCode: status, message };
    }

    console.log(`[异常处理] ${status} ${message}`);

    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(body));
  }
}
