"use client";

import CancelSubmitButton from "@/components/shared/CancelSubmitButton";
import CustomModal from "@/components/shared/CustomModal";
import { useUpdateProfileMutation } from "@/redux/api/getMe/getMeApi";
import { setUser } from "@/redux/features/user/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { formatTaka, getApiErrorMessage } from "@/utils/formatMoney";
import { Lock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface PersonalGoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentGoal: number;
  currentMonthLabel: string;
}

const GOAL_PRESETS = [500, 1000, 2000, 3000, 5000];

function PersonalGoalForm({
  onClose,
  currentGoal,
  currentMonthLabel,
}: Omit<PersonalGoalModalProps, "isOpen">) {
  const dispatch = useAppDispatch();
  const [updateProfile, { isLoading }] = useUpdateProfileMutation();

  const [goalInput, setGoalInput] = useState(
    currentGoal > 0 ? String(currentGoal) : "",
  );

  const saveGoal = async (nextGoal: number) => {
    try {
      const res = await updateProfile({
        personalMonthlyGoal: nextGoal,
      }).unwrap();
      if (res.data) {
        dispatch(
          setUser({
            id: res.data.id,
            name: res.data.name,
            email: res.data.email,
            phone: res.data.phone,
            profileImage: res.data.profileImage,
            role: res.data.role,
            status: res.data.status,
            joinedAt: res.data.joinedAt,
            mustChangePassword: res.data.mustChangePassword,
            personalMonthlyGoal: res.data.personalMonthlyGoal,
          }),
        );
      }
      toast.success(
        nextGoal > 0
          ? `Personal monthly goal set to ${formatTaka(nextGoal)}`
          : "Personal monthly goal cleared",
      );
      onClose();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to save personal goal"));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numeric = goalInput.trim() === "" ? 0 : Number(goalInput);
    if (Number.isNaN(numeric) || numeric < 0) {
      toast.error("Please enter a valid non-negative amount");
      return;
    }
    await saveGoal(numeric);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-start gap-2.5 p-3 rounded border border-border bg-muted/50 text-xs text-muted-foreground">
        <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <p>
          <strong className="text-foreground">100% Private:</strong> Only you
          can see your personal monthly goal. It tracks your verified deposits
          each month (including <strong>{currentMonthLabel}</strong>) to help
          you stay motivated.
        </p>
      </div>

      <div className="space-y-2">
        <label className="block text-xs font-medium text-text-description">
          Personal Monthly Savings Goal (BDT)
        </label>
        <input
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 2000 (enter 0 to turn off)"
          value={goalInput}
          onChange={(e) => setGoalInput(e.target.value)}
          className="w-full h-10 px-3 rounded border border-input bg-card text-sm font-money text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15 focus:border-primary"
        />

        {/* Quick-select presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          {GOAL_PRESETS.map((amt) => {
            const active = Number(goalInput) === amt;
            return (
              <button
                key={amt}
                type="button"
                onClick={() => setGoalInput(String(amt))}
                className={`px-2.5 py-1 rounded border text-xs font-money font-medium transition-colors cursor-pointer ${
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border bg-card text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {formatTaka(amt)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 pt-1">
        {currentGoal > 0 ? (
          <button
            type="button"
            disabled={isLoading}
            onClick={() => saveGoal(0)}
            className="text-xs font-medium text-error hover:underline cursor-pointer disabled:opacity-50"
          >
            Remove Goal
          </button>
        ) : (
          <span />
        )}
        <div className="flex-1">
          <CancelSubmitButton
            handleCancel={onClose}
            loading={isLoading}
            submitText="Save Personal Goal"
          />
        </div>
      </div>
    </form>
  );
}

/**
 * Private Self-Only Personal Monthly Goal Modal
 */
export default function PersonalGoalModal({
  isOpen,
  onClose,
  currentGoal,
  currentMonthLabel,
}: PersonalGoalModalProps) {
  return (
    <CustomModal
      isOpen={isOpen}
      onClose={onClose}
      title="My Personal Monthly Goal"
      subtitle="Set a private monthly savings target just for yourself"
      className="max-w-md"
    >
      {isOpen && (
        <PersonalGoalForm
          key={currentGoal}
          onClose={onClose}
          currentGoal={currentGoal}
          currentMonthLabel={currentMonthLabel}
        />
      )}
    </CustomModal>
  );
}
