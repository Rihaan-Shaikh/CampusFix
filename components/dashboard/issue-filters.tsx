"use client";

import * as React from "react";
import { RotateCcw, SlidersHorizontal, X, Check } from "lucide-react";
import {
  useIssueStore,
  StatusFilterOption,
  CategoryFilterOption,
  PriorityFilterOption,
} from "@/store/issue-store";
import { ISSUE_CATEGORIES, ISSUE_STATUSES } from "@/schemas/issue-schema";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: StatusFilterOption[] = ["All", ...ISSUE_STATUSES];

export function IssueFilters() {
  const [mobileSheetOpen, setMobileSheetOpen] = React.useState(false);

  // Granular subscriptions to Zustand state
  const statusFilter = useIssueStore((state) => state.statusFilter);
  const setStatusFilter = useIssueStore((state) => state.setStatusFilter);

  const categoryFilter = useIssueStore((state) => state.categoryFilter);
  const setCategoryFilter = useIssueStore((state) => state.setCategoryFilter);

  const priorityFilter = useIssueStore((state) => state.priorityFilter);
  const setPriorityFilter = useIssueStore((state) => state.setPriorityFilter);

  const searchQuery = useIssueStore((state) => state.searchQuery);
  const resetFilters = useIssueStore((state) => state.resetFilters);

  const activeFilterCount =
    (statusFilter !== "All" ? 1 : 0) +
    (categoryFilter !== "All" ? 1 : 0) +
    (priorityFilter !== "All" ? 1 : 0) +
    (searchQuery.trim() !== "" ? 1 : 0);

  const isFiltered = activeFilterCount > 0;

  return (
    <div className="space-y-2 py-1">
      {/* Desktop Filter Toolbar */}
      <div className="hidden sm:flex flex-wrap items-center justify-between gap-3">
        {/* Status Segmented Switcher */}
        <div
          className="inline-flex items-center rounded-md border border-border/80 bg-muted/30 p-0.5"
          role="tablist"
          aria-label="Filter issues by status"
        >
          {STATUS_OPTIONS.map((status) => {
            const isActive = statusFilter === status;
            return (
              <button
                key={status}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setStatusFilter(status)}
                className={cn(
                  "whitespace-nowrap rounded px-2.5 py-1 text-xs font-medium transition-colors select-none",
                  isActive
                    ? "bg-background text-foreground shadow-xs font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {status}
              </button>
            );
          })}
        </div>

        {/* Category, Priority & Contextual Reset Actions */}
        <div className="flex items-center gap-2">
          {/* Category Filter */}
          <div className="w-[145px]">
            <Select
              value={categoryFilter}
              onValueChange={(val) => setCategoryFilter(val as CategoryFilterOption)}
            >
              <SelectTrigger
                aria-label="Filter by category"
                className={cn(
                  "h-8 text-xs bg-background/90",
                  categoryFilter !== "All" && "border-primary/50 text-foreground font-medium"
                )}
              >
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                {ISSUE_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Priority Filter */}
          <div className="w-[130px]">
            <Select
              value={priorityFilter}
              onValueChange={(val) => setPriorityFilter(val as PriorityFilterOption)}
            >
              <SelectTrigger
                aria-label="Filter by priority"
                className={cn(
                  "h-8 text-xs bg-background/90",
                  priorityFilter !== "All" && "border-primary/50 text-foreground font-medium"
                )}
              >
                <SelectValue placeholder="All Priorities" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Priorities</SelectItem>
                <SelectItem value="High">High Priority</SelectItem>
                <SelectItem value="Medium">Medium Priority</SelectItem>
                <SelectItem value="Low">Low Priority</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Reset button only when filters are active */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="h-8 px-2.5 text-xs text-muted-foreground hover:text-foreground gap-1.5 transition-colors"
              aria-label="Clear all active filters"
            >
              <RotateCcw className="h-3 w-3" />
              <span>Clear filters</span>
            </Button>
          )}
        </div>
      </div>

      {/* Mobile Filter Sheet & Summary Bar (under 640px) */}
      <div className="sm:hidden flex items-center justify-between gap-2">
        <Sheet open={mobileSheetOpen} onOpenChange={setMobileSheetOpen}>
          <SheetTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-8 text-xs gap-2 font-medium bg-background",
                isFiltered && "border-primary text-foreground"
              )}
            >
              <SlidersHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Filter Issues</span>
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-foreground text-background text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="rounded-t-xl p-5 space-y-4 max-h-[85vh] overflow-y-auto">
            <SheetHeader className="flex flex-row items-center justify-between pb-2 border-b border-border/50">
              <SheetTitle className="text-sm font-semibold">Filter Incident Records</SheetTitle>
              {isFiltered && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="h-7 text-xs text-muted-foreground hover:text-foreground"
                >
                  Reset all
                </Button>
              )}
            </SheetHeader>

            {/* Status Options in Sheet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Status</label>
              <div className="grid grid-cols-2 gap-1.5">
                {STATUS_OPTIONS.map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={cn(
                      "flex items-center justify-between px-3 py-2 rounded-md border text-xs text-left transition-colors",
                      statusFilter === status
                        ? "border-primary bg-primary/10 text-foreground font-semibold"
                        : "border-border/70 bg-background text-muted-foreground hover:bg-muted"
                    )}
                  >
                    <span>{status}</span>
                    {statusFilter === status && <Check className="h-3.5 w-3.5 text-primary" />}
                  </button>
                ))}
              </div>
            </div>

            {/* Category Select in Sheet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Category</label>
              <Select
                value={categoryFilter}
                onValueChange={(val) => setCategoryFilter(val as CategoryFilterOption)}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Categories</SelectItem>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Priority Select in Sheet */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Priority</label>
              <Select
                value={priorityFilter}
                onValueChange={(val) => setPriorityFilter(val as PriorityFilterOption)}
              >
                <SelectTrigger className="h-9 text-xs bg-background">
                  <SelectValue placeholder="All Priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Priorities</SelectItem>
                  <SelectItem value="High">High Priority</SelectItem>
                  <SelectItem value="Medium">Medium Priority</SelectItem>
                  <SelectItem value="Low">Low Priority</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="pt-2">
              <Button
                className="w-full h-9 text-xs font-medium"
                onClick={() => setMobileSheetOpen(false)}
              >
                Apply Filters
              </Button>
            </div>
          </SheetContent>
        </Sheet>

        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={resetFilters}
            className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground gap-1"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Clear</span>
          </Button>
        )}
      </div>

      {/* Subtle Active Filter State Pills (Requirement #18) */}
      {isFiltered && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground">Active filters:</span>
          {statusFilter !== "All" && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 border border-border/50 text-foreground font-mono">
              Status: {statusFilter}
              <button
                type="button"
                onClick={() => setStatusFilter("All")}
                className="hover:text-destructive transition-colors ml-0.5"
                aria-label="Remove status filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {categoryFilter !== "All" && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 border border-border/50 text-foreground font-mono">
              Category: {categoryFilter}
              <button
                type="button"
                onClick={() => setCategoryFilter("All")}
                className="hover:text-destructive transition-colors ml-0.5"
                aria-label="Remove category filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {priorityFilter !== "All" && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 border border-border/50 text-foreground font-mono">
              Priority: {priorityFilter}
              <button
                type="button"
                onClick={() => setPriorityFilter("All")}
                className="hover:text-destructive transition-colors ml-0.5"
                aria-label="Remove priority filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
          {searchQuery.trim() !== "" && (
            <span className="inline-flex items-center gap-1 rounded bg-muted/60 px-2 py-0.5 border border-border/50 text-foreground font-mono">
              Query: &ldquo;{searchQuery}&rdquo;
              <button
                type="button"
                onClick={() => resetFilters()}
                className="hover:text-destructive transition-colors ml-0.5"
                aria-label="Clear search filter"
              >
                <X className="h-2.5 w-2.5" />
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
