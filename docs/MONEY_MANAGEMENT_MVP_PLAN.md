# JomaJatra (জমা যাত্রা) — Pure Money Management MVP Plan

> **Scope Rule (Strict):** Phase 1 / MVP is **100% Pure Money Management ONLY**.
> Tour destination voting, hotels, food, transport, itinerary, and post-tour split settlements are strictly deferred to **Phase 2**.

---

## 1. Completed Foundation (Theme & Typography)
- **Light Theme Palette** (`src/app/globals.css`):
  - Primary Forest Emerald: `#046c4e` (`--primary`, `--brand`), Dark: `#024f38`, Light: `#148065`
  - Secondary Sun & Coin Gold: `#fc9607` (`--gold`), Highlight: `#ffcb3d`
  - Success Fresh Leaf Green: `#229943`, Error: `#dc3545`
  - Light Mint-Ivory Canvas: `#f6faf7` (`--background`), Dashboard Canvas: `#eff5f1` (`--dashboard-bg`), Pure White Cards: `#ffffff`
  - Deep Forest Ink: `#072a1f` (`--foreground`)
- **Typography** (`src/app/layout.tsx` & `src/app/globals.css`):
  - English & Numbers: `Plus Jakarta Sans` (variable font via `next/font/google`)
  - Bangla: `Hind Siliguri` (`400, 500, 600, 700`)
  - Monospace / Codes: `JetBrains Mono` (variable font via `next/font/google`)
  - Currency Alignment Utility: `.font-money` (`font-variant-numeric: tabular-nums`)

---

## 2. Enterprise Backend Architecture (`src/server/` + Thin `src/app/api/v1/`)
Clean 4-layer separation of concerns:
`route.ts (HTTP + Auth + Zod)` → `*.service.ts (Business Logic)` → `accounting.service.ts (Balance Math)` → `*.model.ts (MongoDB)`

- **Core Infrastructure (`src/server/core/`):**
  - `env.ts` — Lazy Zod-validated environment configuration
  - `db.ts` — Cached MongoDB Mongoose singleton
  - `app-error.ts` — Typed `AppError` (400/401/403/404/409)
  - `api-response.ts` — Strict `IBaseResponse`: `{ success, statusCode, message, meta, data }`
  - `route-handler.ts` — Central error handler (`AppError`, `ZodError`, Mongoose `ValidationError`/`CastError`/`11000`, JWT errors)
  - `auth-guard.ts` — JWT verification + live DB active-status check + RBAC guard
- **Shared Services (`src/server/shared/`):**
  - `accounting.service.ts` — Single Source of Truth for Member Net Balance, Payment Account Balance, Cash in Hand, Unsettled Payable, and Active Net Fund
  - `pagination.ts` — Safe URL-based pagination (`?page=&limit=&search=...`) with escaped regex search
  - `cloudinary.ts` — Receipt/proof screenshot upload & delete helper
  - `email.ts` — Nodemailer helper (with dev fallback logging if SMTP is not configured)
- **Domain Modules (`src/server/modules/`):**
  - `auth`, `members`, `payment-accounts`, `monthly-targets`, `deposits`, `returns`, `transfers`, `charges`, `activity-logs`, `dashboard`
- **Postman Collection:** `postman/joma-jatra.postman_collection.json`
- **Verification:** Vitest unit tests + `pnpm check` (`eslint --max-warnings 0`, `tsc --noEmit`, `next build`)

---

## 3. 3-Role RBAC (`ADMIN` | `CASHIER` | `MEMBER`)
1. **`ADMIN` (Full Control):**
   - Add, edit, close/deactivate, settle, soft-delete, and restore members.
   - Promote/demote any `MEMBER` ↔ `CASHIER` (1-click, logged to Activity Log).
   - Full access to Payment Accounts, Monthly Targets, Deposits, Returns, Transfers, Charges, Trash/Restore, Dashboard, Audit Logs, and Exports.
   - Can approve all pending requests (including Cashier's own requests).
2. **`CASHIER` (Appointed Money Manager):**
   - Approve/reject **other members'** Deposit & Return requests; add manual entries (auto-approved for other members).
   - Own Deposit or Return submissions remain **`PENDING`** for `ADMIN` approval (anti-self-approval transparency rule).
   - Manage Payment Accounts, Monthly Targets, Internal Transfers, and Account Charges.
   - Cannot add/close/restore members, change roles, or restore Trash items.
3. **`MEMBER` (Friends):**
   - Transparent read access to Group Dashboard, Monthly Matrix, Payment Accounts (1-click Copy), Global Activity Log, and Statement Export.
   - View personal "My Savings" summary and own Member Details / Audit Trail.
   - Submit flexible Deposit & Return requests (`PENDING` until Admin/Cashier approves), edit/cancel own `PENDING` requests (locked once `APPROVED`).

---

## 4. Approval Rules (`entrySource`)
- **`MEMBER` submits Deposit / Return:** Always starts as `PENDING` (`entrySource: MEMBER_REQUEST`) — requires `ADMIN` or `CASHIER` approval.
- **`ADMIN` enters manually:** Directly `APPROVED` (`entrySource: ADMIN_MANUAL`, `reviewedBy: adminId`, `reviewedAt: now`).
- **`CASHIER` enters manually for another member:** Directly `APPROVED` (`entrySource: CASHIER_MANUAL`, `reviewedBy: cashierId`, `reviewedAt: now`).
- **`CASHIER` enters for themselves:** Starts as `PENDING` (`entrySource: MEMBER_REQUEST`) — requires `ADMIN` approval.

---

## 5. Exact Accounting & Reconciliation Formulas
All balances are computed dynamically from approved, non-deleted records:

- **Member Approved Deposits** = Sum of `Deposit.amount` (`status = APPROVED`, `isDeleted = false`)
- **Member Approved Returns** = Sum of `DepositReturn.amount` (`status = APPROVED`, `isDeleted = false`)
- **Member Net Balance** = `Member Approved Deposits - Member Approved Returns`
- **Payment Account Balance** (per account — `CASH`, `BKASH`, `NAGAD`, `ROCKET`, `UPAY`, `CELLFIN`, `BANK_TRANSFER`):
  - `+ Approved Deposits into account`
  - `- Approved Cash/MFS/Bank Returns from account` (excludes `DONATED_WAIVER`)
  - `+ Internal Transfers into account (amount)`
  - `- Internal Transfers out of account (amount + transferFee)`
  - `- Standalone Charges from account`
- **Group Total Cash in Hand** = `Total Approved Deposits - Total Approved Payout Returns - Total Charges (Transfer Fees + Standalone Charges)`
  - *Invariant:* `Total Cash in Hand === Sum of all Payment Account Balances`
- **Unsettled Former Member Payable** = Sum of `Member Net Balance` for all `INACTIVE` / closed members with `netBalance > 0`
- **Active Net Fund** = `Total Cash in Hand - Unsettled Former Member Payable`

---

## 6. Member Close / Deactivate (2 Cases + Safety Guard)
- **Safety Guard:** Block closing if member has any `PENDING` deposit or return requests.
- **If `netBalance === 0`:** Direct 1-click Close (`status: INACTIVE`, `isDeleted: true`, `leftAt: now`).
- **If `netBalance > 0`:**
  1. **Case 1 — `SETTLE_AND_CLOSE` (Atomic):** Re-calculates exact `netBalance`, verifies Payment Account balance, creates an `APPROVED` `DepositReturn` (`returnType: FULL_SETTLEMENT`, optional TrxID & proof screenshot), sets `netBalance = 0`, and marks member `INACTIVE` (`isDeleted: true`, `leftAt: now`).
  2. **Case 2 — `DEACTIVATE_ONLY` (Keep Balance / Unsettled):** Marks member `INACTIVE` (`isDeleted: true`, `leftAt: now`, `leaveNote`), retains balance in Cash in Hand flagged as `Unsettled Payable`. Admin can settle partially/fully later (or record `DONATED_WAIVER`), or **Restore / Reactivate** member anytime with balance intact.
  3. **Optional — `DONATE_AND_CLOSE`:** Records `DONATED_WAIVER` return (leaves cash inside Active Net Fund, zeroes member balance) and marks member `INACTIVE`.

---

## 7. Serial Backend Implementation Progress
- [x] Theme, Colors & Bangla/English Typography
- [x] **Step 1:** Plan Doc, `.env.example`, `src/types/backend.ts`, `src/server/core/*`, `src/server/shared/*`
- [x] **Step 2:** All 8 Mongoose Models + `activity-log.service.ts` + `accounting.service.ts` + `auth-guard.ts`
- [x] **Step 3:** Auth APIs (`/api/v1/auth/*`) + `bootstrap-admin`
- [x] **Step 4:** Members APIs (`/api/v1/members/*`, Role toggle, Close/Settle, Restore, Member Details Audit Trail)
- [x] **Step 5:** Payment Accounts, Monthly Targets & Cloudinary Upload APIs
- [x] **Step 6:** Deposits & Returns APIs (Duplicate TrxID check, Balance checks, Review w/ anti-self-approval, Soft Delete & Restore)
- [x] **Step 7:** Internal Transfers (w/ optional fee), Standalone Charges, Global Activity Log & Role-Based Dashboard / Monthly Matrix APIs
- [x] **Step 8:** Postman Collection JSON, Vitest Unit Tests & `pnpm check`
- [x] **Frontend Track:** Centralized `src/types/global.ts`, Redux RTK Query APIs, `src/proxy.ts` Route Protection, All 8 Dashboard UI Pages, Reusable `ProofPreviewModal` & `ProofUploadField`, Strict 3-Role RBAC Sync, Excel/PDF Exports & `pnpm check`
