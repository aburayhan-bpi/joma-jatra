import { z } from "zod";
import {
  moneyAmountSchema,
  safeImageUrlSchema,
} from "../../shared/validation-helpers";

export const createChargeSchema = z.object({
  paymentAccountId: z
    .string()
    .trim()
    .min(1, "Please select the charged payment account"),
  amount: moneyAmountSchema("Charge amount", 10000000),
  title: z
    .string()
    .trim()
    .min(2, "Charge title must be at least 2 characters")
    .max(140),
  chargeDate: z.coerce.date().optional(),
  proofImage: safeImageUrlSchema.optional().default(""),
  note: z.string().trim().max(400).optional().default(""),
});
