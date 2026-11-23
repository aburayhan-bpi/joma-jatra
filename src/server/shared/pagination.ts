import { IMeta } from "@/types/global";

export interface PaginationQuery {
  page: number;
  limit: number;
  skip: number;
  search: string;
}

/**
 * Parses URL-based pagination and search query parameters (?page=1&limit=25&search=...).
 * Caps limit at maxLimit (default 100) to protect database performance.
 */
export function parsePaginationQuery(
  req: Request,
  defaultLimit = 25,
  maxLimit = 100,
): PaginationQuery {
  const { searchParams } = new URL(req.url);
  const rawPage = Number.parseInt(searchParams.get("page") || "1", 10);
  const rawLimit = Number.parseInt(
    searchParams.get("limit") || String(defaultLimit),
    10,
  );

  const page = Number.isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const limit =
    Number.isNaN(rawLimit) || rawLimit < 1
      ? defaultLimit
      : Math.min(rawLimit, maxLimit);
  const skip = (page - 1) * limit;
  const search = (searchParams.get("search") || "").trim();

  return { page, limit, skip, search };
}

/**
 * Builds standard IMeta pagination object for IBaseResponse.
 */
export function buildPaginationMeta(
  total: number,
  page: number,
  limit: number,
): IMeta {
  return {
    page,
    limit,
    total,
    totalPage: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

/**
 * Escapes user input before building MongoDB $regex search queries
 * to prevent malformed regex errors and ReDoS attacks.
 */
export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a case-insensitive MongoDB $or regex filter across specified fields.
 */
export function buildSearchFilter(
  search: string,
  fields: string[],
): Record<string, unknown> {
  if (!search || fields.length === 0) {
    return {};
  }

  const safePattern = new RegExp(escapeRegex(search), "i");
  return {
    $or: fields.map((field) => ({ [field]: safePattern })),
  };
}
