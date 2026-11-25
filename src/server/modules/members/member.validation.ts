import {
  MEMBER_DEACTIVATE_ACTIONS,
  PAYMENT_METHODS,
  USER_ROLES,
} from "@/types/backend";
import { z } from "zod";
import { safeImageUrlSchema } from "../../shared/validation-helpers";

export const createMemberSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Please enter a valid email address"),
  phone: z.string().trim().max(25).optional().default(""),
  password: z
    .string()
    .min(6, "Temporary password must be at least 6 characters")
    .max(100, "Password must not exceed 100 characters"),
  // Strictly 1 active Admin is allowed — new members start as MEMBER or CASHIER
  role: z.enum(["MEMBER", "CASHIER"]).optional().default("MEMBER"),
  joinedAt: z.coerce.date().optional(),
  profileImage: safeImageUrlSchema.optional().default(""),
  mustChangePassword: z.boolean().optional().default(true),
});

export const updateMemberSchema = z.object({
  name: z.string().trim().min(2).max(100).optional(),
  phone: z.string().trim().max(25).optional(),
  profileImage: safeImageUrlSchema.optional(),
  joinedAt: z.coerce.date().optional(),
});

export const changeMemberRoleSchema = z.object({
  role: z.enum(USER_ROLES),
  // Used when transferring Admin ownership to another active member
  previousAdminNextRole: z.enum(["CASHIER", "MEMBER"]).optional().default("CASHIER"),
});

export const deactivateMemberSchema = z
  .object({
    action: z.enum(MEMBER_DEACTIVATE_ACTIONS).default("DEACTIVATE_ONLY"),
    leaveNote: z.string().trim().max(300).optional().default(""),
    // Required when action === "SETTLE_AND_CLOSE" and member has netBalance > 0
    paymentAccountId: z.string().trim().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    recipientAccount: z.string().trim().max(100).optional().default(""),
    trxId: z.string().trim().max(80).optional(),
    proofImage: safeImageUrlSchema.optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.action === "SETTLE_AND_CLOSE" && !data.paymentAccountId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["paymentAccountId"],
        message:
          "Please select the Payment Account used to settle this member's balance",
      });
    }
  });
