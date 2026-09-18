import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground px-4 text-center">
      <div className="rounded-full bg-muted p-3 text-muted-foreground mb-4">
        <AlertCircle className="h-6 w-6 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold tracking-tight">Issue not found</h2>
      <p className="mt-2 text-xs text-muted-foreground max-w-sm leading-relaxed">
        The issue you&apos;re looking for doesn&apos;t exist or is no longer available.
      </p>
      <div className="mt-6">
        <Button asChild size="sm">
          <Link href="/">Back to Issues</Link>
        </Button>
      </div>
    </div>
  );
}
