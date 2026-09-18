"use client";

import * as React from "react";
import { updateIssueStatusAction, assignIssueAction } from "@/actions/admin-actions";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils";

interface AdminIssueItem {
  id: string;
  referenceCode: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  location: string;
  createdAt: string;
  reporterName: string;
  assigneeId: string | null;
  assigneeName: string | null;
}

interface StaffUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface AdminIssuesTableProps {
  issues: AdminIssueItem[];
  staffUsers: StaffUser[];
}

export function AdminIssuesTable({ issues: initialIssues, staffUsers }: AdminIssuesTableProps) {
  const [issues, setIssues] = React.useState(initialIssues);
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleStatusChange = async (issueId: string, newStatus: "Open" | "In Progress" | "Resolved") => {
    setLoadingId(issueId);
    try {
      const res = await updateIssueStatusAction(issueId, newStatus);
      if (res.success) {
        toast.success(res.message);
        setIssues((prev) =>
          prev.map((i) => (i.id === issueId ? { ...i, status: newStatus } : i))
        );
      } else {
        toast.error("Failed to update status", { description: res.message });
      }
    } catch {
      toast.error("Network error while updating status");
    } finally {
      setLoadingId(null);
    }
  };

  const handleAssigneeChange = async (issueId: string, newAssigneeId: string) => {
    setLoadingId(issueId);
    const targetUserId = newAssigneeId === "UNASSIGNED" ? null : newAssigneeId;
    try {
      const res = await assignIssueAction(issueId, targetUserId);
      if (res.success) {
        toast.success(res.message);
        const assignee = staffUsers.find((s) => s.id === targetUserId);
        setIssues((prev) =>
          prev.map((i) =>
            i.id === issueId
              ? { ...i, assigneeId: targetUserId, assigneeName: assignee?.name || null }
              : i
          )
        );
      } else {
        toast.error("Failed to assign issue", { description: res.message });
      }
    } catch {
      toast.error("Network error while assigning issue");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs">
      <div className="hidden md:flex items-center px-4 py-2.5 bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider gap-4">
        <div className="w-18 shrink-0">ID</div>
        <div className="flex-1 min-w-0">Title & Location</div>
        <div className="w-28 shrink-0">Reported By</div>
        <div className="w-36 shrink-0">Assignee</div>
        <div className="w-32 shrink-0">Status</div>
        <div className="w-20 shrink-0 text-right">Reported</div>
      </div>

      <div className="divide-y divide-border/40 text-xs">
        {issues.map((issue) => (
          <div
            key={issue.id}
            className={`flex flex-col md:flex-row md:items-center px-4 py-3 gap-3 hover:bg-muted/30 transition-colors ${
              loadingId === issue.id ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            {/* ID & Mobile status */}
            <div className="w-18 shrink-0 flex items-center justify-between md:justify-start">
              <span className="font-mono text-xs font-semibold text-foreground">
                {issue.referenceCode}
              </span>
              <span className="md:hidden">
                <Badge variant={issue.priority === "HIGH" ? "priorityHigh" : "outline"}>
                  {issue.priority}
                </Badge>
              </span>
            </div>

            {/* Title & Location */}
            <div className="flex-1 min-w-0 space-y-0.5">
              <h3 className="font-medium text-foreground truncate">{issue.title}</h3>
              <p className="text-[11px] text-muted-foreground truncate">{issue.location}</p>
            </div>

            {/* Reporter */}
            <div className="w-28 shrink-0 text-muted-foreground truncate text-[11px] md:text-xs">
              <span className="md:hidden font-medium text-foreground mr-1">Reported by:</span>
              {issue.reporterName}
            </div>

            {/* Controls on Mobile Grid / Desktop inline */}
            <div className="grid grid-cols-2 md:contents gap-2">
              {/* Assignee Selector */}
              <div className="w-full md:w-36 shrink-0 space-y-1 md:space-y-0">
                <span className="md:hidden text-[10px] uppercase font-semibold text-muted-foreground block">
                  Assignee
                </span>
                <Select
                  value={issue.assigneeId || "UNASSIGNED"}
                  onValueChange={(val) => handleAssigneeChange(issue.id, val)}
                >
                  <SelectTrigger className="h-7 text-xs bg-background/80 w-full">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNASSIGNED">Unassigned</SelectItem>
                    {staffUsers.map((staff) => (
                      <SelectItem key={staff.id} value={staff.id}>
                        {staff.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Status Selector */}
              <div className="w-full md:w-32 shrink-0 space-y-1 md:space-y-0">
                <span className="md:hidden text-[10px] uppercase font-semibold text-muted-foreground block">
                  Status
                </span>
                <Select
                  value={
                    issue.status === "RESOLVED"
                      ? "Resolved"
                      : issue.status === "IN_PROGRESS"
                      ? "In Progress"
                      : "Open"
                  }
                  onValueChange={(val) =>
                    handleStatusChange(issue.id, val as "Open" | "In Progress" | "Resolved")
                  }
                >
                  <SelectTrigger className="h-7 text-xs bg-background/80 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Open">Open</SelectItem>
                    <SelectItem value="In Progress">In Progress</SelectItem>
                    <SelectItem value="Resolved">Resolved</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Reported Time */}
            <div className="w-full md:w-20 shrink-0 text-left md:text-right text-[11px] text-muted-foreground pt-1 md:pt-0 border-t border-border/30 md:border-0">
              {formatDate(issue.createdAt)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
