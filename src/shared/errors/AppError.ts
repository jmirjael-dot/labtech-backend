export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;
  public readonly details?: unknown;

  constructor(message: string, statusCode = 400, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message: string, details?: unknown) {
    return new AppError(message, 400, details);
  }
  static unauthorized(message = 'No autorizado') {
    return new AppError(message, 401);
  }
  static forbidden(message = 'Acceso denegado') {
    return new AppError(message, 403);
  }
  static notFound(message = 'Recurso no encontrado') {
    return new AppError(message, 404);
  }
  static conflict(message: string) {
    return new AppError(message, 409);
  }
  static internal(message = 'Error interno del servidor') {
    return new AppError(message, 500);
  }
}
