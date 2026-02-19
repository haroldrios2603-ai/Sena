import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Filtro global de excepciones para manejar errores de manera centralizada.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (
        typeof exceptionResponse === 'object' &&
        exceptionResponse !== null
      ) {
        const res = exceptionResponse as Record<string, unknown>;
        const resMessage = res['message'];
        const resError =
          typeof res['error'] === 'string' ? res['error'] : undefined;
        if (typeof resMessage === 'string') {
          message = resMessage;
        } else if (Array.isArray(resMessage) && resMessage.length > 0) {
          message = resMessage.join(', ');
        }
        error = resError || error;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      error = exception.name;
    } else {
      message = 'Unknown error occurred';
    }

    // Log del error
    this.logger.error(
      `Error ${status} en ${request.method} ${request.url}: ${message}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    // Respuesta al cliente
    response.status(status).json({
      statusCode: status,
      message,
      error,
      timestamp: new Date().toISOString(),
      path: request.url,
    });
  }
}
