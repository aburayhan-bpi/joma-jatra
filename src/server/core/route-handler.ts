import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { sendResponse } from "./api-response";
import { AppError } from "./app-error";

export type RouteContext<TParams = Record<string, string>> = {
  params: Promise<TParams>;
};

type RouteHandler<TParams = Record<string, string>> = (
  req: NextRequest,
  context: RouteContext<TParams>,
) => Promise<NextResponse>;

/**
 * Formats Zod, Mongoose, JWT, and AppError exceptions into consistent IBaseResponse JSON.
 */
export function handleApiError(error: unknown): NextResponse {
  // Known application error
  if (error instanceof AppError) {
    return sendResponse({
      success: false,
      statusCode: error.statusCode,
      message: error.message,
      data: error.details ?? null,
    });
  }

  // Zod input validation error
  if (error instanceof ZodError) {
    const firstIssue = error.issues[0];
    const path = firstIssue?.path?.join(".");
    const message = path
      ? `${path}: ${firstIssue.message}`
      : firstIssue?.message || "Invalid request payload";

    return sendResponse({
      success: false,
      statusCode: 400,
      message,
      data: error.issues.map((issue) => ({
        field: issue.path.join("."),
        message: issue.message,
      })),
    });
  }

  // Mongoose duplicate key error (code 11000)
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  ) {
    const keyValue = (error as { keyValue?: Record<string, unknown> }).keyValue;
    const duplicateField = keyValue ? Object.keys(keyValue)[0] : "field";
    return sendResponse({
      success: false,
      statusCode: 409,
      message: `Duplicate value for ${duplicateField}. Please use a unique value.`,
      data: keyValue ?? null,
    });
  }

  // Mongoose CastError (invalid MongoDB ObjectId) or ValidationError
  if (error instanceof Error) {
    if (error.name === "CastError") {
      return sendResponse({
        success: false,
        statusCode: 400,
        message: "Invalid resource identifier format",
        data: null,
      });
    }

    if (error.name === "ValidationError") {
      return sendResponse({
        success: false,
        statusCode: 400,
        message: error.message,
        data: null,
      });
    }

    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return sendResponse({
        success: false,
        statusCode: 401,
        message:
          error.name === "TokenExpiredError"
            ? "Session expired. Please log in again."
            : "Invalid authentication token.",
        data: null,
      });
    }
  }

  // Unexpected internal server error
  console.error("[API_ERROR]", error);
  return sendResponse({
    success: false,
    statusCode: 500,
    message:
      process.env.NODE_ENV === "production"
        ? "An unexpected server error occurred"
        : error instanceof Error
          ? error.message
          : "An unexpected server error occurred",
    data: null,
  });
}

/**
 * Wraps Next.js route handlers with centralized error formatting.
 */
export function withErrorHandler<TParams = Record<string, string>>(
  handler: RouteHandler<TParams>,
): RouteHandler<TParams> {
  return async (req: NextRequest, context: RouteContext<TParams>) => {
    try {
      return await handler(req, context);
    } catch (error) {
      return handleApiError(error);
    }
  };
}
