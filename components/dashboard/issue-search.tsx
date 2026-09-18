"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { useIssueStore } from "@/store/issue-store";

import { Input } from "@/components/ui/input";

export function IssueSearch() {
  // Granular Zustand selector to prevent unnecessary re-renders
  const searchQuery = useIssueStore((state) => state.searchQuery);
  const setSearchQuery = useIssueStore((state) => state.setSearchQuery);

  const inputRef = React.useRef<HTMLInputElement>(null);

  // Global keyboard shortcut '/' or 'Cmd+K' to focus search
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.key === "/" || (e.key === "k" && (e.metaKey || e.ctrlKey))) &&
        document.activeElement?.tagName !== "INPUT" &&
        document.activeElement?.tagName !== "TEXTAREA"
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="relative w-full">
      <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-muted-foreground z-10">
        <Search className="h-3.5 w-3.5" />
      </div>
      <Input
        ref={inputRef}
        type="search"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search issues..."
        className="h-8 w-full bg-background/90 pl-8 pr-9 text-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring"
        aria-label="Search campus issues"
      />
      <div className="absolute inset-y-0 right-0 flex items-center pr-2">
        {searchQuery ? (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Clear search query"
          >
            <X className="h-3 w-3" />
          </button>
        ) : (
          <kbd className="hidden select-none items-center gap-0.5 rounded border border-border bg-muted/60 px-1.5 font-mono text-[10px] text-muted-foreground sm:inline-flex">
            /
          </kbd>
        )}
      </div>
    </div>
  );
}
