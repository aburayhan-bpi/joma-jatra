import { z } from "zod";

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().trim().min(1, "Source payment account is required"),
    toAccountId: z
      .string()
      .trim()
      .min(1, "Destination payment account is required"),
    amount: z
      .number()
      .positive("Transfer amount must be greater than 0")
      .max(100000000),
    transferFee: z
      .number()
      .min(0, "Transfer fee cannot be negative")
      .max(10000000)
      .optional()
      .default(0),
    transferDate: z.coerce.date().optional(),
    trxId: z.string().trim().max(80).optional(),
    proofImage: z.string().trim().optional().default(""),
    note: z.string().trim().max(400).optional().default(""),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination payment accounts must be different",
    path: ["toAccountId"],
  });
