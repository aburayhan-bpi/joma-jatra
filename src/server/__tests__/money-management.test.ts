import { describe, expect, it } from "vitest";
import { AppError } from "../core/app-error";
import { updateSelfProfileSchema } from "../modules/auth/auth.validation";
import { createDepositSchema, reviewDepositSchema } from "../modules/deposits/deposit.validation";
import {
  changeMemberRoleSchema,
  createMemberSchema,
  deactivateMemberSchema,
} from "../modules/members/member.validation";
import { upsertMonthlyTargetSchema } from "../modules/monthly-targets/monthly-target.validation";
import { updatePaymentAccountSchema } from "../modules/payment-accounts/payment-account.validation";
import { createTransferSchema } from "../modules/transfers/account-transfer.validation";
import {
  computeFundReconciliation,
  computeSingleAccountBalance,
} from "../shared/accounting.service";
import { makeReceiptRef } from "../shared/email-templates";
import {
  formatYearMonth,
  normalizeTrxId,
  resolveTransactionDate,
  roundMoney,
} from "../shared/normalize";
import {
  buildPaginationMeta,
  buildSearchFilter,
  escapeRegex,
  parsePaginationQuery,
} from "../shared/pagination";
import { checkRateLimit, clearRateLimitStore } from "../shared/rate-limit";
import { safeImageUrlSchema } from "../shared/validation-helpers";

describe("Accounting Reconciliation & Account Balance Math", () => {
  it("computes single account balance accurately across deposits, returns, transfers, and charges", () => {
    const bkashBalance = computeSingleAccountBalance({
      totalInDeposits: 25000,
      totalOutReturns: 3000,
      totalTransferIn: 2000,
      totalTransferOut: 10000,
      totalTransferFees: 185,
      totalStandaloneCharges: 15,
    });

    // 25000 + 2000 - 3000 - 10000 - 185 - 15 = 13800
    expect(bkashBalance).toBe(13800);
  });

  it("reconciles group fund with zero discrepancy when account sums match cash in hand", () => {
    const result = computeFundReconciliation({
      totalApprovedDeposits: 50000,
      totalApprovedPayoutReturns: 4000,
      totalTransferFees: 185,
      totalStandaloneCharges: 15,
      unsettledFormerMemberPayable: 4500,
      accountBalancesSum: 45800, // 50000 - 4000 - 200
    });

    expect(result.totalCharges).toBe(200);
    expect(result.totalCashInHand).toBe(45800);
    expect(result.activeNetFund).toBe(41300);
    expect(result.reconciliationDifference).toBe(0);
  });
});

describe("Normalization & Pagination Helpers", () => {
  it("normalizes TrxID cleanly", () => {
    expect(normalizeTrxId("  bks9x2k1  ")).toBe("BKS9X2K1");
    expect(normalizeTrxId("   ")).toBeUndefined();
    expect(normalizeTrxId(null)).toBeUndefined();
  });

  it("formats YYYY-MM in Asia/Dhaka (UTC+6) and resolves date-only inputs safely", () => {
    expect(formatYearMonth(new Date("2026-11-23T00:00:00Z"))).toBe("2026-11");
    // 2026-11-30 19:30 UTC === 2026-12-01 01:30 AM BDT -> must group into December!
    expect(formatYearMonth(new Date("2026-11-30T19:30:00Z"))).toBe("2026-12");
    expect(roundMoney(100.1 + 200.2)).toBe(300.3);

    // Backdated date-only input (UTC midnight) pins to midday BDT (06:00 UTC), never 6:00 AM BDT
    const backdated = resolveTransactionDate(new Date("2025-05-10T00:00:00.000Z"));
    expect(backdated.toISOString()).toBe("2025-05-10T06:00:00.000Z");
  });

  it("parses URL pagination query safely and caps excessive limits", () => {
    const req = new Request(
      "http://localhost:3000/api/v1/deposits?page=2&limit=500&search=rahim",
    );
    const parsed = parsePaginationQuery(req);

    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(100);
    expect(parsed.skip).toBe(100);
    expect(parsed.search).toBe("rahim");

    expect(buildPaginationMeta(55, 2, 25)).toEqual({
      page: 2,
      limit: 25,
      total: 55,
      totalPage: 3,
    });
  });

  it("escapes regex special characters in search queries", () => {
    expect(escapeRegex("a+b(c)?")).toBe("a\\+b\\(c\\)\\?");
    const filter = buildSearchFilter("test.*", ["name", "trxId"]);
    expect(filter).toHaveProperty("$or");
  });
});

describe("Domain Zod Validations", () => {
  it("requires paymentAccountId when action is SETTLE_AND_CLOSE", () => {
    const invalid = deactivateMemberSchema.safeParse({
      action: "SETTLE_AND_CLOSE",
    });
    expect(invalid.success).toBe(false);

    const valid = deactivateMemberSchema.safeParse({
      action: "SETTLE_AND_CLOSE",
      paymentAccountId: "65f1a2b3c4d5e6f7a8b9c0d1",
      trxId: "TRX999",
    });
    expect(valid.success).toBe(true);
  });

  it("requires rejectionReason when rejecting a deposit", () => {
    const invalid = reviewDepositSchema.safeParse({ status: "REJECTED" });
    expect(invalid.success).toBe(false);

    const valid = reviewDepositSchema.safeParse({
      status: "REJECTED",
      rejectionReason: "TrxID not received in bKash",
    });
    expect(valid.success).toBe(true);
  });

  it("prevents transferring from and to the same payment account", () => {
    const sameAccount = createTransferSchema.safeParse({
      fromAccountId: "acc1",
      toAccountId: "acc1",
      amount: 1000,
    });
    expect(sameAccount.success).toBe(false);

    const validTransfer = createTransferSchema.safeParse({
      fromAccountId: "acc1",
      toAccountId: "acc2",
      amount: 10000,
      transferFee: 185,
    });
    expect(validTransfer.success).toBe(true);
  });

  it("validates YYYY-MM format on monthly targets and flexible deposits", () => {
    expect(
      upsertMonthlyTargetSchema.safeParse({
        month: "2026-13",
        targetAmount: 15000,
      }).success,
    ).toBe(false);

    expect(
      createDepositSchema.safeParse({
        amount: 500,
        month: "2026-11",
        paymentAccountId: "65f1a2b3c4d5e6f7a8b9c0d1",
      }).success,
    ).toBe(true);
  });

  it("enforces single-admin creation rule and validates admin transfer next role", () => {
    expect(
      createMemberSchema.safeParse({
        name: "Second Admin",
        email: "second@example.com",
        password: "password123",
        role: "ADMIN",
      }).success,
    ).toBe(false);

    expect(
      changeMemberRoleSchema.safeParse({
        role: "ADMIN",
        previousAdminNextRole: "MEMBER",
      }).success,
    ).toBe(true);
  });

  it("validates private personalMonthlyGoal in self profile update", () => {
    expect(
      updateSelfProfileSchema.safeParse({ personalMonthlyGoal: 2000 }).success,
    ).toBe(true);
    expect(
      updateSelfProfileSchema.safeParse({ personalMonthlyGoal: 0 }).success,
    ).toBe(true);
    expect(
      updateSelfProfileSchema.safeParse({ personalMonthlyGoal: -500 }).success,
    ).toBe(false);
  });

  it("blocks unsafe image URL schemes and enforces min ৳1 rounded monetary amounts", () => {
    expect(safeImageUrlSchema.safeParse("").success).toBe(true);
    expect(
      safeImageUrlSchema.safeParse(
        "https://res.cloudinary.com/demo/image/upload/v1/slip.png",
      ).success,
    ).toBe(true);
    expect(safeImageUrlSchema.safeParse("/icons/icon-192x192.png").success).toBe(
      true,
    );
    expect(safeImageUrlSchema.safeParse("javascript:alert(1)").success).toBe(
      false,
    );
    expect(
      safeImageUrlSchema.safeParse("data:text/html,<script>alert(1)</script>")
        .success,
    ).toBe(false);
    expect(safeImageUrlSchema.safeParse("//evil.example/a.png").success).toBe(
      false,
    );

    expect(
      createDepositSchema.safeParse({
        amount: 0.5,
        paymentAccountId: "65f1a2b3c4d5e6f7a8b9c0d1",
      }).success,
    ).toBe(false);

    const rounded = createDepositSchema.parse({
      amount: 100.126,
      paymentAccountId: "65f1a2b3c4d5e6f7a8b9c0d1",
    });
    expect(rounded.amount).toBe(100.13);
  });

  it("enforces in-memory rate limiting and formats receipt refs in Asia/Dhaka", () => {
    clearRateLimitStore();
    const opts = { namespace: "test:login", max: 2, windowMs: 60_000 };
    expect(checkRateLimit("127.0.0.1", opts).remaining).toBe(1);
    expect(checkRateLimit("127.0.0.1", opts).remaining).toBe(0);
    expect(() => checkRateLimit("127.0.0.1", opts)).toThrow(AppError);
    clearRateLimitStore();

    // 2026-11-30 19:30 UTC === 2026-12-01 01:30 AM BDT
    expect(makeReceiptRef("JJ", new Date("2026-11-30T19:30:00Z"))).toBe(
      "JJ-20261201",
    );
    expect(
      makeReceiptRef("JJ", new Date("2026-11-30T19:30:00Z"), "bks987654"),
    ).toBe("JJ-987654");
  });

  it("does not inject default fields when partially updating a payment account (Zod 4 regression)", () => {
    const toggleOnly = updatePaymentAccountSchema.parse({ isActive: false });
    expect(toggleOnly).toEqual({ isActive: false });

    const renameOnly = updatePaymentAccountSchema.parse({
      accountName: "Updated Group bKash",
    });
    expect(renameOnly).toEqual({ accountName: "Updated Group bKash" });
    expect("isActive" in renameOnly).toBe(false);
    expect("bankName" in renameOnly).toBe(false);
    expect("accountType" in renameOnly).toBe(false);
  });

  it("allows custom high pagination cap for statement exports while bounding oversized limits", () => {
    const exportReq = new Request(
      "http://localhost:3000/api/v1/members/123/audit-trail?page=1&limit=1000",
    );
    expect(parsePaginationQuery(exportReq, 25, 1000).limit).toBe(1000);

    const abusiveReq = new Request(
      "http://localhost:3000/api/v1/members/123/audit-trail?page=1&limit=99999",
    );
    expect(parsePaginationQuery(abusiveReq, 25, 1000).limit).toBe(1000);
  });
});
