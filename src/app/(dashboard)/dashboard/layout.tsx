"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import InlineLoader from "@/components/shared/InlineLoader";
import useAuth from "@/hooks/useAuth";
import baseApi from "@/redux/api/baseApi";
import { useGetMeQuery } from "@/redux/api/getMe/getMeApi";
import { logout, setUser } from "@/redux/features/user/authSlice";
import { useAppDispatch } from "@/redux/hook";
import Cookies from "js-cookie";
import { AlertTriangle, WifiOff } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync live user profile & role from backend on mount
  const {
    data: meRes,
    isLoading,
    isError,
    error,
    refetch,
  } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  const errorStatus =
    error && typeof error === "object" && "status" in error
      ? (error as { status: number | string }).status
      : null;
  const isAuthError = errorStatus === 401;
  const isTransientError = isError && !isAuthError;

  useEffect(() => {
    if (!isAuthenticated) {
      // Clear stale cookies so proxy.ts never bounces /login -> /dashboard in a loop
      Cookies.remove("accessToken");
      Cookies.remove("auth_token");
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (meRes?.data) {
      dispatch(setUser(meRes.data));
    }
  }, [meRes, dispatch]);

  // Only force logout on confirmed 401 unauthorized (preserve session on offline / 5xx glitches)
  useEffect(() => {
    if (isAuthError) {
      dispatch(logout());
      dispatch(baseApi.util.resetApiState());
      router.replace("/login");
    }
  }, [isAuthError, dispatch, router]);

  if (!isAuthenticated || (isLoading && !meRes)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dashboard-bg">
        <InlineLoader text="Loading your workspace..." />
      </div>
    );
  }

  const showTempPasswordBanner =
    Boolean(meRes?.data?.mustChangePassword) &&
    pathname !== "/dashboard/profile";

  return (
    <div className="flex h-screen bg-dashboard-bg">
      <Sidebar
        isOpen={sidebarOpen}
        isCollapsed={sidebarCollapsed}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <Header
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          sidebarOpen={sidebarOpen}
          isCollapsed={sidebarCollapsed}
          onCollapseToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="w-full p-4 sm:p-5 lg:p-6">
            {isTransientError && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-destructive/30 bg-destructive/5 px-4 py-2.5 text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <WifiOff className="w-4 h-4 text-destructive shrink-0" />
                  <span>
                    Unable to reach the server right now. Check your connection
                    and retry — your session has been preserved.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => refetch()}
                  className="font-semibold text-destructive underline hover:opacity-80 cursor-pointer"
                >
                  Retry
                </button>
              </div>
            )}
            {showTempPasswordBanner && (
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5 rounded-md border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-950">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>
                    You signed in with a temporary password. Please update it to
                    keep your account secure.
                  </span>
                </div>
                <Link
                  href="/dashboard/profile#password"
                  className="font-semibold text-amber-900 underline hover:text-amber-700 cursor-pointer"
                >
                  Change Password →
                </Link>
              </div>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
