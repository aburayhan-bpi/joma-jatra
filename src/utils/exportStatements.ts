import {
  IMember,
  IMemberAuditTrailEntry,
  IMonthlyMatrixData,
} from "@/types/global";
import jsPDF from "jspdf";
import * as XLSX from "xlsx";
import { formatDate } from "./formatDate";
import { formatMonthLabel, formatTaka } from "./formatMoney";

/**
 * Exports the Member × Month flexible savings matrix to an Excel (.xlsx) file.
 */
export function exportMonthlyMatrixExcel(
  matrix: IMonthlyMatrixData,
  yearLabel = "All",
) {
  const headers = [
    "Member",
    "Role",
    "Status",
    ...matrix.months.map((m) => formatMonthLabel(m.month)),
    "Total Deposited (BDT)",
    "Total Returned (BDT)",
    "Net Balance (BDT)",
  ];

  const rows = matrix.rows.map((row) => [
    row.name,
    row.role,
    row.status,
    ...matrix.months.map((m) => {
      const cell = row.monthlyBreakdown[m.month];
      return cell === null ? "—" : cell.amount;
    }),
    row.totalDeposited,
    row.totalReturned,
    row.netBalance,
  ]);

  // Append monthly totals footer row
  rows.push([
    "Monthly Collected Total",
    "",
    "",
    ...matrix.months.map((m) => m.collectedAmount),
    matrix.rows.reduce((sum, r) => sum + r.totalDeposited, 0),
    matrix.rows.reduce((sum, r) => sum + r.totalReturned, 0),
    matrix.rows.reduce((sum, r) => sum + r.netBalance, 0),
  ]);

  const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Monthly Savings");
  XLSX.writeFile(workbook, `JomaJatra_Monthly_Sheet_${yearLabel}.xlsx`);
}

/**
 * Exports the Monthly Savings summary to a clean ledger PDF (.pdf).
 */
export function exportMonthlyMatrixPdf(
  matrix: IMonthlyMatrixData,
  yearLabel = "All",
) {
  const doc = new jsPDF({ orientation: "landscape", unit: "pt", format: "a4" });
  const marginX = 36;
  let y = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(7, 42, 31);
  doc.text(`JomaJatra — Monthly Savings Statement (${yearLabel})`, marginX, y);

  y += 16;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(85, 112, 102);
  doc.text(`Generated on ${new Date().toLocaleString()}`, marginX, y);

  y += 24;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(7, 42, 31);
  doc.text("Member Summary", marginX, y);
  y += 14;

  // Table header
  doc.setFillColor(239, 245, 241);
  doc.rect(marginX, y - 10, 770, 20, "F");
  doc.setFontSize(9);
  doc.text("Member", marginX + 6, y + 3);
  doc.text("Role", marginX + 180, y + 3);
  doc.text("Status", marginX + 250, y + 3);
  doc.text("Total Saved", marginX + 360, y + 3);
  doc.text("Returned", marginX + 490, y + 3);
  doc.text("Net Balance", marginX + 620, y + 3);
  y += 22;

  doc.setFont("helvetica", "normal");
  for (const row of matrix.rows) {
    if (y > 540) {
      doc.addPage();
      y = 42;
    }
    doc.text(row.name, marginX + 6, y);
    doc.text(row.role, marginX + 180, y);
    doc.text(row.status, marginX + 250, y);
    doc.text(`BDT ${row.totalDeposited.toLocaleString()}`, marginX + 360, y);
    doc.text(`BDT ${row.totalReturned.toLocaleString()}`, marginX + 490, y);
    doc.text(`BDT ${row.netBalance.toLocaleString()}`, marginX + 620, y);
    doc.setDrawColor(215, 229, 221);
    doc.line(marginX, y + 6, marginX + 770, y + 6);
    y += 20;
  }

  // Monthly collection breakdown section
  y += 18;
  if (y > 500) {
    doc.addPage();
    y = 42;
  }
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("Month-wise Target vs Collected", marginX, y);
  y += 16;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  for (const m of matrix.months) {
    if (y > 545) {
      doc.addPage();
      y = 42;
    }
    doc.text(
      `${formatMonthLabel(m.month)}  |  Target: BDT ${m.targetAmount.toLocaleString()}  |  Collected: BDT ${m.collectedAmount.toLocaleString()} (${m.progressPercent}%)`,
      marginX + 6,
      y,
    );
    y += 16;
  }

  doc.save(`JomaJatra_Monthly_Statement_${yearLabel}.pdf`);
}

/**
 * Exports a single member's complete Audit Trail to Excel (.xlsx).
 */
export function exportMemberAuditExcel(
  member: IMember,
  entries: IMemberAuditTrailEntry[],
) {
  const headers = [
    "Date",
    "Category",
    "Type",
    "Month",
    "Summary",
    "Method",
    "TrxID",
    "Amount (BDT)",
    "Status",
    "Actioned By",
    "Reviewed By",
  ];

  const rows = entries.map((e) => [
    formatDate(e.date),
    e.eventCategory,
    e.eventType,
    e.month || "—",
    e.summary,
    e.paymentMethod || "—",
    e.trxId || "—",
    e.amount === null
      ? "—"
      : e.direction === "DEBIT"
        ? -e.amount
        : e.amount,
    e.status || "—",
    e.performedBy?.name || "—",
    e.reviewedBy?.name || "—",
  ]);

  const ws = XLSX.utils.aoa_to_sheet([
    [`JomaJatra Member Statement — ${member.name} (${member.email})`],
    [
      `Total Deposited: ${formatTaka(member.financialSummary.totalDeposited)}`,
      `Total Returned: ${formatTaka(member.financialSummary.totalReturned)}`,
      `Net Balance: ${formatTaka(member.financialSummary.netBalance)}`,
    ],
    [],
    headers,
    ...rows,
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Audit Trail");
  const safeName = member.name.replace(/\s+/g, "_");
  XLSX.writeFile(wb, `JomaJatra_${safeName}_Statement.xlsx`);
}

/**
 * Exports a single member's complete Audit Trail to PDF (.pdf).
 */
export function exportMemberAuditPdf(
  member: IMember,
  entries: IMemberAuditTrailEntry[],
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const marginX = 36;
  let y = 42;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(7, 42, 31);
  doc.text(`JomaJatra — Member Statement`, marginX, y);

  y += 18;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Member: ${member.name} (${member.email}) | Role: ${member.role}`, marginX, y);

  y += 15;
  doc.text(
    `Total Saved: BDT ${member.financialSummary.totalDeposited.toLocaleString()}  |  Returned: BDT ${member.financialSummary.totalReturned.toLocaleString()}  |  Net Balance: BDT ${member.financialSummary.netBalance.toLocaleString()}`,
    marginX,
    y,
  );

  y += 24;
  doc.setFillColor(239, 245, 241);
  doc.rect(marginX, y - 10, 523, 20, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Date", marginX + 4, y + 3);
  doc.text("Type", marginX + 82, y + 3);
  doc.text("Summary", marginX + 150, y + 3);
  doc.text("Amount", marginX + 380, y + 3);
  doc.text("Status", marginX + 460, y + 3);
  y += 22;

  doc.setFont("helvetica", "normal");
  for (const e of entries) {
    if (y > 780) {
      doc.addPage();
      y = 42;
    }
    const amtText =
      e.amount === null
        ? "—"
        : `${e.direction === "DEBIT" ? "-" : "+"}BDT ${e.amount.toLocaleString()}`;
    const shortSummary =
      e.summary.length > 42 ? `${e.summary.slice(0, 39)}...` : e.summary;

    doc.text(formatDate(e.date), marginX + 4, y);
    doc.text(e.eventCategory, marginX + 82, y);
    doc.text(shortSummary, marginX + 150, y);
    doc.text(amtText, marginX + 380, y);
    doc.text(e.status || "—", marginX + 460, y);
    doc.setDrawColor(220, 232, 225);
    doc.line(marginX, y + 5, marginX + 523, y + 5);
    y += 18;
  }

  const safeName = member.name.replace(/\s+/g, "_");
  doc.save(`JomaJatra_${safeName}_Statement.pdf`);
}
