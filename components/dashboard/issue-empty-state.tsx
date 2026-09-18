"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useIssueStore } from "@/store/issue-store";

interface IssueEmptyStateProps {
  hasActiveFilters: boolean;
}

export function IssueEmptyState({ hasActiveFilters }: IssueEmptyStateProps) {
  const resetFilters = useIssueStore((state) => state.resetFilters);

  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border/80 py-12 px-4 text-center">
      <h3 className="text-sm font-semibold text-foreground">
        {hasActiveFilters ? "No issues match these filters." : "No issues reported yet."}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground max-w-sm leading-relaxed">
        {hasActiveFilters
          ? "Try clearing a filter or changing your search."
          : "Campus facilities issues submitted by students and staff will appear here."}
      </p>
      {hasActiveFilters && (
        <Button
          variant="outline"
          size="sm"
          onClick={resetFilters}
          className="mt-4 text-xs h-8"
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}
