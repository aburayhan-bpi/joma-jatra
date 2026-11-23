"use client";

import StatusPill from "@/components/shared/StatusPill";
import { SIDEBAR_ITEMS, SidebarNavItem } from "@/lib/constants";
import { selectUser } from "@/redux/features/user/authSlice";
import { useAppSelector } from "@/redux/hook";
import {
  HandCoins,
  History,
  Landmark,
  LayoutDashboard,
  PiggyBank,
  Sheet,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import { LogoutButton } from "./LogoutButton";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

const iconMap: Record<SidebarNavItem["icon"], React.ReactNode> = {
  LayoutDashboard: <LayoutDashboard className="w-[17px] h-[17px] shrink-0" />,
  Sheet: <Sheet className="w-[17px] h-[17px] shrink-0" />,
  PiggyBank: <PiggyBank className="w-[17px] h-[17px] shrink-0" />,
  HandCoins: <HandCoins className="w-[17px] h-[17px] shrink-0" />,
  Users: <Users className="w-[17px] h-[17px] shrink-0" />,
  Landmark: <Landmark className="w-[17px] h-[17px] shrink-0" />,
  History: <History className="w-[17px] h-[17px] shrink-0" />,
  UserCircle: <UserCircle className="w-[17px] h-[17px] shrink-0" />,
};

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname();
  const user = useAppSelector(selectUser);

  // Filter sidebar links by the authenticated user's role
  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    user?.role ? item.roles.includes(user.role) : true,
  );

  const isNavItemActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      {/* Mobile backdrop overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-foreground/20 backdrop-blur-[1px] lg:hidden z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-200 z-40 lg:relative lg:z-0 ${
          isOpen ? "w-60" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-[72px]" : "lg:w-60"}`}
      >
        <div className="flex flex-col h-full">
          {/* Brand Logo Header */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <Link
              href="/dashboard"
              className={`flex items-center cursor-pointer ${
                isCollapsed ? "lg:justify-center lg:w-full" : ""
              }`}
            >
              {isCollapsed ? (
                <Image
                  src="/joma-jatra-icononly.png"
                  alt="JomaJatra"
                  width={36}
                  height={36}
                  draggable={false}
                  className="h-9 w-9 object-contain"
                />
              ) : (
                <Image
                  src="/joma-jatra.png"
                  alt="JomaJatra"
                  width={132}
                  height={42}
                  draggable={false}
                  className="h-9 w-auto object-contain"
                />
              )}
            </Link>

            <button
              type="button"
              onClick={onClose}
              className="lg:hidden p-1.5 text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Primary Navigation Links */}
          <nav className="flex-1 overflow-y-auto px-2.5 py-3 space-y-0.5">
            {visibleItems.map((item) => {
              const active = isNavItemActive(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onClose}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-colors cursor-pointer ${
                    active
                      ? "bg-sidebar-primary text-sidebar-primary-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  } ${isCollapsed ? "lg:justify-center lg:px-2" : ""}`}
                >
                  {iconMap[item.icon]}
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          {/* Compact Role Indicator + Logout */}
          <div className="p-2.5 border-t border-sidebar-border space-y-2">
            {!isCollapsed && user && (
              <div className="px-2.5 py-2 rounded bg-background border border-border flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user.name}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {user.email}
                  </p>
                </div>
                <StatusPill status={user.role} />
              </div>
            )}
            <LogoutButton isCollapsed={isCollapsed} />
          </div>
        </div>
      </aside>
    </>
  );
}
