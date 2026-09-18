import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-[11px] font-medium transition-colors select-none",
  {
    variants: {
      variant: {
        default:
          "border border-transparent bg-primary text-primary-foreground font-semibold",
        secondary:
          "border border-border bg-secondary text-secondary-foreground",
        outline:
          "border border-border text-foreground",
        brand:
          "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold",
        // Semantic Status Indicators
        open: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium",
        inProgress: "border border-blue-500/30 bg-blue-500/10 text-blue-700 dark:text-blue-400 font-medium",
        resolved: "border border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-medium",
        // Semantic Priority Indicators
        priorityHigh: "border border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-400 font-semibold",
        priorityMedium: "border border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400 font-medium",
        priorityLow: "border border-slate-400/30 bg-slate-500/10 text-slate-700 dark:text-slate-400 font-medium",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {
  showDot?: boolean;
}

function Badge({ className, variant, showDot, children, ...props }: BadgeProps) {
  // Automatically render a live status indicator dot for operational status variants unless explicitly disabled
  const shouldRenderDot = showDot ?? (
    variant === "open" ||
    variant === "inProgress" ||
    variant === "resolved" ||
    variant === "priorityHigh"
  );

  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props}>
      {shouldRenderDot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0 items-center justify-center">
          {variant === "open" && (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-500" />
            </>
          )}
          {variant === "inProgress" && (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-blue-500" />
            </>
          )}
          {variant === "resolved" && (
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          )}
          {variant === "priorityHigh" && (
            <>
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-red-500" />
            </>
          )}
        </span>
      )}
      {children}
    </div>
  );
}

export { Badge, badgeVariants };

