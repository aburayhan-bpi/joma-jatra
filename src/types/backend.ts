/**
 * Centralized JomaJatra Backend Types & Enums
 * Pure Money Management MVP domain constants shared across models, validations, and APIs.
 */

/* ==========================================================================
   USER & RBAC MODULE
   ========================================================================== */

export const USER_ROLES = ["ADMIN", "CASHIER", "MEMBER"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ["ACTIVE", "INACTIVE"] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const DEFAULT_USER_ROLE: UserRole = "MEMBER";
export const DEFAULT_USER_STATUS: UserStatus = "ACTIVE";

export const MEMBER_DEACTIVATE_ACTIONS = [
  "SETTLE_AND_CLOSE",
  "DEACTIVATE_ONLY",
  "DONATE_AND_CLOSE",
] as const;
export type MemberDeactivateAction = (typeof MEMBER_DEACTIVATE_ACTIONS)[number];

/* ==========================================================================
   PAYMENT ACCOUNTS & LEGAL BD METHODS
   ========================================================================== */

export const PAYMENT_METHODS = [
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "UPAY",
  "CELLFIN",
  "BANK_TRANSFER",
] as const;
export type PaymentMethodType = (typeof PAYMENT_METHODS)[number];

export const PAYMENT_ACCOUNT_TYPES = [
  "CASH",
  "PERSONAL",
  "AGENT",
  "BANK",
] as const;
export type PaymentAccountType = (typeof PAYMENT_ACCOUNT_TYPES)[number];

/* ==========================================================================
   DEPOSITS & RETURNS MODULE
   ========================================================================== */

export const TRANSACTION_STATUSES = [
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const ENTRY_SOURCES = [
  "MEMBER_REQUEST",
  "ADMIN_MANUAL",
  "CASHIER_MANUAL",
] as const;
export type EntrySource = (typeof ENTRY_SOURCES)[number];

export const RETURN_TYPES = [
  "PARTIAL",
  "FULL_SETTLEMENT",
  "DONATED_WAIVER",
] as const;
export type ReturnType = (typeof RETURN_TYPES)[number];

/* ==========================================================================
   AUDIT / ACTIVITY LOG MODULE
   ========================================================================== */

export const ACTIVITY_ACTIONS = [
  "CREATED",
  "UPDATED",
  "APPROVED",
  "REJECTED",
  "DEACTIVATED",
  "SETTLED",
  "RESTORED",
  "DELETED",
  "ROLE_CHANGED",
  "LOGIN",
  "PASSWORD_CHANGED",
] as const;
export type ActivityAction = (typeof ACTIVITY_ACTIONS)[number];

export const ACTIVITY_ENTITIES = [
  "USER",
  "PAYMENT_ACCOUNT",
  "MONTHLY_TARGET",
  "DEPOSIT",
  "RETURN",
  "TRANSFER",
  "CHARGE",
  "AUTH",
] as const;
export type ActivityEntity = (typeof ACTIVITY_ENTITIES)[number];
