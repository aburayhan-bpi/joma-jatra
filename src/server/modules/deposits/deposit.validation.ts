import { PAYMENT_METHODS } from "@/types/backend";
import { z } from "zod";
import {
  moneyAmountSchema,
  safeImageUrlSchema,
} from "../../shared/validation-helpers";
import { monthStringSchema } from "../monthly-targets/monthly-target.validation";

export const createDepositSchema = z.object({
  memberId: z.string().trim().optional(), // Admin/Cashier can specify memberId; Members always deposit for self
  amount: moneyAmountSchema("Deposit amount"),
  month: monthStringSchema.optional(),
  depositDate: z.coerce.date().optional(),
  paymentAccountId: z.string().trim().min(1, "Please select a payment account"),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  trxId: z.string().trim().max(80).optional(),
  proofImage: safeImageUrlSchema.optional().default(""),
  note: z.string().trim().max(400).optional().default(""),
});

export const updateDepositSchema = z.object({
  amount: moneyAmountSchema("Deposit amount").optional(),
  month: monthStringSchema.optional(),
  depositDate: z.coerce.date().optional(),
  paymentAccountId: z.string().trim().min(1).optional(),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  trxId: z.string().trim().max(80).optional(),
  proofImage: safeImageUrlSchema.optional(),
  note: z.string().trim().max(400).optional(),
  editReason: z.string().trim().max(250).optional(),
});

export const reviewDepositSchema = z
  .object({
    status: z.enum(["APPROVED", "REJECTED"]),
    rejectionReason: z.string().trim().max(300).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.status === "REJECTED" && !data.rejectionReason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["rejectionReason"],
        message: "Please provide a reason when rejecting a deposit",
      });
    }
  });
