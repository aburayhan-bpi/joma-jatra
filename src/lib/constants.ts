import { UserRole } from "@/types/backend";

export interface SidebarNavItem {
  id: string;
  label: string;
  href: string;
  icon:
    | "LayoutDashboard"
    | "Sheet"
    | "PiggyBank"
    | "HandCoins"
    | "Users"
    | "Landmark"
    | "History"
    | "UserCircle";
  roles: UserRole[];
}

// Unified role-aware dashboard navigation (full group transparency + RBAC actions per page)
export const SIDEBAR_ITEMS: SidebarNavItem[] = [
  {
    id: "overview",
    label: "Overview",
    href: "/dashboard",
    icon: "LayoutDashboard",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "monthly-sheet",
    label: "Monthly Sheet",
    href: "/dashboard/monthly-sheet",
    icon: "Sheet",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "deposits",
    label: "Deposits",
    href: "/dashboard/deposits",
    icon: "PiggyBank",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "returns",
    label: "Returns",
    href: "/dashboard/returns",
    icon: "HandCoins",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "members",
    label: "Members",
    href: "/dashboard/members",
    icon: "Users",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "accounts",
    label: "Accounts & Transfers",
    href: "/dashboard/accounts",
    icon: "Landmark",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "activity-logs",
    label: "Activity Log",
    href: "/dashboard/activity-logs",
    icon: "History",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
  {
    id: "profile",
    label: "My Profile",
    href: "/dashboard/profile",
    icon: "UserCircle",
    roles: ["ADMIN", "CASHIER", "MEMBER"],
  },
];

export const WEBSITE_DETAILS = {
  SITE_NAME: "JomaJatra",
  SITE_SHORTNAME: "JomaJatra",
  SITE_ONLY_NAME: "JomaJatra",
  SITE_DESCRIPTION: "Group Savings & Money Management Ledger",
  SITE_DESC: "Money Management Ledger",
  SITE_DASHBOARD_TITLE: "JomaJatra — Ledger",
  SITE_DASHBOARD_SUBTITLE: "GROUP SAVINGS LEDGER",
  SITE_LOGO: "/joma-jatra.png",
  SITE_FAVICON: "/joma-jatra-icononly.png",
  AVATAR1: "/placeholder/avatar1.jpg",
  AVATAR2: "/placeholder/avatar2.jpg",
};

export const paginationLimit = 25;

export const NAV_LINKS = [{ name: "Home", href: "/" }];
