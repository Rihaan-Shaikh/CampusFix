import { Skeleton } from "@/components/ui/skeleton";

export default function SignUpLoading() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col lg:grid lg:grid-cols-12 font-sans select-none">
      {/* Left Column Skeleton */}
      <div className="relative lg:col-span-5 border-b lg:border-b-0 lg:border-r border-border/70 p-6 sm:p-10 lg:p-12 flex flex-col justify-between bg-muted/20">
        <div className="space-y-6">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-5 w-28 rounded" />
          </div>

          <div className="space-y-2 pt-2">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
          </div>

          <div className="space-y-3 pt-4">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3.5 w-64" />
            </div>
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-4 w-4 rounded-full" />
              <Skeleton className="h-3.5 w-60" />
            </div>
          </div>
        </div>

        <div className="pt-8 hidden lg:flex justify-between">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>

      {/* Right Form Column Skeleton */}
      <div className="lg:col-span-7 flex flex-col justify-center p-6 sm:p-10 lg:p-14 bg-background">
        <div className="w-full max-w-md mx-auto space-y-6">
          <div className="space-y-1.5">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-3.5 w-64" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-9 rounded-md" />
            <Skeleton className="h-9 rounded-md" />
          </div>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <div className="space-y-1.5">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-9 w-full rounded-md" />
            </div>
            <Skeleton className="h-9 w-full rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
