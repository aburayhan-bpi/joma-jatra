import { IBaseResponse, IMeta } from "@/types/global";
import { NextResponse } from "next/server";

interface SendResponseParams<T> {
  statusCode?: number;
  success?: boolean;
  message: string;
  meta?: IMeta;
  data?: T;
}

/**
 * Standardized API Response Builder
 * Strictly enforces the IBaseResponse format:
 * { success, statusCode, message, meta, data }
 */
export function sendResponse<T = null>({
  statusCode = 200,
  success = statusCode < 400,
  message,
  meta,
  data,
}: SendResponseParams<T>) {
  const payload: IBaseResponse<T> = {
    success,
    statusCode,
    message,
    ...(meta !== undefined ? { meta } : {}),
    ...(data !== undefined ? { data } : {}),
  };

  return NextResponse.json(payload, { status: statusCode });
}
