"use client";

import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import { useChangeMemberRoleMutation } from "@/redux/api/members/membersApi";
import { UserRole } from "@/types/backend";
import { IMember } from "@/types/global";
import { getApiErrorMessage } from "@/utils/formatMoney";
import { CheckCircle2, Circle, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ChangeRoleModalProps {
  member: IMember | null;
  onClose: () => void;
}

const ROLE_OPTIONS: { value: UserRole; title: string; desc: string }[] = [
  {
    value: "MEMBER",
    title: "Member",
    desc: "View group ledger, submit deposit & return requests, and export statements.",
  },
  {
    value: "CASHIER",
    title: "Cashier",
    desc: "Approve/reject other members' deposits & returns, manage payment accounts, targets, transfers & charges. Own entries require Admin approval.",
  },
  {
    value: "ADMIN",
    title: "Admin (Transfer Ownership)",
    desc: "Only 1 active Admin is allowed. Selecting this makes this member the sole Admin and steps you down automatically.",
  },
];

function ChangeRoleForm({
  member,
  onClose,
}: {
  member: IMember;
  onClose: () => void;
}) {
  const [selectedRole, setSelectedRole] = useState<UserRole>(member.role);
  const [previousAdminNextRole, setPreviousAdminNextRole] = useState<
    "CASHIER" | "MEMBER"
  >("CASHIER");

  const [changeMemberRole, { isLoading }] = useChangeMemberRoleMutation();

  const isAdminTransfer = selectedRole === "ADMIN" && member.role !== "ADMIN";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedRole === member.role) {
      onClose();
      return;
    }

    try {
      await changeMemberRole({
        id: member.id,
        role: selectedRole,
        previousAdminNextRole: isAdminTransfer
          ? previousAdminNextRole
          : undefined,
      }).unwrap();

      toast.success(
        isAdminTransfer
          ? `Admin transferred to ${member.name}. You are now ${previousAdminNextRole}.`
          : `${member.name}'s role updated to ${selectedRole}`,
      );
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update member role"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        {ROLE_OPTIONS.map((opt) => {
          const active = selectedRole === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => setSelectedRole(opt.value)}
              className={`w-full text-left flex items-start gap-2.5 p-3 rounded border transition-colors cursor-pointer ${
                active
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:bg-muted/40"
              }`}
            >
              {active ? (
                <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              ) : (
                <Circle className="w-4 h-4 text-muted-foreground/60 shrink-0 mt-0.5" />
              )}
              <div className="text-xs">
                <p className="font-semibold text-foreground">
                  {opt.title}
                  {member.role === opt.value && (
                    <span className="ml-1.5 text-[10px] font-medium text-muted-foreground">
                      (Current)
                    </span>
                  )}
                </p>
                <p className="text-muted-foreground mt-0.5 leading-relaxed">
                  {opt.desc}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* When transferring Admin, let outgoing Admin pick their own next role (Cashier or Member) */}
      {isAdminTransfer && (
        <div className="space-y-2.5 pt-2 border-t border-border">
          <p className="text-xs font-medium text-text-description">
            Your role after transferring Admin to {member.name}:
          </p>

          <div className="grid grid-cols-2 gap-2">
            {(
              [
                {
                  value: "CASHIER" as const,
                  label: "Cashier (Recommended)",
                  sub: "Can still approve & manage accounts",
                },
                {
                  value: "MEMBER" as const,
                  label: "Member",
                  sub: "Regular group member access",
                },
              ] as const
            ).map((choice) => {
              const selected = previousAdminNextRole === choice.value;
              return (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setPreviousAdminNextRole(choice.value)}
                  className={`text-left p-2.5 rounded border transition-colors cursor-pointer ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/40"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    {selected ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
                    )}
                    <span>{choice.label}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {choice.sub}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded border border-amber-200 bg-amber-50 text-[11px] text-amber-900">
            <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5 text-amber-700" />
            <p>
              <strong>{member.name}</strong> will immediately become the sole
              Admin, and your account will switch to{" "}
              <strong>{previousAdminNextRole}</strong>.
            </p>
          </div>
        </div>
      )}

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isLoading}
        submitText={isAdminTransfer ? "Transfer Admin" : "Save Role"}
      />
    </form>
  );
}

/**
 * Admin modal to change another active member's role (MEMBER / CASHIER)
 * or transfer sole ADMIN ownership cleanly.
 */
export default function ChangeRoleModal({
  member,
  onClose,
}: ChangeRoleModalProps) {
  return (
    <CustomModal
      isOpen={Boolean(member)}
      onClose={onClose}
      title="Change Role / Transfer Admin"
      subtitle={member ? `${member.name} (${member.email})` : undefined}
      className="max-w-md"
    >
      {member && (
        <ChangeRoleForm key={member.id} member={member} onClose={onClose} />
      )}
    </CustomModal>
  );
}
