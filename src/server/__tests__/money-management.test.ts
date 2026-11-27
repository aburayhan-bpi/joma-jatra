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
import { createReturnSchema } from "../modules/returns/deposit-return.validation";
import { createTransferSchema } from "../modules/transfers/account-transfer.validation";
import {
  computeFundReconciliation,
  computePersonalGoalProgress,
  computeProRataChargeAllocations,
  computeReturnNetPayout,
  computeSingleAccountBalance,
  validateReturnPayoutFee,
} from "../shared/accounting.service";
import {
  buildChargeAllocationEmail,
  buildReturnReceiptEmail,
  makeReceiptRef,
} from "../shared/email-templates";
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

  it("caps personal monthly goal progress by verified netBalance after returns or waivers", () => {
    // Deposited 200 this month, returned/donated 200 -> netBalance is 0 -> goal progress must be 0
    expect(
      computePersonalGoalProgress({
        currentMonthDeposited: 200,
        netBalance: 0,
        personalMonthlyGoal: 700,
      }),
    ).toEqual({
      achievedAmount: 0,
      remainingAmount: 700,
      progressPercent: 0,
    });

    // Deposited 1450 this month, returned/donated 450 -> netBalance is 1000 -> goal capped at 1000 (100%)
    expect(
      computePersonalGoalProgress({
        currentMonthDeposited: 1450,
        netBalance: 1000,
        personalMonthlyGoal: 1000,
      }),
    ).toEqual({
      achievedAmount: 1000,
      remainingAmount: 0,
      progressPercent: 100,
    });

    // Existing 5000 balance + 700 deposited this month -> full 700 counts toward 700 goal
    expect(
      computePersonalGoalProgress({
        currentMonthDeposited: 700,
        netBalance: 5700,
        personalMonthlyGoal: 700,
      }),
    ).toEqual({
      achievedAmount: 700,
      remainingAmount: 0,
      progressPercent: 100,
    });
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

  it("deducts return & settlement payout fees safely without violating reconciliation or allowing invalid fees", () => {
    expect(computeReturnNetPayout(1000, 20)).toBe(980);
    expect(validateReturnPayoutFee(1000, 20, "FULL_SETTLEMENT")).toBeNull();
    expect(validateReturnPayoutFee(1000, 1000, "PARTIAL")).not.toBeNull();
    expect(validateReturnPayoutFee(1000, -5, "PARTIAL")).not.toBeNull();
    expect(validateReturnPayoutFee(1000, 10, "DONATED_WAIVER")).not.toBeNull();

    // Create return Zod rules
    expect(
      createReturnSchema.safeParse({
        amount: 1000,
        payoutFee: 20,
        returnType: "PARTIAL",
      }).success,
    ).toBe(true);
    expect(
      createReturnSchema.safeParse({
        amount: 500,
        payoutFee: 500,
        returnType: "PARTIAL",
      }).success,
    ).toBe(false);
    expect(
      createReturnSchema.safeParse({
        amount: 500,
        payoutFee: 10,
        returnType: "DONATED_WAIVER",
      }).success,
    ).toBe(false);

    // Deactivate settlement fee rules
    expect(
      deactivateMemberSchema.safeParse({
        action: "SETTLE_AND_CLOSE",
        paymentAccountId: "65f1a2b3c4d5e6f7a8b9c0d1",
        payoutFee: 20,
      }).success,
    ).toBe(true);
    expect(
      deactivateMemberSchema.safeParse({
        action: "DONATE_AND_CLOSE",
        payoutFee: 20,
      }).success,
    ).toBe(false);

    // Receipt email clearly separates Gross Settled, Payout Fee, and Net Disbursed
    const receipt = buildReturnReceiptEmail({
      memberName: "Karim",
      status: "APPROVED",
      amount: 1000,
      payoutFee: 20,
      returnType: "FULL_SETTLEMENT",
      returnDate: new Date("2026-11-26T06:00:00Z"),
      paymentAccountName: "Group bKash",
      paymentMethod: "BKASH",
      trxId: "RET999",
      reviewedByName: "Admin",
      newNetBalance: 0,
    });
    expect(receipt.text).toContain("Gross Settled: BDT 1,000");
    expect(receipt.text).toContain("Payout Fee (Deducted): BDT 20");
    expect(receipt.text).toContain("Net Disbursed: BDT 980");
  });

  it("allocates shared charges pro-rata with 2-decimal Largest Remainder precision and validates transfer fee bearers", () => {
    // 100 BDT split across 2000 & 1000 active balances (0-balance skipped) -> exact 66.67 + 33.33 = 100.00
    const split2 = computeProRataChargeAllocations(100, [
      { memberId: "m1", balance: 2000 },
      { memberId: "m2", balance: 1000 },
      { memberId: "m3", balance: 0 },
    ]);
    expect(split2).toHaveLength(2);
    expect(split2[0].allocatedAmount).toBe(66.67);
    expect(split2[1].allocatedAmount).toBe(33.33);
    expect(
      roundMoney(split2.reduce((sum, a) => sum + a.allocatedAmount, 0)),
    ).toBe(100);

    // 10 BDT split equally across 3 members -> 3.34 + 3.33 + 3.33 = 10.00
    const split3 = computeProRataChargeAllocations(10, [
      { memberId: "a", balance: 1000 },
      { memberId: "b", balance: 1000 },
      { memberId: "c", balance: 1000 },
    ]);
    expect(split3.map((a) => a.allocatedAmount).sort()).toEqual([
      3.33, 3.33, 3.34,
    ]);
    expect(
      roundMoney(split3.reduce((sum, a) => sum + a.allocatedAmount, 0)),
    ).toBe(10);

    // Returns empty when active pool cannot cover charge (protects donated reserve & former payable)
    expect(
      computeProRataChargeAllocations(500, [{ memberId: "m1", balance: 300 }]),
    ).toEqual([]);

    // Specific-member transfer fee Zod invariant
    expect(
      createTransferSchema.safeParse({
        fromAccountId: "acc1",
        toAccountId: "acc2",
        amount: 1000,
        transferFee: 30,
        feeBearerType: "SPECIFIC_MEMBER",
      }).success,
    ).toBe(false);
    expect(
      createTransferSchema.safeParse({
        fromAccountId: "acc1",
        toAccountId: "acc2",
        amount: 1000,
        transferFee: 30,
        feeBearerType: "SPECIFIC_MEMBER",
        feeBearerMemberId: "mem1",
      }).success,
    ).toBe(true);

    // Charge notice email formatting
    const notice = buildChargeAllocationEmail({
      memberName: "Rahim",
      sourceType: "ACCOUNT_CHARGE",
      allocationMode: "PRO_RATA_ACTIVE",
      title: "Bank SMS Fee",
      chargeDate: new Date("2026-11-27T06:00:00Z"),
      totalChargeAmount: 100,
      allocatedAmount: 66.67,
      sharePercent: 66.67,
      memberBalanceSnapshot: 2000,
      eligibleTotalSnapshot: 3000,
      recordedByName: "Admin",
      newNetBalance: 1933.33,
    });
    expect(notice.subject).toContain("66.67");
    expect(notice.text).toContain("Updated Net Balance: BDT 1,933.33");
  });

  it("handles extreme sub-taka balances, 100% drain pro-rata splits, negative-zero, and sub-taka settlements cleanly", () => {
    // 100% drain on tiny paisa balances (0.01, 0.02, 100.00): integer math keeps exact sums <= balance
    const drain = computeProRataChargeAllocations(100.03, [
      { memberId: "m1", balance: 0.01 },
      { memberId: "m2", balance: 0.02 },
      { memberId: "m3", balance: 100.0 },
    ]);
    expect(drain.find((d) => d.memberId === "m1")?.allocatedAmount).toBe(0.01);
    expect(drain.find((d) => d.memberId === "m2")?.allocatedAmount).toBe(0.02);
    expect(drain.find((d) => d.memberId === "m3")?.allocatedAmount).toBe(100);
    expect(
      roundMoney(drain.reduce((sum, a) => sum + a.allocatedAmount, 0)),
    ).toBe(100.03);

    // Sub-taka leftover balance settlement/return allowed down to 0.01 BDT
    expect(
      createReturnSchema.safeParse({
        amount: 0.55,
        payoutFee: 0,
        returnType: "FULL_SETTLEMENT",
      }).success,
    ).toBe(true);
    expect(
      createReturnSchema.safeParse({
        amount: 0.55,
        payoutFee: 0.55,
        returnType: "FULL_SETTLEMENT",
      }).success,
    ).toBe(false);

    // Negative zero normalization
    expect(Object.is(roundMoney(-0), -0)).toBe(false);
    expect(roundMoney(-0)).toBe(0);
  });
});
