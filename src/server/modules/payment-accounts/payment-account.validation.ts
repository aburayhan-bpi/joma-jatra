import { PAYMENT_ACCOUNT_TYPES, PAYMENT_METHODS } from "@/types/backend";
import { z } from "zod";

export const createPaymentAccountSchema = z.object({
  method: z.enum(PAYMENT_METHODS),
  accountName: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters")
    .max(120),
  accountNumber: z
    .string()
    .trim()
    .min(2, "Account number or cash label is required")
    .max(60),
  accountType: z.enum(PAYMENT_ACCOUNT_TYPES).optional().default("PERSONAL"),
  bankName: z.string().trim().max(100).optional().default(""),
  branchName: z.string().trim().max(100).optional().default(""),
  routingNumber: z.string().trim().max(40).optional().default(""),
  note: z.string().trim().max(300).optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export const updatePaymentAccountSchema = createPaymentAccountSchema.partial();
