"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, ListFilter, Users, History, Mail, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { href: "/admin", label: "Overview", icon: Shield, exact: true },
  { href: "/admin/issues", label: "Triage & Assign", icon: ListFilter },
  { href: "/admin/users", label: "User Accounts", icon: Users },
  { href: "/admin/audit", label: "Audit Trail", icon: History },
  { href: "/admin/email", label: "Email Deliveries", icon: Mail },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="border-b border-border/60 bg-muted/20">
      <div className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 flex items-center gap-1.5 overflow-x-auto py-1 text-xs">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.exact
            ? pathname === item.href
            : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-all duration-150 whitespace-nowrap select-none relative group",
                isActive
                  ? "bg-background text-foreground font-semibold shadow-xs border border-border/80 text-brand-hover dark:text-brand"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
              )}
            >
              <Icon className={cn("h-3.5 w-3.5 transition-transform group-hover:scale-105", isActive ? "text-brand" : "opacity-70")} />
              <span>{item.label}</span>
              {isActive && (
                <span className="absolute -bottom-1 left-2 right-2 h-0.5 bg-brand rounded-full" />
              )}
            </Link>
          );
        })}

        <div className="ml-auto pl-2 shrink-0">
          <Link
            href="/"
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground py-1 px-2.5 rounded-md hover:bg-muted/40 transition-colors border border-transparent hover:border-border/50"
          >
            <ArrowLeft className="h-3 w-3" />
            <span>Campus View</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
