"use client";

import { Header } from "@/components/dashboard/header";
import { Sidebar } from "@/components/dashboard/sidebar";
import InlineLoader from "@/components/shared/InlineLoader";
import useAuth from "@/hooks/useAuth";
import { useGetMeQuery } from "@/redux/api/getMe/getMeApi";
import { logout, setUser } from "@/redux/features/user/authSlice";
import { useAppDispatch } from "@/redux/hook";
import { useRouter } from "next/navigation";
import React, { useEffect, useState } from "react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const isAuthenticated = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Sync live user profile & role from backend on mount
  const { data: meRes, isLoading, isError } = useGetMeQuery(undefined, {
    skip: !isAuthenticated,
  });

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, router]);

  useEffect(() => {
    if (meRes?.data) {
      dispatch(setUser(meRes.data));
    }
  }, [meRes, dispatch]);

  useEffect(() => {
    if (isError) {
      dispatch(logout());
      router.replace("/login");
    }
  }, [isError, dispatch, router]);

  if (!isAuthenticated || (isLoading && !meRes)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dashboard-bg">
        <InlineLoader text="Loading your workspace..." />
      </div>
    );
  }

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
          <div className="w-full p-4 sm:p-5 lg:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
