import { TRANSFER_FEE_BEARER_TYPES } from "@/types/backend";
import { z } from "zod";
import {
  moneyAmountSchema,
  safeImageUrlSchema,
} from "../../shared/validation-helpers";

export const createTransferSchema = z
  .object({
    fromAccountId: z.string().trim().min(1, "Source payment account is required"),
    toAccountId: z
      .string()
      .trim()
      .min(1, "Destination payment account is required"),
    amount: moneyAmountSchema("Transfer amount"),
    transferFee: z
      .number()
      .min(0, "Transfer fee cannot be negative")
      .max(10000000)
      .optional()
      .default(0),
    feeBearerType: z
      .enum(TRANSFER_FEE_BEARER_TYPES)
      .optional()
      .default("SHARED_PRO_RATA"),
    feeBearerMemberId: z.string().trim().optional(),
    transferDate: z.coerce.date().optional(),
    trxId: z.string().trim().max(80).optional(),
    proofImage: safeImageUrlSchema.optional().default(""),
    note: z.string().trim().max(400).optional().default(""),
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    message: "Source and destination payment accounts must be different",
    path: ["toAccountId"],
  })
  .refine(
    (data) =>
      !(
        (data.transferFee || 0) > 0 &&
        data.feeBearerType === "SPECIFIC_MEMBER" &&
        !data.feeBearerMemberId
      ),
    {
      message: "Please select the member who bears this transfer fee",
      path: ["feeBearerMemberId"],
    },
  );
