"use client";

import * as React from "react";
import { useAuth } from "@/components/auth/auth-provider";
import { useIssueStore } from "@/store/issue-store";
import { Layers, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface WorkspaceTabsProps {
  totalCount: number;
}

export function WorkspaceTabs({ totalCount }: WorkspaceTabsProps) {
  const { user } = useAuth();
  const viewScope = useIssueStore((state) => state.viewScope);
  const setViewScope = useIssueStore((state) => state.setViewScope);

  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 text-xs select-none">
      {/* Workspace Scope Switcher */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setViewScope("all")}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors",
            viewScope === "all"
              ? "bg-muted text-foreground font-semibold shadow-2xs border border-border/70"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          )}
        >
          <Layers className="h-3.5 w-3.5 opacity-70" />
          <span>Issues</span>
          <span className="ml-1 rounded bg-background px-1.5 py-0.2 font-mono text-[10px] text-muted-foreground border border-border/50">
            {totalCount}
          </span>
        </button>

        {user && (
          <button
            type="button"
            onClick={() => setViewScope("mine")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition-colors",
              viewScope === "mine"
                ? "bg-muted text-foreground font-semibold shadow-2xs border border-border/70"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            )}
          >
            <UserCheck className="h-3.5 w-3.5 opacity-70" />
            <span>My Issues</span>
          </button>
        )}
      </div>
    </div>
  );
}
