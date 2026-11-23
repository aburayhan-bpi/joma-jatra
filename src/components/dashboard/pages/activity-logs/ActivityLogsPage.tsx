"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import AppSelect from "@/components/shared/AppSelect";
import InlineLoader from "@/components/shared/InlineLoader";
import PageHeader from "@/components/shared/PageHeader";
import ProofPreviewModal, {
  ProofPreviewData,
} from "@/components/shared/ProofPreviewModal";
import StatusPill from "@/components/shared/StatusPill";
import { useGetActivityLogsQuery } from "@/redux/api/dashboard/dashboardApi";
import {
  ACTIVITY_ACTIONS,
  ACTIVITY_ENTITIES,
  ActivityAction,
  ActivityEntity,
} from "@/types/backend";
import { formatDateTime } from "@/utils/formatDate";
import { formatTaka } from "@/utils/formatMoney";
import useSetParamsForPagination from "@/utils/setParamsForPagination";
import { Eye } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Converts `changes: { before, after }` into clean key diff lines.
 */
function formatDiffLines(changes?: {
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
} | null): string[] {
  if (!changes) return [];
  const before = changes.before || {};
  const after = changes.after || {};
  const keys = Array.from(
    new Set([...Object.keys(before), ...Object.keys(after)]),
  );

  return keys
    .filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]))
    .map(
      (k) =>
        `${k}: ${String(before[k] ?? "—")} → ${String(after[k] ?? "—")}`,
    );
}

/**
 * Global Group Activity Logs Page (/dashboard/activity-logs)
 * Transparent immutable audit log of every create, edit, approval, rejection,
 * settlement, delete, and restore across the entire savings ledger.
 */
export default function ActivityLogsPage() {
  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();

  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const entityType = (searchParams.get("entityType") || "") as
    | ActivityEntity
    | "";
  const action = (searchParams.get("action") || "") as ActivityAction | "";

  const { data: logsRes, isLoading } = useGetActivityLogsQuery({
    page,
    limit: 15,
    search: search || undefined,
    entityType: entityType || undefined,
    action: action || undefined,
  });

  const [proofPreview, setProofPreview] = useState<ProofPreviewData | null>(
    null,
  );

  const logs = logsRes?.data || [];
  const meta = logsRes?.meta;

  return (
    <div className="space-y-5">
      <PageHeader
        title="Activity Logs"
        subtitle="Full transparent audit trail of every financial action, edit, approval, and restore"
      />

      {/* Search & Filters */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-wrap items-center gap-2.5">
        <SearchBar
          placeholder="Search log summary..."
          className="flex-1 min-w-52"
        />

        <AppSelect
          value={entityType}
          onChange={(val) => setParams({ entityType: val || null, page: 1 })}
          options={[
            { value: "", label: "All Entities" },
            ...ACTIVITY_ENTITIES.map((ent) => ({
              value: ent,
              label: ent.replace(/_/g, " "),
            })),
          ]}
          className="w-44 text-xs"
        />

        <AppSelect
          value={action}
          onChange={(val) => setParams({ action: val || null, page: 1 })}
          options={[
            { value: "", label: "All Actions" },
            ...ACTIVITY_ACTIONS.map((act) => ({
              value: act,
              label: act.replace(/_/g, " "),
            })),
          ]}
          className="w-40 text-xs"
        />

        {(entityType || action || search) && (
          <button
            type="button"
            onClick={() =>
              setParams({
                entityType: null,
                action: null,
                search: null,
                page: 1,
              })
            }
            className="h-9 px-2.5 text-xs font-medium text-muted-foreground hover:text-foreground cursor-pointer"
          >
            Clear
          </button>
        )}
      </div>

      {/* Activity Table */}
      {isLoading ? (
        <InlineLoader text="Loading activity logs..." />
      ) : logs.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          No activity logs match your filters.
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Entity &amp; Action</th>
                  <th className="px-4 py-3">Summary &amp; Changes</th>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3">Performed By</th>
                  <th className="px-4 py-3 text-right">Proof</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {logs.map((log) => {
                  const diffLines = formatDiffLines(log.changes);
                  const targetId =
                    log.targetMemberId?._id || log.targetMemberId?.id;

                  return (
                    <tr key={log.id} className="hover:bg-muted/30 align-top">
                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDateTime(log.createdAt)}
                      </td>

                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-col items-start gap-1">
                          <StatusPill status={log.action} />
                          <span className="text-[10px] font-medium text-muted-foreground">
                            {log.entityType.replace(/_/g, " ")}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 max-w-md">
                        <p className="text-xs font-medium text-foreground">
                          {log.summary}
                        </p>
                        {diffLines.length > 0 && (
                          <ul className="mt-1.5 space-y-0.5 text-[11px] font-mono bg-muted/60 border border-border rounded px-2 py-1 text-text-description">
                            {diffLines.map((line) => (
                              <li key={line}>{line}</li>
                            ))}
                          </ul>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {log.targetMemberId && targetId ? (
                          <Link
                            href={`/dashboard/members/${targetId}`}
                            className="font-medium text-foreground hover:text-primary cursor-pointer"
                          >
                            {log.targetMemberId.name}
                          </Link>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold font-money text-foreground whitespace-nowrap">
                        {log.amount !== null && log.amount !== undefined
                          ? formatTaka(log.amount)
                          : "—"}
                      </td>

                      <td className="px-4 py-3 text-xs whitespace-nowrap">
                        {log.performedBy ? (
                          <div>
                            <p className="font-medium text-foreground">
                              {log.performedBy.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {log.performedBy.role}
                            </p>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">System</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {log.proofImage ? (
                          <button
                            type="button"
                            onClick={() =>
                              setProofPreview({
                                title: `${log.entityType} Proof`,
                                imageUrl: log.proofImage!,
                                amount: log.amount,
                                date: log.createdAt,
                                note: log.summary,
                              })
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            View
                          </button>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {meta && meta.totalPage > 1 && (
            <div className="px-4 border-t border-border">
              <Pagination
                currentPage={meta.page}
                totalPages={meta.totalPage}
                totalItems={meta.total}
                itemsPerPage={meta.limit}
              />
            </div>
          )}
        </div>
      )}

      <ProofPreviewModal
        proof={proofPreview}
        onClose={() => setProofPreview(null)}
      />
    </div>
  );
}
