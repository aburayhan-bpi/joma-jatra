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
  await requireAuth(req, ["ADMIN", "CASHIER", "MEMBER"]);
  const pagination = parsePaginationQuery(req);
  const { searchParams } = new URL(req.url);

  const result = await listMembers({
    pagination,
    status: searchParams.get("status") || undefined,
    role: searchParams.get("role") || undefined,
    onlyDeleted: searchParams.get("onlyDeleted") === "true",
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
  const data = await createMember(actor, body);

  return sendResponse({
    statusCode: 201,
    message: "Member added successfully",
    data,
  });
});
