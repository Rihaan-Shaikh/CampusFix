"use client";

import * as React from "react";
import { CampusIssue } from "@/schemas/issue-schema";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { MapPin, Calendar, Tag, CheckCircle2, Clock, Copy, Check, User, History } from "lucide-react";
import { Button } from "@/components/ui/button";

interface IssueDetailsProps {
  issue: CampusIssue | null;
  isOpen: boolean;
  onClose: () => void;
}

export function IssueDetails({ issue, isOpen, onClose }: IssueDetailsProps) {
  const [copied, setCopied] = React.useState(false);

  if (!issue) return null;

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

  const fullFormattedDate = new Date(issue.reportedAt).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleCopyId = () => {
    navigator.clipboard.writeText(issue.referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl md:max-w-2xl lg:max-w-3xl overflow-y-auto p-4 sm:p-6 flex flex-col gap-6"
      >
        <SheetHeader className="gap-2 border-b border-border/60 pb-4 pr-8 text-left">
          {/* Reference Code & Copy Action */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded border border-border/50">
                {issue.referenceId}
              </span>
              <Button
                variant="ghost"
                size="icon-sm"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={handleCopyId}
                title="Copy reference code"
                aria-label="Copy reference code"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
              </Button>
            </div>

            {/* Mobile-only status/priority pill preview */}
            <div className="flex sm:hidden items-center gap-1.5">
              <Badge variant={getStatusBadgeVariant(issue.status)}>
                {issue.status}
              </Badge>
              <Badge variant={getPriorityBadgeVariant(issue.priority)}>
                {issue.priority}
              </Badge>
            </div>
          </div>

          <SheetTitle className="text-base sm:text-lg font-semibold text-foreground pt-1 leading-snug">
            {issue.title}
          </SheetTitle>
          <SheetDescription className="sr-only">
            Operational record and facilities dispatch history for {issue.referenceId}
          </SheetDescription>
        </SheetHeader>

        {/* Desktop Two-Column Layout (Main Info on left, Operational Details on right) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Main Column: Description & Activity Timeline (Spans 2 cols on md+) */}
          <div className="md:col-span-2 space-y-6 order-2 md:order-1">
            {/* Description */}
            <div className="space-y-2">
              <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Description
              </h4>
              <div className="text-xs sm:text-sm text-foreground/90 leading-relaxed whitespace-pre-line rounded-md bg-muted/20 p-4 border border-border/50">
                {issue.description}
              </div>
            </div>

            {/* Activity History Timeline */}
            <div className="space-y-2.5 pt-2 border-t border-border/50">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <History className="h-3.5 w-3.5" />
                <span>Activity</span>
              </div>

              {issue.history && issue.history.length > 0 ? (
                <div className="space-y-2 pt-1">
                  {issue.history.map((h, index) => (
                    <div
                      key={h.id || index}
                      className="flex items-start gap-2.5 text-xs bg-muted/30 p-2.5 rounded border border-border/40"
                    >
                      <div className="mt-0.5 shrink-0">
                        {h.status === "Resolved" ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : h.status === "In Progress" ? (
                          <Clock className="h-3.5 w-3.5 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="h-3.5 w-3.5 text-zinc-400" />
                        )}
                      </div>
                      <div className="flex-1 space-y-0.5 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-foreground">
                            Status changed to {h.status}
                          </span>
                          <span className="text-[10px] text-muted-foreground shrink-0">
                            {new Date(h.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          by {h.changedByName}
                        </p>
                        {h.note && (
                          <p className="text-[11px] text-foreground/80 italic pt-0.5">
                            &ldquo;{h.note}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="flex items-start gap-2.5 text-xs bg-muted/30 p-2.5 rounded border border-border/40">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="space-y-0.5 flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold text-foreground">Created</span>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {new Date(issue.reportedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Reported by {issue.createdByName || "Campus Member"}
                      </p>
                    </div>
                  </div>

                  {issue.assignedToName && (
                    <div className="flex items-start gap-2.5 text-xs bg-muted/30 p-2.5 rounded border border-border/40">
                      <Clock className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="space-y-0.5 flex-1 min-w-0">
                        <span className="font-semibold text-foreground">Assigned</span>
                        <p className="text-[11px] text-muted-foreground">
                          Dispatched to {issue.assignedToName}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Details Sidebar: Properties Table (Order 1 on mobile for fast scanning, col-span-1 on md+) */}
          <div className="space-y-3 order-1 md:order-2">
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Details
            </h4>

            <div className="space-y-2 rounded-lg border border-border/60 bg-muted/20 p-3 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={getStatusBadgeVariant(issue.status)}>
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      issue.status === "Open"
                        ? "bg-zinc-400"
                        : issue.status === "In Progress"
                        ? "bg-amber-500"
                        : "bg-emerald-500"
                    }`}
                  />
                  {issue.status}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground">Priority</span>
                <Badge variant={getPriorityBadgeVariant(issue.priority)}>
                  {issue.priority}
                </Badge>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Tag className="h-3 w-3 opacity-60" />
                  Category
                </span>
                <span className="font-medium text-foreground">{issue.category}</span>
              </div>

              <div className="py-1 border-b border-border/30 space-y-0.5">
                <span className="text-muted-foreground flex items-center gap-1">
                  <MapPin className="h-3 w-3 opacity-60" />
                  Location
                </span>
                <p className="font-medium text-foreground pl-4 text-[11px]">{issue.location}</p>
              </div>

              <div className="flex items-center justify-between py-1 border-b border-border/30">
                <span className="text-muted-foreground flex items-center gap-1">
                  <User className="h-3 w-3 opacity-60" />
                  Reported by
                </span>
                <span className="font-medium text-foreground truncate max-w-[120px]">
                  {issue.createdByName || "Campus Member"}
                </span>
              </div>

              {issue.assignedToName && (
                <div className="flex items-center justify-between py-1 border-b border-border/30">
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3 opacity-60" />
                    Assigned to
                  </span>
                  <span className="font-medium text-foreground truncate max-w-[120px]">
                    {issue.assignedToName}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between py-1">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Calendar className="h-3 w-3 opacity-60" />
                  Reported
                </span>
                <span className="text-[11px] text-foreground">{fullFormattedDate}</span>
              </div>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
