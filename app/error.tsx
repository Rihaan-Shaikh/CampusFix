"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  React.useEffect(() => {
    // Keep internal error details on client logger only
    console.error("CampusFix Error:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 text-center">
      <div className="rounded-full bg-muted p-3 text-muted-foreground mb-4">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Something went wrong</h2>
      <p className="mt-2 text-xs text-muted-foreground max-w-sm leading-relaxed">
        We couldn&apos;t load this information. Please try again.
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button size="sm" onClick={() => reset()}>
          Try again
        </Button>
      </div>
    </div>
  );
}
