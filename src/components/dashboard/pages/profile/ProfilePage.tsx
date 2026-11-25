"use client";

import CustomButton from "@/components/shared/CustomButton";
import InlineLoader from "@/components/shared/InlineLoader";
import LedgerStatCard from "@/components/shared/LedgerStatCard";
import PageHeader from "@/components/shared/PageHeader";
import ProofUploadField from "@/components/shared/ProofUploadField";
import StatusPill from "@/components/shared/StatusPill";
import { useChangePasswordMutation } from "@/redux/api/auth/authApi";
import {
  useGetMeQuery,
  useUpdateProfileMutation,
} from "@/redux/api/getMe/getMeApi";
import { setTokens, setUser } from "@/redux/features/user/authSlice";
import { useAppDispatch } from "@/redux/hooks";
import { IUserProfile } from "@/types/global";
import { formatDate } from "@/utils/formatDate";
import { formatTaka, getApiErrorMessage } from "@/utils/formatMoney";
import {
  ArrowRight,
  CalendarCheck2,
  Lock,
  PiggyBank,
  ShieldCheck,
  User,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Profile Details Form — mounts once profile data loads so initial state
 * comes straight from props without needing a useEffect sync.
 */
function ProfileDetailsForm({ profile }: { profile: IUserProfile }) {
  const dispatch = useAppDispatch();
  const [updateProfile, { isLoading: isUpdatingProfile }] =
    useUpdateProfileMutation();

  const [name, setName] = useState(profile.name || "");
  const [phone, setPhone] = useState(profile.phone || "");
  const [profileImage, setProfileImage] = useState(profile.profileImage || "");
  const [personalMonthlyGoal, setPersonalMonthlyGoal] = useState(
    profile.personalMonthlyGoal && profile.personalMonthlyGoal > 0
      ? String(profile.personalMonthlyGoal)
      : "",
  );

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Name cannot be empty");
      return;
    }

    const parsedGoal =
      personalMonthlyGoal.trim() === "" ? 0 : Number(personalMonthlyGoal);
    if (Number.isNaN(parsedGoal) || parsedGoal < 0) {
      toast.error("Personal monthly goal cannot be negative");
      return;
    }

    try {
      const res = await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        profileImage: profileImage.trim(),
        personalMonthlyGoal: parsedGoal,
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
      toast.success("Profile updated");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update profile"));
    }
  };

  return (
    <form
      onSubmit={handleProfileSubmit}
      className="bg-card border border-border rounded-md p-5 space-y-4"
    >
      <div className="flex items-center gap-2 pb-3 border-b border-border">
        <User className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Personal Details
        </h2>
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Email Address
        </label>
        <input
          type="email"
          value={profile.email}
          disabled
          className="w-full h-9 px-3 rounded border border-input bg-muted/50 text-sm text-muted-foreground"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Full Name
        </label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
      </div>

      <div className="space-y-1.5">
        <label className="block text-xs font-medium text-text-description">
          Phone Number
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
          Personal Monthly Savings Goal (Private — BDT)
        </label>
        <input
          type="number"
          min={0}
          step="any"
          placeholder="e.g. 2000 (optional, 0 to turn off)"
          value={personalMonthlyGoal}
          onChange={(e) => setPersonalMonthlyGoal(e.target.value)}
          className="w-full h-9 px-3 rounded border border-input bg-card text-sm font-money text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
        />
        <p className="text-[11px] text-muted-foreground">
          Only visible to you on your Overview dashboard. Other members and
          Admin cannot see this.
        </p>
      </div>

      <ProofUploadField
        value={profileImage}
        onChange={setProfileImage}
        label="Profile Photo (Optional)"
        folder="joma-jatra/avatars"
      />

      <div className="pt-2">
        <CustomButton
          type="submit"
          btnText="Save Profile"
          loading={isUpdatingProfile}
          className="w-full sm:w-auto px-5 rounded bg-primary text-primary-foreground hover:bg-brand-dark cursor-pointer"
        />
      </div>
    </form>
  );
}

/**
 * Self Profile & Password Security Page (/dashboard/profile)
 */
export default function ProfilePage() {
  const dispatch = useAppDispatch();
  const { data: meRes, isLoading } = useGetMeQuery();
  const [changePassword, { isLoading: isChangingPassword }] =
    useChangePasswordMutation();

  const profile = meRes?.data;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newPassword.length < 6) {
      toast.error("New password must be at least 6 characters");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("New password and confirmation do not match");
      return;
    }

    try {
      const res = await changePassword({
        currentPassword,
        newPassword,
      }).unwrap();
      // Rotate stored session tokens so the current browser stays signed in after revoking other sessions
      if (res?.data?.accessToken) {
        dispatch(
          setTokens({
            accessToken: res.data.accessToken,
            refreshToken: res.data.refreshToken,
          }),
        );
      }
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to change password"));
    }
  };

  if (isLoading) {
    return <InlineLoader text="Loading profile..." />;
  }

  return (
    <div className="space-y-5">
      <PageHeader
        title="My Profile & Security"
        subtitle="Manage your personal contact information and account password"
        actions={
          profile?.id && (
            <Link
              href={`/dashboard/members/${profile.id}`}
              className="inline-flex items-center justify-center gap-1.5 h-9 min-h-9 px-3.5 rounded border border-[#b4cabe] bg-card text-foreground text-xs font-medium leading-none shadow-[0_1px_2px_rgba(7,42,31,0.05)] hover:bg-muted hover:border-[#8faea0] cursor-pointer"
            >
              My Full Audit Trail
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )
        }
      />

      {profile?.mustChangePassword && (
        <div className="rounded-md bg-amber-50 border border-amber-200 px-4 py-3 text-xs text-foreground">
          <strong className="text-amber-800">Action Recommended: </strong>
          You are currently using a temporary password created by Admin. Please
          set a personal password below.
        </div>
      )}

      {/* Account Snapshot Eye-Cold Stat Cards */}
      {profile && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <LedgerStatCard
            label="Role & Access"
            value={profile.role}
            icon={<ShieldCheck className="w-[18px] h-[18px]" />}
            tone="indigo"
            subtext={
              <div className="mt-0.5">
                <StatusPill status={profile.status} />
              </div>
            }
          />
          <LedgerStatCard
            label="Member Since"
            value={profile.joinedAt ? formatDate(profile.joinedAt) : "—"}
            icon={<CalendarCheck2 className="w-[18px] h-[18px]" />}
            tone="teal"
          />
          <LedgerStatCard
            label="Total Deposited"
            value={formatTaka(profile.financialSummary.totalDeposited)}
            icon={<PiggyBank className="w-[18px] h-[18px]" />}
            tone="steel"
          />
          <LedgerStatCard
            label="Net Balance"
            value={formatTaka(profile.financialSummary.netBalance)}
            valueClassName="text-primary"
            icon={<Wallet className="w-[18px] h-[18px]" />}
            tone="emerald"
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {profile && (
          <ProfileDetailsForm
            key={`${profile.id}-${profile.name}-${profile.phone || ""}-${profile.personalMonthlyGoal || 0}`}
            profile={profile}
          />
        )}

        <form
          id="password"
          onSubmit={handlePasswordSubmit}
          className="bg-card border border-border rounded-md p-5 space-y-4 h-fit"
        >
          <div className="flex items-center gap-2 pb-3 border-b border-border">
            <Lock className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              Change Password
            </h2>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Current Password
            </label>
            <input
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              placeholder="At least 6 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-text-description">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full h-9 px-3 rounded border border-input bg-card text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/15"
            />
          </div>

          <div className="pt-2">
            <CustomButton
              type="submit"
              btnText="Update Password"
              loading={isChangingPassword}
              className="w-full sm:w-auto px-5 rounded bg-primary text-primary-foreground hover:bg-brand-dark cursor-pointer"
            />
          </div>
        </form>
      </div>
    </div>
  );
}
