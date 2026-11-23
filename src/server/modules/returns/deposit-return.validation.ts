import { PAYMENT_METHODS, RETURN_TYPES } from "@/types/backend";
import { z } from "zod";

export const createReturnSchema = z.object({
  memberId: z.string().trim().optional(), // Admin/Cashier can specify (including inactive members for post-close settlement)
  amount: z.number().positive("Return amount must be greater than 0").max(100000000),
  returnDate: z.coerce.date().optional(),
  paymentAccountId: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  recipientAccount: z.string().trim().max(120).optional().default(""),
  trxId: z.string().trim().max(80).optional(),
  proofImage: z.string().trim().optional().default(""),
  reason: z.string().trim().max(400).optional().default(""),
  returnType: z.enum(RETURN_TYPES).optional().default("PARTIAL"),
});

export const updateReturnSchema = z.object({
  amount: z.number().positive("Return amount must be greater than 0").max(100000000).optional(),
  recipientAccount: z.string().trim().max(120).optional(),
  reason: z.string().trim().max(400).optional(),
  paymentAccountId: z.string().trim().optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  trxId: z.string().trim().max(80).optional(),
  proofImage: z.string().trim().optional(),
});

export const reviewReturnSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().trim().max(300).optional(),
    paymentAccountId: z.string().trim().optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    trxId: z.string().trim().max(80).optional(),
    proofImage: z.string().trim().optional(),
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
