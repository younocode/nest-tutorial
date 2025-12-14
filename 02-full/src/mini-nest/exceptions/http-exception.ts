/**
 * HTTP 异常类
 *
 * 表示 HTTP 错误响应
 *
 * 参考：packages/common/exceptions/http.exception.ts
 */

/**
 * HTTP 异常基类
 *
 * @example
 * throw new HttpException('Not Found', 404);
 * throw new HttpException({ message: 'Invalid data', errors: [...] }, 400);
 */
export class HttpException extends Error {
  constructor(
    private readonly response: string | object,
    private readonly status: number,
  ) {
    super();
    this.initMessage();
    this.name = this.constructor.name;
  }

  private initMessage() {
    if (typeof this.response === 'string') {
      this.message = this.response;
    } else if (typeof this.response === 'object' && 'message' in this.response) {
      this.message = (this.response as any).message;
    } else {
      this.message = this.constructor.name;
    }
  }

  /**
   * 获取响应体
   */
  getResponse(): string | object {
    return this.response;
  }

  /**
   * 获取 HTTP 状态码
   */
  getStatus(): number {
    return this.status;
  }
}

// ==================== 常用 HTTP 异常 ====================

/**
 * 400 Bad Request
 */
export class BadRequestException extends HttpException {
  constructor(message: string | object = 'Bad Request') {
    super(message, 400);
  }
}

/**
 * 401 Unauthorized
 */
export class UnauthorizedException extends HttpException {
  constructor(message: string | object = 'Unauthorized') {
    super(message, 401);
  }
}

/**
 * 403 Forbidden
 */
export class ForbiddenException extends HttpException {
  constructor(message: string | object = 'Forbidden') {
    super(message, 403);
  }
}

/**
 * 404 Not Found
 */
export class NotFoundException extends HttpException {
  constructor(message: string | object = 'Not Found') {
    super(message, 404);
  }
}

/**
 * 500 Internal Server Error
 */
export class InternalServerErrorException extends HttpException {
  constructor(message: string | object = 'Internal Server Error') {
    super(message, 500);
  }
}
