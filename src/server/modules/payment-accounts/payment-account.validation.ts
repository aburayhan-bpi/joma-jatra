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

// Explicit partial schema WITHOUT `.default(...)` so Zod 4 never overwrites omitted fields on partial PATCH
export const updatePaymentAccountSchema = z.object({
  method: z.enum(PAYMENT_METHODS).optional(),
  accountName: z
    .string()
    .trim()
    .min(2, "Account name must be at least 2 characters")
    .max(120)
    .optional(),
  accountNumber: z
    .string()
    .trim()
    .min(2, "Account number or cash label is required")
    .max(60)
    .optional(),
  accountType: z.enum(PAYMENT_ACCOUNT_TYPES).optional(),
  bankName: z.string().trim().max(100).optional(),
  branchName: z.string().trim().max(100).optional(),
  routingNumber: z.string().trim().max(40).optional(),
  note: z.string().trim().max(300).optional(),
  isActive: z.boolean().optional(),
});
