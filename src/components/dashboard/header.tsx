"use client";

import StatusPill from "@/components/shared/StatusPill";
import { useLogout } from "@/hooks/useLogout";
import { cn } from "@/lib/utils";
import { useGetDashboardSummaryQuery } from "@/redux/api/dashboard/dashboardApi";
import { selectUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hook";
import { Icons } from "@/utils/icons";
import { Clock, Plus, User } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

interface HeaderProps {
  onMenuClick: () => void;
  sidebarOpen: boolean;
  isCollapsed: boolean;
  onCollapseToggle: () => void;
}

export function Header({
  onMenuClick,
  sidebarOpen,
  isCollapsed,
  onCollapseToggle,
}: HeaderProps) {
  const user = useAppSelector(selectUser);
  const { handleLogout } = useLogout();
  const { data: summaryRes } = useGetDashboardSummaryQuery();

  const [showDropdown, setShowDropdown] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        userMenuRef.current &&
        !userMenuRef.current.contains(event.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isManager = user?.role === "ADMIN" || user?.role === "CASHIER";
  const pendingTotal =
    (summaryRes?.data?.counts?.pendingDepositsCount || 0) +
    (summaryRes?.data?.counts?.pendingReturnsCount || 0);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-card border-b border-border px-4 lg:px-6">
      <div className="flex items-center gap-3">
        {/* Mobile Sidebar Trigger */}
        <button
          type="button"
          onClick={onMenuClick}
          className={cn(
            "p-2 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors cursor-pointer lg:hidden",
            sidebarOpen && "bg-accent text-primary",
          )}
          aria-label="Toggle menu"
        >
          {sidebarOpen ? (
            <Icons.TbLayoutSidebarLeftCollapseFilled className="w-5 h-5" />
          ) : (
            <Icons.TbLayoutSidebarRightCollapseFilled className="w-5 h-5" />
          )}
        </button>

        {/* Desktop Sidebar Collapse Toggle */}
        <button
          type="button"
          onClick={onCollapseToggle}
          className="hidden lg:inline-flex items-center justify-center w-8 h-8 rounded border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
          aria-label="Toggle sidebar width"
        >
          {isCollapsed ? (
            <Icons.TbLayoutSidebarRightCollapseFilled className="w-4 h-4" />
          ) : (
            <Icons.TbLayoutSidebarLeftCollapseFilled className="w-4 h-4" />
          )}
        </button>

        <div className="hidden sm:block">
          <p className="text-xs font-medium text-muted-foreground">
            JomaJatra Savings Ledger
          </p>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-2.5">
        {/* Pending approvals shortcut for Admin / Cashier */}
        {isManager && pendingTotal > 0 && (
          <Link
            href="/dashboard/deposits?status=PENDING"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded bg-amber-50 border border-amber-200/80 text-amber-800 text-xs font-medium hover:bg-amber-100/70 transition-colors cursor-pointer"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>{pendingTotal} Pending</span>
          </Link>
        )}

        {/* Quick Deposit CTA */}
        <Link
          href="/dashboard/deposits?action=new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-primary text-primary-foreground text-xs font-medium hover:bg-brand-dark transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Add Deposit</span>
        </Link>

        {/* User Menu */}
        <div className="relative" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setShowDropdown((prev) => !prev)}
            className={cn(
              "flex items-center gap-2.5 p-1 pr-2 rounded border border-transparent hover:border-border hover:bg-muted/60 transition-colors cursor-pointer",
              showDropdown && "bg-muted/60 border-border",
            )}
            aria-expanded={showDropdown}
            aria-haspopup="true"
          >
            <div className="w-8 h-8 rounded bg-brand-10 text-primary font-semibold text-xs flex items-center justify-center border border-brand-20 overflow-hidden relative">
              {user?.profileImage ? (
                <Image
                  src={user.profileImage}
                  alt={user.name}
                  fill
                  sizes="32px"
                  className="object-cover"
                />
              ) : (
                user?.name?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-foreground leading-tight">
                {user?.name || "Member"}
              </p>
              <p className="text-[11px] text-muted-foreground leading-tight">
                {user?.role || "MEMBER"}
              </p>
            </div>
            <Icons.ChevronDown
              className={cn(
                "w-3.5 h-3.5 text-muted-foreground transition-transform",
                showDropdown && "rotate-180",
              )}
            />
          </button>

          {showDropdown && (
            <div className="absolute right-0 top-full mt-1.5 w-56 rounded-md border border-border bg-card shadow-[0_10px_28px_rgba(7,42,31,0.1)] overflow-hidden">
              <div className="px-3.5 py-2.5 border-b border-border bg-background/70">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {user?.name}
                  </p>
                  {user?.role && <StatusPill status={user.role} />}
                </div>
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {user?.email}
                </p>
              </div>

              <div className="p-1 space-y-0.5">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setShowDropdown(false)}
                  className="flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium text-text-description hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                >
                  <User className="w-3.5 h-3.5" />
                  My Profile & Password
                </Link>
                {user?.id && (
                  <Link
                    href={`/dashboard/members/${user.id}`}
                    onClick={() => setShowDropdown(false)}
                    className="flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium text-text-description hover:bg-muted hover:text-foreground transition-colors cursor-pointer"
                  >
                    <Icons.ClipboardList className="w-3.5 h-3.5" />
                    My Audit Trail
                  </Link>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setShowDropdown(false);
                    handleLogout();
                  }}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded text-xs font-medium text-error hover:bg-error-5 transition-colors cursor-pointer"
                >
                  <Icons.LogOut className="w-3.5 h-3.5" />
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
