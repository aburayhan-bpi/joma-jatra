import { sendResponse } from "@/server/core/api-response";
import { requireAuth } from "@/server/core/auth-guard";
import { withErrorHandler } from "@/server/core/route-handler";
import {
  createMember,
  listMembers,
} from "@/server/modules/members/member.service";
import { createMemberSchema } from "@/server/modules/members/member.validation";
import { parsePaginationQuery } from "@/server/shared/pagination";

export const GET = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const result = await listMembers({
    pagination,
    status: searchParams.get("status") || undefined,
    role: searchParams.get("role") || undefined,
    // Restrict raw Trash-only query to Admin (Former/Inactive tab uses includeDeleted=true)
    onlyDeleted:
      actor.role === "ADMIN" && searchParams.get("onlyDeleted") === "true",
    includeDeleted: searchParams.get("includeDeleted") === "true",
  });

  return sendResponse({
    statusCode: 200,
    message: "Members fetched successfully",
    meta: result.meta,
    data: result.items,
  });
});

export const POST = withErrorHandler(async (req) => {
  const actor = await requireAuth(req, ["ADMIN"]);
  const body = createMemberSchema.parse(await req.json());

  // Derive live origin dynamically from request headers (works across Vercel/custom domains)
  const forwardedHost = req.headers.get("x-forwarded-host") || req.headers.get("host");
  const forwardedProto = req.headers.get("x-forwarded-proto") || "https";
  const requestOrigin = forwardedHost
    ? `${forwardedProto}://${forwardedHost}`
    : req.nextUrl.origin;

  const data = await createMember(actor, body, requestOrigin);

  return sendResponse({
    statusCode: 201,
    message: "Member added successfully",
    data,
  });
});
