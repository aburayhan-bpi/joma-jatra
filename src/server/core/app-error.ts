/**
 * Custom Application Error
 * Used across services to throw structured HTTP errors handled centrally.
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    this.details = details;
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new AppError(400, message, details);

export const unauthorized = (message = "Authentication required") =>
  new AppError(401, message);

export const forbidden = (
  message = "You do not have permission to perform this action",
) => new AppError(403, message);

export const notFound = (message = "Requested resource not found") =>
  new AppError(404, message);

export const conflict = (message: string, details?: unknown) =>
  new AppError(409, message, details);

export const tooManyRequests = (
  message = "Too many requests. Please wait a moment and try again.",
) => new AppError(429, message);
