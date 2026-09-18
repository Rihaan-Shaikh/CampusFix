"use client";

import * as React from "react";
import { CampusIssue } from "@/schemas/issue-schema";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { Copy, Check } from "lucide-react";

interface IssueRowProps {
  issue: CampusIssue;
  isSelected?: boolean;
  onSelect: (issue: CampusIssue) => void;
}

export function IssueRow({ issue, isSelected = false, onSelect }: IssueRowProps) {
  const [copied, setCopied] = React.useState(false);

  const getStatusBadgeVariant = (status: CampusIssue["status"]) => {
    switch (status) {
      case "Open":
        return "open";
      case "In Progress":
        return "inProgress";
      case "Resolved":
        return "resolved";
      default:
        return "outline";
    }
  };

  const getPriorityBadgeVariant = (priority: CampusIssue["priority"]) => {
    switch (priority) {
      case "High":
        return "priorityHigh";
      case "Medium":
        return "priorityMedium";
      case "Low":
        return "priorityLow";
      default:
        return "outline";
    }
  };

  const handleCopyCode = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(issue.referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(issue)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(issue);
        }
      }}
      className={`group relative flex flex-col sm:flex-row sm:items-center px-4 py-3 border-b border-border/40 last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-brand transition-all duration-150 cursor-pointer gap-2 sm:gap-4 select-none ${
        isSelected ? "bg-accent/70 border-l-2 border-l-brand pl-[14px]" : "hover:border-l-2 hover:border-l-brand/60 hover:pl-[14px]"
      }`}
      aria-label={`View issue details for ${issue.referenceId}: ${issue.title}`}
    >
      {/* Column 1: Monospace Reference ID with instant copy hover */}
      <div className="w-20 shrink-0 flex items-center justify-between sm:justify-start gap-1">
        <span className="font-mono text-xs text-muted-foreground font-semibold group-hover:text-foreground transition-colors">
          {issue.referenceId}
        </span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-foreground hover:text-foreground transition-all duration-150 hover:scale-110 active:scale-95"
          title="Copy reference code"
          aria-label="Copy reference code"
        >
          {copied ? <Check className="h-3 w-3 text-emerald-500 animate-in zoom-in-50 duration-150" /> : <Copy className="h-3 w-3" />}
        </button>

        {/* Mobile-only status badge */}
        <div className="sm:hidden">
          <Badge variant={getStatusBadgeVariant(issue.status)}>
            {issue.status}
          </Badge>
        </div>
      </div>

      {/* Column 2: Strong Title & Muted Location */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <h3 className="text-sm font-semibold text-foreground tracking-tight line-clamp-1 group-hover:text-brand transition-colors">
          {issue.title}
        </h3>
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground truncate">
          <span className="truncate">{issue.location}</span>
          <span className="md:hidden opacity-40">·</span>
          <span className="md:hidden text-muted-foreground/80">{issue.category}</span>
        </div>
      </div>

      {/* Column 3: Secondary Category (Desktop Column) */}
      <div className="hidden md:block w-36 shrink-0 text-xs text-muted-foreground truncate font-medium">
        {issue.category}
      </div>

      {/* Column 4: Priority Urgency (Desktop Column) */}
      <div className="w-24 shrink-0 hidden sm:block">
        <Badge variant={getPriorityBadgeVariant(issue.priority)}>
          {issue.priority}
        </Badge>
      </div>

      {/* Column 5: Status Badge (Desktop Column) */}
      <div className="w-28 shrink-0 hidden sm:block">
        <Badge variant={getStatusBadgeVariant(issue.status)}>
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              issue.status === "Open"
                ? "bg-amber-500"
                : issue.status === "In Progress"
                ? "bg-blue-500"
                : "bg-emerald-500"
            }`}
          />
          {issue.status}
        </Badge>
      </div>

      {/* Column 6: Updated / Reported Time */}
      <div className="w-24 shrink-0 flex items-center justify-between sm:justify-end text-[11px] text-muted-foreground pt-1 sm:pt-0 border-t border-border/30 sm:border-0">
        <div className="flex items-center gap-1 sm:hidden">
          <Badge variant={getPriorityBadgeVariant(issue.priority)}>
            {issue.priority}
          </Badge>
        </div>
        <span className="font-mono text-[11px]">{formatDate(issue.reportedAt)}</span>
      </div>
    </div>
  );
}
