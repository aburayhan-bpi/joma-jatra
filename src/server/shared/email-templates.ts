/**
 * Purpose-built, distinct transactional email templates for JomaJatra.
 * Features the hosted JomaJatra logo (https://joma-jatra.vercel.app/joma-jatra.png),
 * Plus Jakarta Sans typography, and 5 distinct layouts tailored by email purpose:
 * 1. Password Reset OTP     — Ultra-minimal security code card
 * 2. Welcome New Member     — Personal group invite + credentials + quick-start
 * 3. Approved Money Receipt — Official payment receipt / payout voucher with dashed divider & hero amount
 * 4. Rejected Notice        — Action-required issue notice with horizontal summary & reviewer note
 * 5. Role / Admin Transfer  — Governance notice with visual role transition & capabilities
 */

export interface EmailTemplatePayload {
  subject: string;
  html: string;
  text: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatTakaText(amount: number): string {
  return `৳ ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatBdtPlain(amount: number): string {
  return `BDT ${amount.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMonthText(yearMonth: string): string {
  if (!/^\d{4}-\d{2}$/.test(yearMonth)) return yearMonth;
  const [y, m] = yearMonth.split("-");
  const date = new Date(Number(y), Number(m) - 1, 1);
  return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function formatMethodName(method?: string | null): string {
  switch (method) {
    case "CASH":
      return "Cash";
    case "BKASH":
      return "bKash";
    case "NAGAD":
      return "Nagad";
    case "ROCKET":
      return "Rocket";
    case "UPAY":
      return "Upay";
    case "CELLFIN":
      return "CellFin";
    case "BANK_TRANSFER":
      return "Bank Transfer";
    default:
      return method || "—";
  }
}

// Prevents Gmail/Apple Mail from auto-turning plain emails into bright blue underlined links
function formatPlainEmailHtml(email: string): string {
  return escapeHtml(email)
    .replace("@", "&#8203;@")
    .replace(/\./g, "&#8203;.");
}

function makeReceiptRef(
  prefix: string,
  date: Date | string,
  trxId?: string | null,
): string {
  if (trxId) return `${prefix}-${trxId.slice(-6).toUpperCase()}`;
  const d = typeof date === "string" ? new Date(date) : date;
  const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `${prefix}-${stamp}`;
}

const DEFAULT_APP_URL = "https://joma-jatra.vercel.app";
const FONT_LINK =
  '<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet" />';
const FONT_STACK =
  "'Plus Jakarta Sans','Inter','Helvetica Neue',Arial,sans-serif";
const MONO_STACK = "'JetBrains Mono',SFMono-Regular,Menlo,Consolas,monospace";

function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || DEFAULT_APP_URL).replace(
    /\/+$/,
    "",
  );
}

function renderLogoImg(height = 34): string {
  const logoUrl = `${getAppBaseUrl()}/joma-jatra.png`;
  return `<img src="${escapeHtml(logoUrl)}" alt="JomaJatra" height="${height}" style="display:block;height:${height}px;width:auto;border:0;outline:none;text-decoration:none;" />`;
}

/* ==========================================================================
   1. PASSWORD RESET OTP — Ultra-Minimal Security Email (460px)
   ========================================================================== */

export function buildPasswordResetOtpEmail(params: {
  name: string;
  otp: string;
  expiresInMinutes?: number;
}): EmailTemplatePayload {
  const mins = params.expiresInMinutes ?? 10;
  const spacedOtp = params.otp.split("").join(" ");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#f4f6f5;font-family:${FONT_STACK};color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f5;padding:36px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:460px;background:#ffffff;border:1px solid #dde6e1;border-radius:4px;">
          <tr>
            <td style="padding:28px 30px;">
              <div style="margin-bottom:20px;">
                ${renderLogoImg(32)}
              </div>

              <h1 style="margin:0 0 8px 0;font-size:19px;font-weight:700;color:#072a1f;letter-spacing:-0.2px;line-height:1.3;">
                Your verification code
              </h1>
              <p style="margin:0 0 22px 0;font-size:14px;line-height:1.6;color:#475569;">
                Hi ${escapeHtml(params.name)}, enter the 6-digit code below to reset your password. It expires in <strong style="color:#072a1f;">${mins} minutes</strong>.
              </p>

              <!-- Minimal crisp OTP code strip -->
              <div style="padding:18px 20px;background:#f6faf7;border:1px solid #c6dad0;border-radius:4px;text-align:center;">
                <span style="font-family:${MONO_STACK};font-size:30px;font-weight:700;color:#046c4e;letter-spacing:4px;">
                  ${escapeHtml(spacedOtp)}
                </span>
              </div>

              <p style="margin:22px 0 0 0;font-size:12px;line-height:1.6;color:#64748b;">
                Didn&apos;t request a password reset? You can safely ignore this email — your current password will not change.
              </p>
            </td>
          </tr>
        </table>
        <div style="max-width:460px;margin-top:12px;font-size:11px;color:#94a3b8;text-align:center;">
          JomaJatra Security &bull; Never share this code with anyone
        </div>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `${params.otp} is your JomaJatra verification code`,
    text: `Hi ${params.name},\n\nYour JomaJatra verification code is: ${params.otp}\nThis code expires in ${mins} minutes.\n\nIf you didn't request this, you can safely ignore this email.`,
    html,
  };
}

/* ==========================================================================
   2. WELCOME NEW MEMBER — Personal Group Invitation + Credentials Card
   ========================================================================== */

export function buildWelcomeMemberEmail(params: {
  name: string;
  email: string;
  temporaryPassword: string;
  role: string;
  addedByName: string;
  joinedAt: Date | string;
}): EmailTemplatePayload {
  const loginUrl = `${getAppBaseUrl()}/login`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#f2f6f3;font-family:${FONT_STACK};color:#072a1f;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f2f6f3;padding:32px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #d7e5dd;border-top:3px solid #046c4e;border-radius:5px;overflow:hidden;">
          <!-- Clean White Logo Header -->
          <tr>
            <td style="padding:20px 28px;border-bottom:1px solid #e6efe9;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>${renderLogoImg(36)}</td>
                  <td align="right" valign="middle" style="font-size:11px;font-weight:600;color:#557066;text-transform:uppercase;letter-spacing:0.6px;">
                    Member Invitation
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Invitation Message -->
          <tr>
            <td style="padding:26px 28px;">
              <h1 style="margin:0 0 10px 0;font-size:20px;font-weight:700;color:#072a1f;letter-spacing:-0.2px;line-height:1.3;">
                Welcome aboard, ${escapeHtml(params.name)}
              </h1>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.65;color:#335247;">
                <strong style="color:#072a1f;">${escapeHtml(params.addedByName)}</strong> added you to the JomaJatra group savings ledger as <strong style="color:#046c4e;">${escapeHtml(params.role)}</strong> (joined ${escapeHtml(formatShortDate(params.joinedAt))}).
              </p>

              <!-- Compact Credentials Box (no blue auto-links) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f6faf7;border:1px solid #cfe0d7;border-radius:4px;margin-bottom:22px;">
                <tr>
                  <td style="padding:14px 16px;border-bottom:1px solid #e1ece6;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;color:#557066;">Sign-in Email</div>
                    <div style="font-family:${MONO_STACK};font-size:14px;font-weight:600;color:#072a1f;margin-top:4px;text-decoration:none;">
                      ${formatPlainEmailHtml(params.email)}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td style="padding:14px 16px;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.7px;color:#557066;">Temporary Password</div>
                    <div style="font-family:${MONO_STACK};font-size:16px;font-weight:700;color:#046c4e;margin-top:4px;letter-spacing:0.5px;">
                      ${escapeHtml(params.temporaryPassword)}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Primary CTA -->
              <div style="margin-bottom:24px;">
                <a href="${escapeHtml(loginUrl)}" style="display:inline-block;padding:11px 22px;background:#046c4e;color:#ffffff;font-size:13px;font-weight:600;text-decoration:none;border-radius:4px;">
                  Sign In to Dashboard &rarr;
                </a>
              </div>

              <!-- Quick 3-step onboarding checklist -->
              <div style="border-top:1px solid #e6efe9;padding-top:18px;">
                <div style="font-size:12px;font-weight:700;color:#072a1f;margin-bottom:8px;">Quick first steps</div>
                <p style="margin:0 0 6px 0;font-size:13px;line-height:1.55;color:#476359;">
                  1. Open <strong>My Profile</strong> and change your temporary password right away.
                </p>
                <p style="margin:0 0 6px 0;font-size:13px;line-height:1.55;color:#476359;">
                  2. Check <strong>Accounts &amp; Transfers</strong> to copy official group bKash / Nagad / Bank numbers.
                </p>
                <p style="margin:0;font-size:13px;line-height:1.55;color:#476359;">
                  3. Submit deposits with proof screenshots and view your live statement anytime.
                </p>
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Welcome to JomaJatra, ${params.name} — Your Login Credentials`,
    text: `Welcome aboard, ${params.name}!\n\n${params.addedByName} added you to JomaJatra as ${params.role}.\n\nSign-in Email: ${params.email}\nTemporary Password: ${params.temporaryPassword}\nLogin: ${loginUrl}\n\nPlease change your temporary password from My Profile right after signing in.`,
    html,
  };
}

/* ==========================================================================
   3. DEPOSIT RECEIPT (APPROVED = Official Payment Receipt | REJECTED = Action Notice)
   ========================================================================== */

export function buildDepositReceiptEmail(params: {
  memberName: string;
  status: "APPROVED" | "REJECTED";
  amount: number;
  month: string;
  depositDate: Date | string;
  paymentMethod: string;
  paymentAccountName: string;
  trxId?: string | null;
  reviewedByName: string;
  rejectionReason?: string | null;
  newNetBalance?: number;
}): EmailTemplatePayload {
  const methodLabel = formatMethodName(params.paymentMethod);
  const monthLabel = formatMonthText(params.month);
  const dateLabel = formatShortDate(params.depositDate);

  // ---- VARIANT A: OFFICIAL DEPOSIT RECEIPT (Invoice / Voucher Layout) ----
  if (params.status === "APPROVED") {
    const receiptNo = makeReceiptRef("DEP", params.depositDate, params.trxId);

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#eef3f0;font-family:${FONT_STACK};color:#072a1f;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef3f0;padding:30px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #cfdcd4;border-top:4px solid #046c4e;border-radius:4px;overflow:hidden;">
          <!-- Crisp Light Letterhead with Full-Color Logo & Receipt Number -->
          <tr>
            <td style="padding:20px 26px;border-bottom:1px solid #e6efe9;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${renderLogoImg(36)}
                  </td>
                  <td align="right" valign="middle">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#046c4e;">Deposit Receipt</div>
                    <div style="font-family:${MONO_STACK};font-size:13px;font-weight:700;color:#072a1f;margin-top:2px;">${escapeHtml(receiptNo)}</div>
                    <div style="font-size:11px;color:#557066;margin-top:1px;">${escapeHtml(dateLabel)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Amount Stamp -->
          <tr>
            <td style="padding:26px 26px 20px 26px;text-align:center;background:#fafdfb;">
              <div style="display:inline-block;padding:3px 10px;background:#e9f4ef;border:1px solid #b9dacb;border-radius:2px;font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#046c4e;margin-bottom:10px;">
                Paid &bull; Verified Deposit
              </div>
              <div style="font-family:${MONO_STACK};font-size:34px;font-weight:700;color:#072a1f;letter-spacing:-0.5px;line-height:1.15;">
                ${escapeHtml(formatTakaText(params.amount))}
              </div>
              <div style="font-size:13px;color:#557066;margin-top:6px;">
                Received from <strong style="color:#072a1f;">${escapeHtml(params.memberName)}</strong> for <strong style="color:#072a1f;">${escapeHtml(monthLabel)}</strong>
              </div>
            </td>
          </tr>

          <!-- Dashed Paper Receipt Divider -->
          <tr>
            <td style="padding:0 26px;background:#ffffff;">
              <div style="border-top:1px dashed #c4d5cb;height:1px;"></div>
            </td>
          </tr>

          <!-- Itemized Receipt Lines -->
          <tr>
            <td style="padding:20px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                <tr>
                  <td style="padding:7px 0;color:#557066;">Deposited Into</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#072a1f;">${escapeHtml(params.paymentAccountName)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#557066;">Payment Method</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#072a1f;">${escapeHtml(methodLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#557066;">Transaction ID</td>
                  <td style="padding:7px 0;text-align:right;font-family:${MONO_STACK};font-weight:600;color:#072a1f;">${escapeHtml(params.trxId || "Cash / N/A")}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#557066;">Savings Period</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#072a1f;">${escapeHtml(monthLabel)}</td>
                </tr>
                <tr>
                  <td style="padding:7px 0;color:#557066;">Verified By</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#072a1f;">${escapeHtml(params.reviewedByName)}</td>
                </tr>
              </table>

              ${
                params.newNetBalance !== undefined
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f4faf7;border:1px solid #cde2d6;border-radius:4px;">
                <tr>
                  <td style="padding:12px 14px;font-size:12px;font-weight:600;color:#335247;">
                    Your Updated Net Savings Balance
                  </td>
                  <td style="padding:12px 14px;text-align:right;font-family:${MONO_STACK};font-size:16px;font-weight:700;color:#046c4e;">
                    ${escapeHtml(formatTakaText(params.newNetBalance))}
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>

          <!-- Minimal Receipt Footer -->
          <tr>
            <td style="padding:14px 26px;background:#fafcfb;border-top:1px solid #e6efe9;font-size:11px;color:#738c82;">
              Keep this receipt for your records &bull; Full statement &amp; proof image available in JomaJatra Audit Trail.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return {
      subject: `Receipt ${receiptNo} — Deposit of ${formatBdtPlain(params.amount)} Confirmed`,
      text: `JomaJatra Deposit Receipt (${receiptNo})\nDate: ${dateLabel}\n\nMember: ${params.memberName}\nAmount: ${formatBdtPlain(params.amount)}\nMonth: ${monthLabel}\nAccount: ${params.paymentAccountName} (${methodLabel})\nTrxID: ${params.trxId || "N/A"}\nVerified By: ${params.reviewedByName}${params.newNetBalance !== undefined ? `\nUpdated Net Balance: ${formatBdtPlain(params.newNetBalance)}` : ""}`,
      html,
    };
  }

  // ---- VARIANT B: DEPOSIT REJECTED (Action-Required Issue Notice) ----
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:${FONT_STACK};color:#1c1917;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:30px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e5e5e4;border-top:3px solid #dc2626;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:18px 28px;border-bottom:1px solid #f0efef;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>${renderLogoImg(32)}</td>
                  <td align="right" valign="middle" style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.8px;">
                    Action Needed
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <h1 style="margin:0 0 8px 0;font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;line-height:1.3;">
                Your deposit could not be verified
              </h1>
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#475569;">
                Hi ${escapeHtml(params.memberName)}, <strong>${escapeHtml(params.reviewedByName)}</strong> reviewed your deposit request for ${escapeHtml(monthLabel)} and marked it as rejected.
              </p>

              <!-- 3-Column Horizontal Transaction Snapshot -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:4px;background:#fafafa;margin-bottom:18px;">
                <tr>
                  <td style="padding:12px 14px;width:33%;border-right:1px solid #e5e7eb;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#6b7280;">Amount</div>
                    <div style="font-family:${MONO_STACK};font-size:14px;font-weight:700;color:#111827;margin-top:3px;">${escapeHtml(formatTakaText(params.amount))}</div>
                  </td>
                  <td style="padding:12px 14px;width:33%;border-right:1px solid #e5e7eb;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#6b7280;">Method</div>
                    <div style="font-size:13px;font-weight:600;color:#111827;margin-top:3px;">${escapeHtml(methodLabel)}</div>
                  </td>
                  <td style="padding:12px 14px;width:34%;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#6b7280;">TrxID</div>
                    <div style="font-family:${MONO_STACK};font-size:12px;font-weight:600;color:#111827;margin-top:3px;word-break:break-all;">${escapeHtml(params.trxId || "N/A")}</div>
                  </td>
                </tr>
              </table>

              <!-- Reviewer's Note with crisp red left bar -->
              <div style="padding:14px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;margin-bottom:20px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#991b1b;margin-bottom:4px;">
                  Reviewer&apos;s Reason
                </div>
                <div style="font-size:13px;line-height:1.6;color:#7f1d1d;">
                  ${escapeHtml(params.rejectionReason || "Payment could not be matched.")}
                </div>
              </div>

              <div style="font-size:13px;line-height:1.6;color:#475569;">
                <strong style="color:#0f172a;">What to do next:</strong> Double-check your payment screenshot and TrxID, then submit a corrected deposit entry from your JomaJatra dashboard (or reach out to ${escapeHtml(params.reviewedByName)}).
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Action Needed — Deposit of ${formatBdtPlain(params.amount)} Was Not Verified`,
    text: `Hi ${params.memberName},\n\nYour deposit request of ${formatBdtPlain(params.amount)} (${monthLabel}, ${methodLabel}, TrxID: ${params.trxId || "N/A"}) was rejected by ${params.reviewedByName}.\n\nReason: ${params.rejectionReason || "Payment could not be matched."}\n\nPlease verify the details and resubmit from your dashboard.`,
    html,
  };
}

/* ==========================================================================
   4. RETURN / SETTLEMENT RECEIPT (APPROVED = Payout Voucher | REJECTED = Notice)
   ========================================================================== */

export function buildReturnReceiptEmail(params: {
  memberName: string;
  status: "APPROVED" | "REJECTED";
  amount: number;
  returnType: string;
  returnDate: Date | string;
  paymentAccountName?: string | null;
  paymentMethod?: string | null;
  recipientAccount?: string | null;
  trxId?: string | null;
  reviewedByName: string;
  rejectionReason?: string | null;
  newNetBalance?: number;
}): EmailTemplatePayload {
  const isDonation = params.returnType === "DONATED_WAIVER";
  const readableType = params.returnType.replace(/_/g, " ");
  const dateLabel = formatShortDate(params.returnDate);
  const methodLabel = formatMethodName(params.paymentMethod);

  // ---- VARIANT A: OFFICIAL PAYOUT VOUCHER / SETTLEMENT RECEIPT ----
  if (params.status === "APPROVED") {
    const voucherNo = makeReceiptRef(
      isDonation ? "WAV" : "PAY",
      params.returnDate,
      params.trxId,
    );

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#eef2f5;font-family:${FONT_STACK};color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f5;padding:30px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #d1dce5;border-top:4px solid #1e3a4c;border-radius:4px;overflow:hidden;">
          <!-- Crisp Light Voucher Header with Full-Color Logo -->
          <tr>
            <td style="padding:20px 26px;border-bottom:1px solid #e2e8f0;background:#ffffff;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    ${renderLogoImg(36)}
                  </td>
                  <td align="right" valign="middle">
                    <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1px;color:#1e3a4c;">${isDonation ? "Waiver Voucher" : "Payout Voucher"}</div>
                    <div style="font-family:${MONO_STACK};font-size:13px;font-weight:700;color:#0f172a;margin-top:2px;">${escapeHtml(voucherNo)}</div>
                    <div style="font-size:11px;color:#64748b;margin-top:1px;">${escapeHtml(dateLabel)}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero Payout Amount -->
          <tr>
            <td style="padding:26px 26px 20px 26px;text-align:center;background:#f8fafc;">
              <div style="display:inline-block;padding:3px 10px;background:#fcf4e6;border:1px solid #e8cfa0;border-radius:2px;font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;color:#a15c07;margin-bottom:10px;">
                ${isDonation ? "Waived to Group Fund" : `Disbursed &bull; ${escapeHtml(readableType)}`}
              </div>
              <div style="font-family:${MONO_STACK};font-size:34px;font-weight:700;color:#0f172a;letter-spacing:-0.5px;line-height:1.15;">
                ${escapeHtml(formatTakaText(params.amount))}
              </div>
              <div style="font-size:13px;color:#475569;margin-top:6px;">
                ${isDonation ? `Waived by <strong style="color:#0f172a;">${escapeHtml(params.memberName)}</strong> to the group fund` : `Paid out to <strong style="color:#0f172a;">${escapeHtml(params.memberName)}</strong>`}
              </div>
            </td>
          </tr>

          <!-- Dashed Voucher Divider -->
          <tr>
            <td style="padding:0 26px;">
              <div style="border-top:1px dashed #cbd5e1;height:1px;"></div>
            </td>
          </tr>

          <!-- Voucher Line Items -->
          <tr>
            <td style="padding:20px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;">
                <tr>
                  <td style="padding:7px 0;color:#64748b;">Settlement Type</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">${escapeHtml(readableType)}</td>
                </tr>
                ${
                  !isDonation && params.paymentAccountName
                    ? `
                <tr>
                  <td style="padding:7px 0;color:#64748b;">Paid From</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">${escapeHtml(params.paymentAccountName)} (${escapeHtml(methodLabel)})</td>
                </tr>`
                    : ""
                }
                ${
                  !isDonation && params.recipientAccount
                    ? `
                <tr>
                  <td style="padding:7px 0;color:#64748b;">Sent To</td>
                  <td style="padding:7px 0;text-align:right;font-family:${MONO_STACK};font-weight:600;color:#0f172a;">${escapeHtml(params.recipientAccount)}</td>
                </tr>`
                    : ""
                }
                ${
                  !isDonation
                    ? `
                <tr>
                  <td style="padding:7px 0;color:#64748b;">Payout TrxID</td>
                  <td style="padding:7px 0;text-align:right;font-family:${MONO_STACK};font-weight:600;color:#0f172a;">${escapeHtml(params.trxId || "Cash / N/A")}</td>
                </tr>`
                    : ""
                }
                <tr>
                  <td style="padding:7px 0;color:#64748b;">Processed By</td>
                  <td style="padding:7px 0;text-align:right;font-weight:600;color:#0f172a;">${escapeHtml(params.reviewedByName)}</td>
                </tr>
              </table>

              ${
                params.newNetBalance !== undefined
                  ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;background:#f8fafc;border:1px solid #d1dce5;border-radius:4px;">
                <tr>
                  <td style="padding:12px 14px;font-size:12px;font-weight:600;color:#334155;">
                    Remaining Member Net Balance
                  </td>
                  <td style="padding:12px 14px;text-align:right;font-family:${MONO_STACK};font-size:16px;font-weight:700;color:#046c4e;">
                    ${escapeHtml(formatTakaText(params.newNetBalance))}
                  </td>
                </tr>
              </table>`
                  : ""
              }
            </td>
          </tr>

          <tr>
            <td style="padding:14px 26px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:11px;color:#64748b;">
              Official JomaJatra payout voucher &bull; Archived in your Member Audit Trail.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    return {
      subject: `Voucher ${voucherNo} — ${isDonation ? "Balance Waiver" : "Return Payout"} of ${formatBdtPlain(params.amount)}`,
      text: `JomaJatra Payout Voucher (${voucherNo})\nDate: ${dateLabel}\n\nMember: ${params.memberName}\nType: ${readableType}\nAmount: ${formatBdtPlain(params.amount)}${params.paymentAccountName ? `\nPaid From: ${params.paymentAccountName} (${methodLabel})` : ""}${params.recipientAccount ? `\nSent To: ${params.recipientAccount}` : ""}${params.trxId ? `\nTrxID: ${params.trxId}` : ""}\nProcessed By: ${params.reviewedByName}${params.newNetBalance !== undefined ? `\nRemaining Net Balance: ${formatBdtPlain(params.newNetBalance)}` : ""}`,
      html,
    };
  }

  // ---- VARIANT B: RETURN REQUEST REJECTED ----
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#f5f5f4;font-family:${FONT_STACK};color:#1c1917;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f4;padding:30px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #e5e5e4;border-top:3px solid #dc2626;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:18px 28px;border-bottom:1px solid #f0efef;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>${renderLogoImg(32)}</td>
                  <td align="right" valign="middle" style="font-size:11px;font-weight:700;color:#b91c1c;text-transform:uppercase;letter-spacing:0.8px;">
                    Return Declined
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <h1 style="margin:0 0 8px 0;font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;line-height:1.3;">
                Your return request was not approved
              </h1>
              <p style="margin:0 0 18px 0;font-size:14px;line-height:1.6;color:#475569;">
                Hi ${escapeHtml(params.memberName)}, <strong>${escapeHtml(params.reviewedByName)}</strong> declined your ${escapeHtml(readableType.toLowerCase())} request on ${escapeHtml(dateLabel)}. Your savings balance was not deducted.
              </p>

              <!-- Compact Horizontal Summary -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:4px;background:#fafafa;margin-bottom:18px;">
                <tr>
                  <td style="padding:12px 14px;width:40%;border-right:1px solid #e5e7eb;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#6b7280;">Requested Amount</div>
                    <div style="font-family:${MONO_STACK};font-size:14px;font-weight:700;color:#111827;margin-top:3px;">${escapeHtml(formatTakaText(params.amount))}</div>
                  </td>
                  <td style="padding:12px 14px;width:60%;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;color:#6b7280;">Recipient Account</div>
                    <div style="font-family:${MONO_STACK};font-size:12px;font-weight:600;color:#111827;margin-top:3px;">${escapeHtml(params.recipientAccount || "Not specified")}</div>
                  </td>
                </tr>
              </table>

              <div style="padding:14px 16px;background:#fef2f2;border-left:4px solid #dc2626;border-radius:0 4px 4px 0;margin-bottom:18px;">
                <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#991b1b;margin-bottom:4px;">
                  Reviewer&apos;s Note
                </div>
                <div style="font-size:13px;line-height:1.6;color:#7f1d1d;">
                  ${escapeHtml(params.rejectionReason || "Declined by reviewer.")}
                </div>
              </div>

              <div style="font-size:13px;line-height:1.6;color:#475569;">
                You can submit a corrected return request anytime from <strong>Returns &amp; Settlements</strong>.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: `Return Declined — Request for ${formatBdtPlain(params.amount)}`,
    text: `Hi ${params.memberName},\n\nYour return request of ${formatBdtPlain(params.amount)} was declined by ${params.reviewedByName}. No money was deducted from your balance.\n\nReason: ${params.rejectionReason || "Declined by reviewer."}`,
    html,
  };
}

/* ==========================================================================
   5. ROLE CHANGED / ADMIN TRANSFER — Governance Transition Notice
   ========================================================================== */

function getRoleCapabilities(role: string): string[] {
  if (role === "ADMIN") {
    return [
      "Add, edit, close, settle, and restore group members",
      "Appoint or remove Cashiers, or transfer Admin ownership",
      "Approve all deposit & return requests and restore Trash items",
      "Manage payment accounts, monthly targets, transfers, and charges",
    ];
  }
  if (role === "CASHIER") {
    return [
      "Approve or reject other members' deposit and return requests",
      "Manage payment accounts, monthly group targets, transfers, and charges",
      "Own deposit & return entries still require Admin verification for transparency",
    ];
  }
  return [
    "View transparent group fund summary, monthly savings sheet, and activity logs",
    "Submit flexible deposits with proof screenshots and request returns",
    "Download Excel and PDF personal statements anytime",
  ];
}

export function buildRoleChangedEmail(params: {
  memberName: string;
  previousRole: string;
  newRole: string;
  changedByName: string;
  isAdminTransfer?: boolean;
}): EmailTemplatePayload {
  const capabilities = getRoleCapabilities(params.newRole);
  const bulletHtml = capabilities
    .map(
      (item) =>
        `<li style="margin:0 0 6px 0;font-size:13px;line-height:1.55;color:#334155;">${escapeHtml(item)}</li>`,
    )
    .join("");

  const intro = params.isAdminTransfer
    ? params.newRole === "ADMIN"
      ? `${params.changedByName} transferred sole Admin ownership of JomaJatra to your account.`
      : `Admin ownership has been transferred as requested, and your account is now ${params.newRole}.`
    : `${params.changedByName} updated your group role on JomaJatra.`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  ${FONT_LINK}
</head>
<body style="margin:0;padding:0;background:#f3f5f7;font-family:${FONT_STACK};color:#0f172a;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f5f7;padding:30px 14px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:540px;background:#ffffff;border:1px solid #dbe2e8;border-top:3px solid #285a84;border-radius:4px;overflow:hidden;">
          <tr>
            <td style="padding:18px 28px;border-bottom:1px solid #e6ecf0;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>${renderLogoImg(32)}</td>
                  <td align="right" valign="middle" style="font-size:11px;font-weight:700;color:#285a84;text-transform:uppercase;letter-spacing:0.7px;">
                    ${params.isAdminTransfer ? "Admin Transfer" : "Role Update"}
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:24px 28px;">
              <h1 style="margin:0 0 8px 0;font-size:19px;font-weight:700;color:#0f172a;letter-spacing:-0.2px;line-height:1.3;">
                Hi ${escapeHtml(params.memberName)}, your role is now ${escapeHtml(params.newRole)}
              </h1>
              <p style="margin:0 0 20px 0;font-size:14px;line-height:1.6;color:#475569;">
                ${escapeHtml(intro)}
              </p>

              <!-- Visual Role Transition Strip (OLD -> NEW) -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #d5e0e8;border-radius:4px;margin-bottom:20px;">
                <tr>
                  <td align="center" style="padding:16px 12px;width:42%;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#64748b;">Previous Role</div>
                    <div style="font-size:15px;font-weight:700;color:#475569;margin-top:4px;">${escapeHtml(params.previousRole)}</div>
                  </td>
                  <td align="center" style="padding:16px 4px;width:16%;font-size:18px;font-weight:700;color:#046c4e;">
                    &rarr;
                  </td>
                  <td align="center" style="padding:16px 12px;width:42%;">
                    <div style="font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.6px;color:#64748b;">Current Role</div>
                    <div style="font-size:15px;font-weight:700;color:#046c4e;margin-top:4px;">${escapeHtml(params.newRole)}</div>
                  </td>
                </tr>
              </table>

              <!-- Permissions List -->
              <div style="font-size:12px;font-weight:700;color:#0f172a;margin-bottom:8px;">
                What you can do as ${escapeHtml(params.newRole)}:
              </div>
              <ul style="margin:0 0 18px 0;padding-left:18px;">
                ${bulletHtml}
              </ul>

              <div style="border-top:1px solid #e2e8f0;padding-top:12px;font-size:11px;color:#64748b;">
                Updated by ${escapeHtml(params.changedByName)} on ${escapeHtml(formatShortDate(new Date()))} &bull; Logged in JomaJatra Activity Log.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return {
    subject: params.isAdminTransfer
      ? `JomaJatra — Admin Ownership Transferred (Now ${params.newRole})`
      : `JomaJatra — Your Role Changed (${params.previousRole} -> ${params.newRole})`,
    text: `Hi ${params.memberName},\n\n${intro}\nRole change: ${params.previousRole} -> ${params.newRole}\nUpdated by: ${params.changedByName}\n\nWhat you can do as ${params.newRole}:\n- ${capabilities.join("\n- ")}`,
    html,
  };
}
