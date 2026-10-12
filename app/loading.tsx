import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation Header Skeleton */}
      <header className="border-b border-border/80 bg-background/95 sticky top-0 z-30">
        <div className="w-full max-w-[1440px] mx-auto flex h-14 items-center justify-between px-4 sm:px-6 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-md bg-muted/60 animate-pulse" />
            <div className="h-4 w-28 rounded bg-muted/60 animate-pulse" />
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="h-8 w-48 rounded-md bg-muted/50 hidden sm:block animate-pulse" />
            <div className="h-8 w-8 rounded-md bg-muted/60 animate-pulse" />
            <div className="h-8 w-24 rounded-md bg-muted/60 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Neutral Application Shell Content Skeleton */}
      <main className="w-full max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-10 py-6 flex-1 space-y-4">
        {/* Workspace Context Bar */}
        <div className="space-y-2 pb-4 border-b border-border/50">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-3.5 w-80 max-w-full" />
        </div>

        {/* Content Shell Placeholder */}
        <div className="rounded-lg border border-border/70 bg-card/60 p-6 space-y-4">
          <div className="space-y-3">
            <Skeleton className="h-4 w-3/4 max-w-md" />
            <Skeleton className="h-3.5 w-1/2 max-w-sm" />
          </div>
          <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
            <Skeleton className="h-20 rounded-md" />
          </div>
        </div>
      </main>
    </div>
  );
}
