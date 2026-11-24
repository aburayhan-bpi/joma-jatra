# JomaJatra (জমা যাত্রা) — Pure Money Management MVP (Phase 1 Completed)

> **Status:** **Phase 1 / MVP Complete** (Live: `https://joma-jatra.vercel.app`)
> **Scope Rule (Strict):** Phase 1 / MVP is **100% Pure Money Management ONLY**.
> Tour destination voting, hotels, food, transport, itinerary, and post-tour split settlements are deferred to **Phase 2**.

---

## 1. Brand Theme, Typography & PWA
- **Light Theme Palette** (`src/app/globals.css`, `--radius: 6px`):
  - Primary Forest Emerald: `#046c4e` (`--primary`, `--brand`), Dark: `#024f38`, Light: `#148065`
  - Secondary Sun & Coin Gold: `#fc9607` (`--gold`), Gold Dark accent for readable figures
  - Success Fresh Leaf Green: `#229943`, Error: `#dc3545`
  - Light Mint-Ivory Canvas: `#f6faf7` (`--background`), Dashboard Canvas: `#eff5f1` (`--dashboard-bg`), Pure White Cards: `#ffffff`
  - Deep Forest Ink: `#072a1f` (`--foreground`)
- **Typography** (`src/app/layout.tsx` & `src/app/globals.css`):
  - English & Numbers: `Plus Jakarta Sans` (variable font via `next/font/google`)
  - Bangla: `Hind Siliguri` (`400, 500, 600, 700`)
  - Monospace / Codes: `JetBrains Mono` (variable font via `next/font/google`)
  - Currency Alignment Utility: `.font-money` (`font-variant-numeric: tabular-nums`)
- **Installable PWA Support:**
  - App Router Web Manifest (`src/app/manifest.ts` → `/manifest.webmanifest`)
  - Generated icons (`public/icons/icon-192x192.png`, `icon-512x512.png`, `apple-touch-icon.png`)
  - Financial-safe Service Worker (`public/sw.js` + `PwaRegister.tsx` — never caches `/api/*`, network-first navigation with offline fallback)
  - 1-click **Install App** button in dashboard header when supported by the browser

---

## 2. Enterprise Backend Architecture (`src/server/` + Thin `src/app/api/v1/`)
Clean 4-layer separation of concerns across **40 API route files (57 endpoints)**:
`route.ts (HTTP + Auth + Zod)` → `*.service.ts (Business Logic)` → `accounting.service.ts (Balance Math)` → `*.model.ts (MongoDB)`

- **Core Infrastructure (`src/server/core/`):**
  - `env.ts` — Lazy environment configuration with runtime safety checks
  - `db.ts` — Cached MongoDB Mongoose singleton
  - `app-error.ts` — Typed `AppError` (400/401/403/404/409)
  - `api-response.ts` — Strict `IBaseResponse`: `{ success, statusCode, message, meta, data }`
  - `route-handler.ts` — Centralized `withErrorHandler` (`AppError`, `ZodError`, Mongoose `ValidationError`/`CastError`/`11000`, JWT errors)
  - `auth-guard.ts` — JWT verification + live DB active-status check + strict RBAC guard
- **Shared Services (`src/server/shared/`):**
  - `accounting.service.ts` — Single Source of Truth for Member Net Balance, Payment Account Balance, Cash in Hand, Unsettled Payable, and Active Net Fund
  - `normalize.ts` — `Asia/Dhaka` (UTC+6) month grouping (`formatYearMonth`), date-only picker resolution (`resolveTransactionDate`), `normalizeTrxId`, `roundMoney`, `toObjectId`
  - `pagination.ts` — Safe URL-based pagination (`?page=&limit=&search=...`, capped `maxLimit: 100`) with escaped regex search
  - `cloudinary.ts` — Proof & avatar upload helper with folder allowlist (`proofs`, `avatars`, `returns`, `transfers`, `charges`)
  - `email.ts` & `email-templates.ts` — Nodemailer SMTP (`safeSendEmail`) + **5 distinct transactional templates** (OTP, Welcome Invite, Deposit/Return Receipt Voucher, Rejection Notice, Role/Admin Transfer) with hosted logo & dynamic localhost-proof URL resolution
- **Domain Modules (`src/server/modules/`):**
  - `auth`, `members`, `payment-accounts`, `monthly-targets`, `deposits`, `returns`, `transfers`, `charges`, `activity-logs`, `dashboard`
- **Postman Collection:** `postman/joma-jatra.postman_collection.json` (all 57 endpoints synced with response examples)
- **Verification:** Vitest unit test suite (**12/12 passing**) + `pnpm check` (`eslint . --max-warnings 0`, `tsc --noEmit`, `next build` — 43/43 routes)

---

## 3. Strictly 1 Active Admin & 3-Role RBAC (`ADMIN` | `CASHIER` | `MEMBER`)
1. **`ADMIN` (Strictly 1 Active Admin — Full Control):**
   - Cannot create a second Admin; supports **Atomic Admin Transfer** (`ChangeRoleModal` + `PATCH /api/v1/members/[id]/role`) where the outgoing Admin steps down to `CASHIER` (recommended) or `MEMBER`.
   - Restoring a soft-deleted former Admin automatically normalizes them to `MEMBER` if another active Admin exists.
   - Add, edit, close/deactivate, settle, soft-delete, and restore members.
   - Promote/demote `MEMBER` ↔ `CASHIER`, approve all pending requests (including Cashier's own), edit/delete/restore ledger records.
2. **`CASHIER` (Appointed Money Manager):**
   - Approve/reject **other members'** Deposit & Return requests; add manual entries (auto-approved for other members) and settle former members' unsettled balances.
   - Own Deposit or Return submissions remain **`PENDING`** for `ADMIN` approval (anti-self-approval rule).
   - Manage Payment Accounts, Group Monthly Targets, Internal Transfers, and Account Charges.
   - Cannot add/close/restore members, change roles, edit others' deposits, or restore Trash items.
3. **`MEMBER` (Friends):**
   - Transparent read access to Group Dashboard, 12-Month Yearly Sheet, Payment Accounts (1-click Copy), Global Activity Log, Member Audit Trail, and Excel/PDF Exports.
   - View personal "My Savings" summary and set an optional **Private Personal Monthly Goal** (`select: false` — visible only to themselves, never exposed to other members or Activity Logs).
   - Submit flexible Deposit & Return requests (`PENDING` until Admin/Cashier approves), edit/cancel own `PENDING` requests (locked once `APPROVED`).

---

## 4. Approval Rules (`entrySource`) & Integrity Guards
- **`MEMBER` submits Deposit / Return:** Always `PENDING` (`entrySource: MEMBER_REQUEST`) — requires `ADMIN` or `CASHIER` approval.
- **`ADMIN` enters manually:** Directly `APPROVED` (`entrySource: ADMIN_MANUAL`, `reviewedBy: adminId`, `reviewedAt: now`).
- **`CASHIER` enters manually for another member:** Directly `APPROVED` (`entrySource: CASHIER_MANUAL`, `reviewedBy: cashierId`, `reviewedAt: now`).
- **`CASHIER` enters for themselves:** `PENDING` (`entrySource: MEMBER_REQUEST`) — requires `ADMIN` approval.
- **Security & Data Integrity Guards:**
  - Single-use forgot-password reset token (`resetOtp` verified & cleared on use).
  - Duplicate TrxID prevention across active `PENDING`/`APPROVED` deposits.
  - Payment account method cannot change once transactions exist; accounts cannot be deleted while balance `≠ 0` or pending transactions exist.
  - Inactive (non-deleted) accounts remain selectable for outgoing payouts, transfers, and charges so held funds are never trapped.
  - `httpOnly` refresh token cookie auto-refresh + full RTK Query cache reset (`resetApiState`) on logout.

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
  1. **Case 1 — `SETTLE_AND_CLOSE` (Atomic):** Re-calculates exact `netBalance`, verifies Payment Account balance, creates an `APPROVED` `DepositReturn` (`returnType: FULL_SETTLEMENT`, optional TrxID & proof screenshot), zeroes `netBalance`, sends settlement voucher email, and marks member `INACTIVE`.
  2. **Case 2 — `DEACTIVATE_ONLY` (Keep Balance / Unsettled):** Marks member `INACTIVE` (`isDeleted: true`, `leftAt: now`, `leaveNote`), retains balance in Cash in Hand flagged as `Unsettled Payable`. Admin/Cashier can settle partially/fully later (or record `DONATED_WAIVER`), or Admin can **Restore / Reactivate** member anytime with full history intact.
  3. **Optional — `DONATE_AND_CLOSE`:** Records `DONATED_WAIVER` return (keeps cash in Active Net Fund, zeroes member balance) and marks member `INACTIVE`.

---

## 7. Completed Phase 1 Checklist
- [x] Theme, Colors (`--radius: 6px`), Eye-Cold Stat Cards & Bangla/English Typography
- [x] **Backend Core & Models:** All 8 Mongoose Models, `accounting.service.ts`, `auth-guard.ts`, `Asia/Dhaka` timezone normalization
- [x] **Auth & Security:** Bootstrap Admin, Login, Auto-Refresh JWT, Single-Use Forgot-Password OTP Flow, Temporary Password Banner
- [x] **Members & Governance:** Add/Edit/Close/Restore, Strictly 1 Active Admin + Atomic Admin Transfer, Member Audit Trail + Profile Photos
- [x] **Deposits, Returns & Accounts:** Flexible Deposits, Returns/Settlements (incl. former members), Multi-Method Accounts, Internal Transfers w/ Fees, Standalone Charges, Trash & Restore
- [x] **Goals & Analytics:** Role-Aware Overview, 12-Month Yearly Savings Register (`Jan–Dec`), Group Monthly Targets, Private Personal Monthly Goal (`select: false`), Excel/PDF Statement Exports
- [x] **Transactional Emails:** 5 distinct templates with hosted logo & dynamic localhost-proof URLs
- [x] **UX & Mobile:** Y-axis scrollable modals (`100dvh`), URL Pagination & synced SearchBar, Installable PWA (`/manifest.webmanifest` + `sw.js` + icons)
- [x] **Quality Gates:** Postman Collection (57 endpoints), Vitest (**12/12 passing**), `pnpm check` (**0 warnings, 0 errors**)

---

## 8. Pre-Launch Cleanup & Phase 2 Roadmap
- **Before Real-Money Production Launch (Wait for Admin Confirmation):**
  - [ ] Remove temporary Admin testing utility: `POST /api/v1/admin/reset-test-data`, `ResetTestDataModal.tsx`, and the `Reset Test DB` button in `OverviewPage.tsx` (currently kept active for testing per user request).
- **Phase 2 (Deferred — Future Features):**
  - [ ] Tour Destination Voting & Poll Management
  - [ ] Tour Expense Tracking (Hotel, Transport, Food, Activities)
  - [ ] Post-Tour Per-Member Split Settlement & Final Refund Calculation
  - [ ] Optional: Admin/Cashier Pending Request Email Alerts & Single Deposit Printable Receipt PDF
