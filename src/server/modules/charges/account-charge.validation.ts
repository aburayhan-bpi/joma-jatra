import { z } from "zod";

export const createChargeSchema = z.object({
  paymentAccountId: z
    .string()
    .trim()
    .min(1, "Please select the charged payment account"),
  amount: z
    .number()
    .positive("Charge amount must be greater than 0")
    .max(10000000),
  title: z
    .string()
    .trim()
    .min(2, "Charge title must be at least 2 characters")
    .max(140),
  chargeDate: z.coerce.date().optional(),
  proofImage: z.string().trim().optional().default(""),
  note: z.string().trim().max(400).optional().default(""),
});
