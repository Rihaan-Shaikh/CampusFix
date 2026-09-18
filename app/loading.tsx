import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation Header Skeleton */}
      <header className="border-b border-border/80 bg-background/95 sticky top-0 z-30">
        <div className="w-full max-w-[1440px] mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <Skeleton className="h-7 w-7 rounded-md" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Skeleton className="h-8 w-64 rounded-md hidden sm:block" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
        </div>
      </header>

      {/* Main Content Area Skeleton */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex-1 space-y-4">
        {/* Page Title & Context */}
        <div className="space-y-1.5 pb-4 border-b border-border/50">
          <Skeleton className="h-6 w-56" />
          <Skeleton className="h-3.5 w-96 max-w-full" />
        </div>

        {/* Filter Controls Toolbar Skeleton */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 py-1">
          <div className="flex items-center gap-1">
            <Skeleton className="h-7 w-12 rounded" />
            <Skeleton className="h-7 w-14 rounded" />
            <Skeleton className="h-7 w-20 rounded" />
            <Skeleton className="h-7 w-16 rounded" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-36 rounded" />
            <Skeleton className="h-7 w-32 rounded" />
          </div>
        </div>

        {/* Counter Skeleton */}
        <div className="flex justify-between items-center px-0.5">
          <Skeleton className="h-3 w-40" />
        </div>

        {/* Unified Issue Table Skeleton */}
        <div className="rounded-lg border border-border/80 bg-card overflow-hidden">
          {/* Header */}
          <div className="hidden sm:flex items-center px-4 py-2.5 bg-muted/30 border-b border-border/60 gap-4">
            <Skeleton className="h-3.5 w-12" />
            <Skeleton className="h-3.5 w-64 flex-1" />
            <Skeleton className="h-3.5 w-28 hidden md:block" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-20" />
            <Skeleton className="h-3.5 w-16" />
          </div>
          {/* Rows */}
          <div className="divide-y divide-border/40">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="flex items-center px-4 py-3 gap-4"
              >
                <Skeleton className="h-3.5 w-16 shrink-0" />
                <div className="flex-1 space-y-1">
                  <Skeleton className="h-4 w-3/4 max-w-md" />
                  <Skeleton className="h-3 w-1/2 max-w-xs" />
                </div>
                <Skeleton className="h-3.5 w-28 hidden md:block shrink-0" />
                <Skeleton className="h-5 w-18 shrink-0 hidden sm:block" />
                <Skeleton className="h-5 w-20 shrink-0 hidden sm:block" />
                <Skeleton className="h-3 w-16 shrink-0 hidden sm:block" />
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
