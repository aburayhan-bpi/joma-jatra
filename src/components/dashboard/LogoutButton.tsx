"use client";
import { useLogout } from "@/hooks/useLogout";
import { cn } from "@/lib/utils";
import { Icons } from "@/utils/icons";

export function LogoutButton({ isCollapsed }: { isCollapsed: boolean }) {
  const { handleLogout } = useLogout();

  return (
    <button
      onClick={handleLogout}
      className={cn(
        "group w-full flex items-center gap-3 px-3 py-2 rounded transition-colors cursor-pointer border border-border bg-error-5 hover:bg-error-20 hover:text-error hover:border-error/40",
        "text-sm font-medium text-text-description",
        isCollapsed && "lg:justify-center lg:px-0",
      )}
    >
      <span className="shrink-0 transition-colors group-hover:text-error text-muted-foreground">
        <Icons.LogOut className="w-4.5 h-4.5" />
      </span>
      {!isCollapsed && (
        <span className="transition-transform group-hover:translate-x-0.5 duration-200">
          Log out
        </span>
      )}
    </button>
  );
}
