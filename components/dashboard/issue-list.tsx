"use client";

import * as React from "react";
import { CampusIssue } from "@/schemas/issue-schema";
import { useIssueStore } from "@/store/issue-store";
import { useAuth } from "@/components/auth/auth-provider";
import { IssueRow } from "@/components/dashboard/issue-row";
import { IssueDetails } from "@/components/dashboard/issue-details";
import { IssueEmptyState } from "@/components/dashboard/issue-empty-state";

interface IssueListProps {
  initialIssues: CampusIssue[];
}

export function IssueList({ initialIssues }: IssueListProps) {
  const { user } = useAuth();
  const userId = user?.id;
  const userName = user?.name;

  // Granular subscriptions to Zustand state
  const searchQuery = useIssueStore((state) => state.searchQuery);
  const statusFilter = useIssueStore((state) => state.statusFilter);
  const categoryFilter = useIssueStore((state) => state.categoryFilter);
  const priorityFilter = useIssueStore((state) => state.priorityFilter);
  const viewScope = useIssueStore((state) => state.viewScope);
  const customIssues = useIssueStore((state) => state.customIssues);
  const selectedIssue = useIssueStore((state) => state.selectedIssue);
  const setSelectedIssue = useIssueStore((state) => state.setSelectedIssue);

  // Merge server initial issues with user-submitted issues while deduplicating
  const allIssues = React.useMemo(() => {
    const customIds = new Set(customIssues.map((i) => i.id));
    const dedupedInitial = initialIssues.filter((i) => !customIds.has(i.id));
    return [...customIssues, ...dedupedInitial];
  }, [initialIssues, customIssues]);

  // Multi-facet filtering logic
  const filteredIssues = React.useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allIssues.filter((issue) => {
      // 0. Workspace Scope Filter ("All Issues" vs "My Issues")
      if (viewScope === "mine") {
        const isMine =
          (userId && (issue.createdById === userId || issue.assignedToId === userId)) ||
          (userName && (issue.createdByName === userName || issue.assignedToName === userName));
        if (!isMine) return false;
      }

      // 1. Search Query Filter
      if (query) {
        const matchesQuery =
          issue.title.toLowerCase().includes(query) ||
          issue.location.toLowerCase().includes(query) ||
          issue.category.toLowerCase().includes(query) ||
          issue.referenceId.toLowerCase().includes(query) ||
          issue.description.toLowerCase().includes(query);
        if (!matchesQuery) return false;
      }

      // 2. Status Filter
      if (statusFilter !== "All" && issue.status !== statusFilter) {
        return false;
      }

      // 3. Category Filter
      if (categoryFilter !== "All" && issue.category !== categoryFilter) {
        return false;
      }

      // 4. Priority Filter
      if (priorityFilter !== "All" && issue.priority !== priorityFilter) {
        return false;
      }

      return true;
    });
  }, [allIssues, searchQuery, statusFilter, categoryFilter, priorityFilter, viewScope, userId, userName]);

  const hasActiveFilters =
    statusFilter !== "All" ||
    categoryFilter !== "All" ||
    priorityFilter !== "All" ||
    viewScope !== "all" ||
    searchQuery.trim() !== "";

  return (
    <div className="space-y-3">
      {/* Contextual counter bar */}
      <div className="flex items-center justify-between text-xs text-muted-foreground px-0.5">
        <span>
          Showing <strong className="text-foreground font-semibold">{filteredIssues.length}</strong> of {allIssues.length} issues
        </span>
        {hasActiveFilters && (
          <span className="text-[11px] font-mono text-muted-foreground bg-muted/80 px-2 py-0.5 rounded border border-border/60">
            Filtered view
          </span>
        )}
      </div>

      {/* Unified operational table container */}
      {filteredIssues.length === 0 ? (
        <IssueEmptyState hasActiveFilters={hasActiveFilters} />
      ) : (
        <div
          className="rounded-lg border border-border/80 bg-card overflow-hidden shadow-xs"
          role="feed"
          aria-label="Campus issues directory"
        >
          {/* Table Column Headers */}
          <div className="hidden sm:flex items-center px-4 py-2.5 bg-muted/40 border-b border-border/60 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none gap-4">
            <div className="w-20 shrink-0">ID</div>
            <div className="flex-1 min-w-0">Incident & Campus Location</div>
            <div className="hidden md:block w-36 shrink-0">Category</div>
            <div className="w-24 shrink-0">Priority</div>
            <div className="w-28 shrink-0">Status</div>
            <div className="w-24 shrink-0 text-right">Reported</div>
          </div>

          {/* Issue Rows */}
          <div className="divide-y divide-border/40">
            {filteredIssues.map((issue) => (
              <IssueRow
                key={issue.id}
                issue={issue}
                isSelected={selectedIssue?.id === issue.id}
                onSelect={(item) => setSelectedIssue(item)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Slide-over Sheet Details */}
      <IssueDetails
        issue={selectedIssue}
        isOpen={selectedIssue !== null}
        onClose={() => setSelectedIssue(null)}
      />
    </div>
  );
}
