/**
 * HttpExceptionFilter - HTTP 异常过滤器示例
 *
 * 演示如何自定义异常响应格式
 */
import { ExceptionFilter, ArgumentsHost, HttpException, Catch } from '../../../mini-nest';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    console.log(`  [HttpExceptionFilter] 处理异常: ${exception.message}`);

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message: typeof exceptionResponse === 'string'
        ? exceptionResponse
        : (exceptionResponse as any)?.message || exception.message,
    };

    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(errorResponse));
  }
}

/**
 * AllExceptionsFilter - 全局异常过滤器
 *
 * 捕获所有未处理的异常
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<any>();
    const request = ctx.getRequest<any>();

    let status = 500;
    let message = '服务器内部错误';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      message = exception.message;
    } else if (exception instanceof Error) {
      message = exception.message;
      console.error(`  [AllExceptionsFilter] 未捕获异常:`, exception.stack);
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: message,
    };

    response.statusCode = status;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(errorResponse));
  }
}
