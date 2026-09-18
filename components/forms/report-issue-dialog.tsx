"use client";

import * as React from "react";
import Link from "next/link";
import { LogIn, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportIssueForm } from "@/components/forms/report-issue-form";
import { useAuth } from "@/components/auth/auth-provider";
import { useIssueStore } from "@/store/issue-store";

export function ReportIssueDialog() {
  const open = useIssueStore((state) => state.reportDialogOpen);
  const setOpen = useIssueStore((state) => state.setReportDialogOpen);
  const { user } = useAuth();

  const userRole = (user as unknown as { role?: string })?.role || "MEMBER";

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md sm:max-w-lg border-border/80 shadow-xl">
        <DialogHeader className="text-left space-y-1">
          <DialogTitle className="text-base font-semibold text-foreground">
            Report campus issue
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Tell facilities what needs attention.
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-muted/60 text-muted-foreground">
              <LogIn className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Sign In Required</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Sign in with your campus account to submit and track facilities issues.
              </p>
            </div>
            <div className="pt-2">
              <Button asChild size="sm" className="gap-1.5 text-xs bg-brand hover:bg-brand-hover text-brand-foreground font-semibold">
                <Link href="/sign-in" onClick={() => setOpen(false)}>
                  Sign in to Continue
                </Link>
              </Button>
            </div>
          </div>
        ) : userRole === "GUEST" ? (
          <div className="py-6 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-foreground">Restricted Guest Access</h3>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto">
                Guest accounts have read-only access. Sign in as a student or staff member to submit issues.
              </p>
            </div>
          </div>
        ) : (
          <ReportIssueForm
            onSuccess={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
