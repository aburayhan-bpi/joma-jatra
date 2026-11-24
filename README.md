# JomaJatra (জমা যাত্রা) — Group Savings & Money Management Ledger

A transparent, role-aware **group savings ledger** built for friends saving together toward shared goals. Track flexible monthly deposits, payout proofs, multi-account cash balances (Cash, bKash, Nagad, Rocket, Upay, CellFin, Bank), internal transfers, account charges, member exits/settlements, and complete audit trails — all reconciled in real time.

- **Live App:** https://joma-jatra.vercel.app
- **Architecture & MVP Plan:** [docs/MONEY_MANAGEMENT_MVP_PLAN.md](docs/MONEY_MANAGEMENT_MVP_PLAN.md)
- **Postman Collection:** [postman/joma-jatra.postman_collection.json](postman/joma-jatra.postman_collection.json) (57 endpoints)

---

## Key Features (Phase 1 — Money Management MVP)

- **Strictly 1 Active Admin & 3-Role RBAC (`ADMIN` | `CASHIER` | `MEMBER`):**
  - Enforces exactly one active `ADMIN` at all times, with atomic **Admin Ownership Transfer** (outgoing Admin steps down to `CASHIER` or `MEMBER`).
  - Anti-self-approval rule: Cashiers can approve other members' entries, while their own deposits/returns require `ADMIN` approval.
- **Flexible Deposits & Returns:**
  - Members submit `PENDING` deposit/return requests with TrxID and Cloudinary proof screenshots; `ADMIN`/`CASHIER` review and approve/reject.
  - Duplicate TrxID detection, live double-balance validation (member net balance + source account balance), and soft-delete Trash & Restore.
- **Smart Member Exit & Post-Close Settlement:**
  - Close/deactivate members via `Settle & Close`, `Close & Settle Later (Unsettled Payable)`, or `Donate & Close`, with safety checks blocking closure if pending requests exist.
- **Multi-Account Treasury, Transfers & Charges:**
  - Track live balances across `Cash`, `bKash`, `Nagad`, `Rocket`, `Upay`, `CellFin`, and `Bank` accounts with 1-click copy, live account reconciliation breakdown, internal account transfers (with optional cash-out fees), and standalone bank/SMS charges.
- **12-Month Yearly Savings Register & Goals:**
  - Full `Jan`–`Dec` yearly member-by-month matrix with editable **Group Monthly Targets**, instant member search, Excel (`.xlsx`) & PDF statement exports.
  - Optional **Private Personal Monthly Goal** (`select: false` in DB — 100% private to each member for personal motivation).
- **Transactional Email System (5 Distinct Templates):**
  - Automated Gmail/SMTP emails for **Password Reset OTP**, **Welcome Member Invite**, **Deposit Approved Receipt / Rejection**, **Return Payout Voucher / Rejection**, and **Role / Admin Transfer** with hosted logo and dynamic live links.
- **Full Audit Transparency & `Asia/Dhaka` Accuracy:**
  - Global Activity Logs and per-member chronological Audit Trails (`before → after` change diffs).
  - Server & client dates locked to **Bangladesh Standard Time (`Asia/Dhaka`, UTC+6)** so midnight-crossing entries never drift into the wrong day or month.
- **Installable PWA:**
  - Web App Manifest (`/manifest.webmanifest`), custom `192×192`, `512×512`, and `apple-touch-icon` icons, financial-safe network-first Service Worker (`public/sw.js` — never caches `/api/*`), and 1-click **Install App** button.

---

## Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Framework** | Next.js 16 (App Router, Turbopack), React 19, TypeScript 5 |
| **Styling & UI** | Tailwind CSS v4, Radix UI (`shadcn/ui`), Lucide Icons, Recharts, Sonner |
| **State & API** | Redux Toolkit, RTK Query, `redux-persist` |
| **Database** | MongoDB + Mongoose 9 |
| **Validation & Auth** | Zod 4, JWT (`accessToken` + `httpOnly` `refreshToken`), `bcryptjs` |
| **Media & Email** | Cloudinary (proofs & avatars), Nodemailer (SMTP) |
| **Exports & Testing** | `xlsx`, `jspdf`, Vitest 4 |

---

## Role & Approval Flow

| Actor | Deposit / Return Entry | Can Approve / Reject | Management Permissions |
| :--- | :--- | :--- | :--- |
| **`ADMIN`** (Sole) | Directly `APPROVED` | All `PENDING` requests (including Cashiers') | Members, Role Change / Admin Transfer, Accounts, Targets, Transfers, Charges, Trash & Restore |
| **`CASHIER`** | `APPROVED` for other members; `PENDING` for self | Other members' `PENDING` requests | Payment Accounts, Monthly Targets, Internal Transfers, Charges, Former Member Settlements |
| **`MEMBER`** | Always `PENDING` | — | View live ledger, Monthly Sheet, Audit Trail, Exports, Personal Monthly Goal, edit/cancel own `PENDING` entries |

---

## Accounting & Reconciliation Invariants

All financial totals are computed dynamically from `APPROVED`, non-deleted records (`src/server/shared/accounting.service.ts`):

- **Member Net Balance** = `Approved Deposits - Approved Returns`
- **Account Balance** = `Approved Deposits In + Transfers In - Approved Payout Returns Out - Transfers Out - Transfer Fees - Standalone Charges`
- **Total Cash in Hand** = `Total Approved Deposits - Total Approved Payout Returns - Total Charges`
  - *Invariant:* `Total Cash in Hand === Sum of all Payment Account Balances` (`reconciliationDifference === 0`)
- **Active Net Fund** = `Total Cash in Hand - Unsettled Former Member Payable`

---

## Environment Variables

Create a `.env` file in the project root (and configure the same keys in Vercel Project Settings for production):

```env
# Database
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>

# JWT Secrets (use distinct 64-char random hex strings)
JWT_ACCESS_SECRET=<random-secret-access>
JWT_REFRESH_SECRET=<random-secret-refresh>
JWT_ACCESS_EXPIRES_IN=1d
JWT_REFRESH_EXPIRES_IN=30d

# Frontend API Base & Optional Public App URL
NEXT_PUBLIC_API_URL=/api/v1
NEXT_PUBLIC_APP_URL=https://joma-jatra.vercel.app

# Cloudinary (Proof Screenshots & Avatars)
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>

# SMTP (Transactional Emails)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<your-email@gmail.com>
SMTP_PASS=<16-char-app-password>
SMTP_FROM="JomaJatra <your-email@gmail.com>"
```

---

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Run local development server (http://localhost:3000)
pnpm dev

# 3. Run backend unit tests
pnpm exec vitest run

# 4. Run full quality gate (ESLint --max-warnings 0, TypeScript, Next.js production build)
pnpm check
```

### First-Time Admin Bootstrap
When starting with an empty database, create the initial sole Admin account via `POST /api/v1/auth/bootstrap-admin` (available in the Postman collection). Once at least one user exists, the bootstrap route automatically locks (`409 Conflict`).

---

## Project Structure

```text
src/
├── app/
│   ├── (auth)/               # Login, Forgot Password, OTP Verify, Reset Password
│   ├── (dashboard)/dashboard/# Overview, Monthly Sheet, Deposits, Returns, Members, Accounts, Activity Logs, Profile
│   ├── api/v1/               # 40 Next.js route handlers (57 REST endpoints)
│   └── manifest.ts           # PWA Web App Manifest
├── components/
│   ├── dashboard/            # Sidebar, Header, SearchBar, Pagination, Page Modules & Modals
│   └── shared/               # CustomModal, ConfirmModal, AppSelect, LedgerStatCard, ProofUploadField, PwaRegister
├── redux/                    # Store, authSlice, baseApi (auto-refresh), 6 RTK Query slices
├── server/
│   ├── core/                 # db, env, auth-guard, api-response, app-error, route-handler
│   ├── modules/              # auth, members, deposits, returns, payment-accounts, transfers, charges, monthly-targets, dashboard, activity-logs
│   ├── shared/               # accounting.service, normalize, pagination, cloudinary, email, email-templates
│   └── __tests__/            # Vitest unit tests
├── types/                    # backend.ts & centralized global.ts
└── utils/                    # Asia/Dhaka date formatters, BDT currency, Excel/PDF exports, pagination helpers
```

---

## Roadmap

- **Phase 1 (Current — Complete):** Pure Money Management MVP (with temporary Admin `Reset Test DB` utility kept active during testing; to be removed before real-money production launch).
- **Phase 2 (Planned):** Tour destination voting, trip expense tracking (hotel, transport, food), and post-tour per-member split settlement.
