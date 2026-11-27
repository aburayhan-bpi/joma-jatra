import { PAYMENT_METHODS, RETURN_TYPES } from "@/types/backend";
import { z } from "zod";
import {
  feeAmountSchema,
  safeImageUrlSchema,
  settlementAmountSchema,
} from "../../shared/validation-helpers";

export const createReturnSchema = z
  .object({
    memberId: z.string().trim().optional(), // Admin/Cashier can specify (including inactive members for post-close settlement)
    amount: settlementAmountSchema("Return amount"),
    payoutFee: feeAmountSchema("Payout fee").optional().default(0),
    returnDate: z.coerce.date().optional(),
    paymentAccountId: z.string().trim().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    recipientAccount: z.string().trim().max(120).optional().default(""),
    trxId: z.string().trim().max(80).optional(),
    proofImage: safeImageUrlSchema.optional().default(""),
    reason: z.string().trim().max(400).optional().default(""),
    returnType: z.enum(RETURN_TYPES).optional().default("PARTIAL"),
  })
  .superRefine((data, ctx) => {
    if (data.payoutFee > 0 && data.returnType === "DONATED_WAIVER") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payoutFee"],
        message: "Donated/waived records cannot have a payout fee",
      });
    }
    if (data.payoutFee >= data.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["payoutFee"],
        message: "Payout fee must be less than the return amount (leave positive net payout)",
      });
    }
  });

export const updateReturnSchema = z.object({
  amount: settlementAmountSchema("Return amount").optional(),
  payoutFee: feeAmountSchema("Payout fee").optional(),
  recipientAccount: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(400).optional(),
  paymentAccountId: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  trxId: z.string().trim().max(80).optional(),
  proofImage: safeImageUrlSchema.optional(),
});

export const reviewReturnSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().trim().max(300).optional(),
    paymentAccountId: z.string().trim().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    payoutFee: feeAmountSchema("Payout fee").optional(),
    trxId: z.string().trim().max(80).optional(),
    proofImage: safeImageUrlSchema.optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "REJECTED" && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Please provide a reason when rejecting a return request",
      });
    }
  });
