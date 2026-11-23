"use client";

import type React from "react";

import { SIDEBAR_ITEMS } from "@/lib/constants";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icons } from "../../utils/icons";
import { LogoutButton } from "./LogoutButton";

interface SidebarProps {
  isOpen: boolean;
  isCollapsed: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, isCollapsed, onClose }: SidebarProps) {
  const pathname = usePathname();

  //   const user = useAppSelector((state) => state.auth.user);
  const user = {
    role: "ADMIN",
  };

  const visibleItems = SIDEBAR_ITEMS.filter((item) =>
    item.roles.includes(user?.role || ""),
  );

  const getIcon = (iconName: string) => {
    const iconMap: Record<string, React.ReactNode> = {
      LayoutDashboard: <Icons.LayoutDashboard className="w-5 h-5" />,
    };
    return iconMap[iconName];
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/10 backdrop-blur-sm lg:hidden z-30"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed left-0 top-0 h-screen bg-sidebar border-r border-sidebar-border transition-all duration-300 z-40 lg:relative lg:z-0 ${
          isOpen ? "w-64" : "-translate-x-full lg:translate-x-0"
        } ${isCollapsed ? "lg:w-20" : "lg:w-64"}`}
      >
        <div className="flex flex-col h-full">
          <div className="h-16 flex items-center justify-between px-4 border-b border-sidebar-border">
            <div
              className={`flex items-center gap-2 ${
                isCollapsed ? "lg:justify-center lg:w-full" : ""
              }`}
            >
              <Link
                href={"/"}
                title="Go Homepage"
                className="flex items-center gap-3 cursor-pointer"
              >
                {isCollapsed ? (
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center overflow-hidden">
                    <Image
                      src={"/joma-jatra-icononly.png"}
                      alt="JomaJatra"
                      width={40}
                      height={40}
                      draggable={false}
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <Image
                    src={"/joma-jatra.png"}
                    alt="JomaJatra"
                    width={136}
                    height={44}
                    draggable={false}
                    className="h-10 w-auto object-contain"
                  />
                )}
              </Link>
            </div>
            <button
              onClick={onClose}
              className="lg:hidden text-muted-foreground hover:text-foreground cursor-pointer"
              aria-label="Close sidebar"
            >
              <Icons.X className="w-5 h-5" />
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-2">
            {visibleItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={() => onClose()}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors cursor-pointer ${
                    isActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm shadow-brand/20"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  } ${isCollapsed ? "lg:justify-center lg:px-2" : ""}`}
                  title={isCollapsed ? item.label : undefined}
                >
                  {getIcon(item.icon)}
                  {!isCollapsed && (
                    <span className="text-sm font-medium">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-sidebar-border">
            <LogoutButton isCollapsed={isCollapsed} />
          </div>
        </div>
      </aside>
    </>
  );
}
