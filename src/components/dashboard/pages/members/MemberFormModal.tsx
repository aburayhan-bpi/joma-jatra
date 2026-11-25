"use client";

import AppSelect from "@/components/shared/AppSelect";
import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import {
  useCreateMemberMutation,
  useUpdateMemberMutation,
} from "@/redux/api/members/membersApi";
import { UserRole } from "@/types/backend";
import { IMember } from "@/types/global";
import { getApiErrorMessage, toDateInputValue } from "@/utils/formatMoney";
import { useState } from "react";
import { toast } from "sonner";

interface MemberFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingMember?: IMember | null;
}

function MemberForm({
  onClose,
  editingMember,
}: Omit<MemberFormModalProps, "isOpen">) {
  const isEditing = Boolean(editingMember);

  const [createMember, { isLoading: isCreating }] = useCreateMemberMutation();
  const [updateMember, { isLoading: isUpdating }] = useUpdateMemberMutation();

  const [name, setName] = useState(editingMember?.name || "");
  const [email, setEmail] = useState(editingMember?.email || "");
  const [phone, setPhone] = useState(editingMember?.phone || "");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>(editingMember?.role || "MEMBER");
  const [joinedAt, setJoinedAt] = useState(
    toDateInputValue(editingMember?.joinedAt),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Member name is required");
      return;
    }

    try {
      if (isEditing && editingMember) {
        await updateMember({
          id: editingMember.id,
          name: name.trim(),
          // Send empty string explicitly so clearing phone persists
          phone: phone.trim(),
          joinedAt,
        }).unwrap();
        toast.success("Member details updated");
      } else {
        if (!email.trim()) {
          toast.error("Email is required");
          return;
        }
        if (password.length < 6) {
          toast.error("Initial password must be at least 6 characters");
          return;
        }
        await createMember({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim() || undefined,
          password,
          role,
          joinedAt,
          mustChangePassword: true,
        }).unwrap();
        toast.success("Member added to the group");
      }
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save member"));
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Full Name
        </label>
        <input
          type="text"
          required
          placeholder="e.g. Tanvir Ahmed"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Email Address
        </label>
        <input
          type="email"
          required
          disabled={isEditing}
          placeholder="member@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 disabled:opacity-60"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Phone (Optional)
          </label>
          <input
            type="text"
            placeholder="017XXXXXXXX"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>

        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text-description">
            Join Date
          </label>
          <input
            type="date"
            required
            value={joinedAt}
            onChange={(e) => setJoinedAt(e.target.value)}
            className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
          />
        </div>
      </div>

      {!isEditing && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Temporary Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="Min 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Role
            </label>
            <AppSelect
              value={role}
              onChange={(val) => setRole(val as UserRole)}
              options={[
                { value: "MEMBER", label: "Member" },
                { value: "CASHIER", label: "Cashier" },
              ]}
            />
          </div>
        </div>
      )}

      <CancelSubmitButton
        handleCancel={onClose}
        loading={isCreating || isUpdating}
        submitText={isEditing ? "Save Changes" : "Create Member"}
      />
    </form>
  );
}

/**
 * Admin modal to add a new group member or edit an existing member's details.
 */
export default function MemberFormModal({
  isOpen,
  onClose,
  editingMember,
}: MemberFormModalProps) {
  const isEditing = Boolean(editingMember);

  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Edit Member Details" : "Add New Member"}
      subtitle={
        isEditing
          ? "Update contact info or join date"
          : "Only Admins can create member accounts"
      }
      className="max-w-md"
    >
      {isOpen && (
        <MemberForm
          key={editingMember?.id || "new-member"}
          onClose={onClose}
          editingMember={editingMember}
        />
      )}
    </CustomModal>
  );
}
