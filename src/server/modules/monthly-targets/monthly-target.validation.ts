import { z } from "zod";

export const monthStringSchema = z
  .string()
  .trim()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, "Month must be in YYYY-MM format");

export const upsertMonthlyTargetSchema = z.object({
  month: monthStringSchema,
  targetAmount: z
    .number()
    .min(0, "Target amount cannot be negative")
    .max(1000000000),
  note: z.string().trim().max(300).optional().default(""),
});
