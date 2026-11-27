"use client";

import { Pagination } from "@/components/dashboard/pagination";
import { SearchBar } from "@/components/dashboard/search-bar";
import AppSelect from "@/components/shared/AppSelect";
import InlineLoader from "@/components/shared/InlineLoader";
import PageHeader from "@/components/shared/PageHeader";
import StatusPill from "@/components/shared/StatusPill";
import {
  useGetMembersQuery,
  useRestoreMemberMutation,
} from "@/redux/api/members/membersApi";
import { selectCurrentUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hooks";
import { USER_ROLES, UserRole } from "@/types/backend";
import { IMember } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import { formatTaka, getApiErrorMessage } from "@/utils/formatMoney";
import useSetParamsForPagination from "@/utils/setParamsForPagination";
import {
  FileText,
  Pencil,
  RotateCcw,
  ShieldCheck,
  UserMinus,
  UserPlus,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import ChangeRoleModal from "./ChangeRoleModal";
import DeactivateMemberModal from "./DeactivateMemberModal";
import MemberFormModal from "./MemberFormModal";

/**
 * Members Directory Page (/dashboard/members)
 * Lists active and former members with live financial summaries, clickable
 * Audit Trail links, and Admin management actions (Add, Edit, Role, Close, Restore).
 */
export default function MembersPage() {
  const user = useAppSelector(selectCurrentUser);
  const isAdmin = user?.role === "ADMIN";
  const isManager = isAdmin || user?.role === "CASHIER";

  const searchParams = useSearchParams();
  const setParams = useSetParamsForPagination();

  const tab = searchParams.get("tab") === "former" ? "former" : "active";
  const page = Number(searchParams.get("page") || "1");
  const search = searchParams.get("search") || "";
  const role = (searchParams.get("role") || "") as UserRole | "";

  const { data: membersRes, isLoading } = useGetMembersQuery({
    page,
    limit: 12,
    search: search || undefined,
    role: role || undefined,
    status: tab === "active" ? "ACTIVE" : "INACTIVE",
    includeDeleted: tab === "former" ? true : undefined,
  });

  const [restoreMember, { isLoading: isRestoring }] =
    useRestoreMemberMutation();

  const [formOpen, setFormOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<IMember | null>(null);
  const [closingMember, setClosingMember] = useState<IMember | null>(null);
  const [roleModalMember, setRoleModalMember] = useState<IMember | null>(null);

  const members = membersRes?.data || [];
  const meta = membersRes?.meta;

  const handleRestore = async (member: IMember) => {
    try {
      await restoreMember(member.id).unwrap();
      toast.success(`${member.name} has been restored to Active`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to restore member"));
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        title="Members"
        subtitle="Transparent directory of active and former group members with live savings balances"
        actions={
          isAdmin && (
            <button
              type="button"
              onClick={() => {
                setEditingMember(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-primary bg-primary text-primary-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.08)] hover:bg-brand-dark hover:border-brand-dark transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Add Member
            </button>
          )
        }
      />

      {/* Tabs + Search & Role Filter */}
      <div className="bg-card border border-border rounded-md p-3.5 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex items-center p-0.5 rounded bg-muted border border-border">
          <button
            type="button"
            onClick={() => setParams({ tab: null, search: null, page: 1 })}
            className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer ${
              tab === "active"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Active Members
          </button>
          <button
            type="button"
            onClick={() => setParams({ tab: "former", search: null, page: 1 })}
            className={`px-3 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer ${
              tab === "former"
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Former / Removed
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 flex-1 justify-end min-w-60">
          <SearchBar
            placeholder="Search name, email, or phone..."
            className="flex-1 max-w-xs"
          />
          <AppSelect
            value={role}
            onChange={(val) => setParams({ role: val || null, page: 1 })}
            options={[
              { value: "", label: "All Roles" },
              ...USER_ROLES.map((r) => ({ value: r, label: r })),
            ]}
            className="w-34 text-xs"
          />
        </div>
      </div>

      {/* Members Table */}
      {isLoading ? (
        <InlineLoader text="Loading members..." />
      ) : members.length === 0 ? (
        <div className="bg-card border border-border rounded-md p-8 text-center text-sm text-muted-foreground">
          {tab === "former"
            ? "No former or removed members."
            : "No active members match your search."}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/60 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground border-b border-border">
                <tr>
                  <th className="px-4 py-3">Member</th>
                  <th className="px-4 py-3">Role & Status</th>
                  <th className="px-4 py-3">Joined</th>
                  <th className="px-4 py-3 text-right">Deposited</th>
                  <th className="px-4 py-3 text-right">Returned</th>
                  <th className="px-4 py-3 text-right">Net Balance</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => {
                  const isSelf = member.id === user?.id;
                  return (
                    <tr key={member.id} className="hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="relative w-8 h-8 rounded bg-[#e9f4ef] border border-[#cce3d8] text-[#046c4e] text-xs font-semibold flex items-center justify-center shrink-0 overflow-hidden">
                            {member.profileImage ? (
                              <Image
                                src={member.profileImage}
                                alt={member.name}
                                fill
                                sizes="32px"
                                className="object-cover"
                              />
                            ) : (
                              member.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/members/${member.id}`}
                              title={member.name}
                              className="font-medium text-foreground hover:text-primary transition-colors cursor-pointer block truncate"
                            >
                              {member.name}
                            </Link>
                            <p
                              className="text-[11px] text-muted-foreground truncate"
                              title={
                                member.phone
                                  ? `${member.email} • ${member.phone}`
                                  : member.email
                              }
                            >
                              {member.email}
                              {member.phone ? ` • ${member.phone}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <StatusPill status={member.role} />
                          {member.status !== "ACTIVE" && (
                            <StatusPill status={member.status} />
                          )}
                          {member.unsettledPayable > 0 && (
                            <StatusPill
                              status="PENDING"
                              label={`Unsettled ${formatTaka(member.unsettledPayable)}`}
                            />
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                        {formatDate(member.joinedAt)}
                      </td>

                      <td className="px-4 py-3 text-right font-money text-foreground whitespace-nowrap">
                        {formatTaka(member.financialSummary.totalDeposited)}
                      </td>

                      <td className="px-4 py-3 text-right font-money text-muted-foreground whitespace-nowrap">
                        {formatTaka(member.financialSummary.totalReturned)}
                      </td>

                      <td className="px-4 py-3 text-right font-semibold font-money text-primary whitespace-nowrap">
                        {formatTaka(member.financialSummary.netBalance)}
                      </td>

                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/dashboard/members/${member.id}`}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-[#b4cabe] bg-card text-xs font-medium text-foreground hover:bg-muted cursor-pointer"
                            title="View member details & full audit trail"
                          >
                            <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                            Audit
                          </Link>

                          {isManager && member.unsettledPayable > 0 && (
                            <Link
                              href={`/dashboard/returns?settleMemberId=${member.id}`}
                              className="inline-flex items-center px-2 py-1 rounded border border-amber-300 bg-amber-50 text-amber-800 text-xs font-medium hover:bg-amber-100 cursor-pointer"
                            >
                              Settle
                            </Link>
                          )}

                          {isAdmin && tab === "active" && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingMember(member);
                                  setFormOpen(true);
                                }}
                                className="p-1.5 rounded text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer"
                                title="Edit member"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </button>

                              {/* Admin can change other active members' role (Member / Cashier / Transfer Admin) */}
                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setRoleModalMember(member)}
                                  className="p-1.5 rounded text-muted-foreground hover:text-primary hover:bg-muted cursor-pointer"
                                  title="Change role or transfer Admin"
                                >
                                  <ShieldCheck className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {!isSelf && (
                                <button
                                  type="button"
                                  onClick={() => setClosingMember(member)}
                                  className="p-1.5 rounded text-muted-foreground hover:text-error hover:bg-error-5 cursor-pointer"
                                  title="Close / deactivate member"
                                >
                                  <UserMinus className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </>
                          )}

                          {isAdmin && tab === "former" && (
                            <button
                              type="button"
                              disabled={isRestoring}
                              onClick={() => handleRestore(member)}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded border border-[#b4cabe] text-xs font-medium text-primary hover:bg-muted cursor-pointer"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                              Restore
                            </button>
                          )}
                        </div>
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

      {/* Modals */}
      <MemberFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingMember(null);
        }}
        editingMember={editingMember}
      />

      <DeactivateMemberModal
        member={closingMember}
        onClose={() => setClosingMember(null)}
      />

      <ChangeRoleModal
        member={roleModalMember}
        onClose={() => setRoleModalMember(null)}
      />
    </div>
  );
}
