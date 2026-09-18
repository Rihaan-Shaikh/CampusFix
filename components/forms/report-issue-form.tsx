"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, CheckCircle2, Copy, Check, ArrowRight, RotateCcw } from "lucide-react";
import {
  issueFormSchema,
  IssueFormData,
  ISSUE_CATEGORIES,
  ISSUE_PRIORITIES,
  CampusIssue,
} from "@/schemas/issue-schema";
import { reportCampusIssueAction } from "@/actions/issue-actions";
import { useIssueStore } from "@/store/issue-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ReportIssueFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function ReportIssueForm({ onSuccess, onCancel }: ReportIssueFormProps) {
  const [submissionState, setSubmissionState] = React.useState<"IDLE" | "SUBMITTING" | "SUCCESS">("IDLE");
  const [submittedIssue, setSubmittedIssue] = React.useState<CampusIssue | null>(null);
  const [copied, setCopied] = React.useState(false);

  const addCustomIssue = useIssueStore((state) => state.addCustomIssue);
  const setSelectedIssue = useIssueStore((state) => state.setSelectedIssue);

  const {
    register,
    handleSubmit,
    control,
    reset,
    setError,
    formState: { errors },
  } = useForm<IssueFormData>({
    resolver: zodResolver(issueFormSchema),
    defaultValues: {
      title: "",
      location: "",
      description: "",
      priority: "Medium",
    },
  });

  const onSubmit = async (data: IssueFormData) => {
    if (submissionState === "SUBMITTING") return;
    setSubmissionState("SUBMITTING");

    try {
      const result = await reportCampusIssueAction(data);

      if (result.success) {
        addCustomIssue(result.data);
        setSubmittedIssue(result.data);
        setSubmissionState("SUCCESS");

        toast.success("Issue reported", {
          description: `${result.data.referenceId} has been submitted successfully.`,
        });
      } else {
        setSubmissionState("IDLE");
        if (result.errors) {
          Object.entries(result.errors).forEach(([field, messages]) => {
            if (messages && messages[0]) {
              setError(field as keyof IssueFormData, {
                type: "server",
                message: messages[0],
              });
            }
          });
        }
        toast.error("Unable to submit issue", {
          description: result.message || "Please check the highlighted form errors.",
        });
      }
    } catch {
      setSubmissionState("IDLE");
      toast.error("Network connection error", {
        description: "Failed to communicate with facilities server. Please try again.",
      });
    }
  };

  const handleCopyId = () => {
    if (!submittedIssue) return;
    navigator.clipboard.writeText(submittedIssue.referenceId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleViewIssue = () => {
    if (submittedIssue) {
      setSelectedIssue(submittedIssue);
      onSuccess?.();
    }
  };

  const handleReportAnother = () => {
    reset();
    setSubmittedIssue(null);
    setSubmissionState("IDLE");
  };

  // SUCCESS STATE VIEW
  if (submissionState === "SUCCESS" && submittedIssue) {
    return (
      <div className="py-6 space-y-6 text-center animate-fade-in">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-xs">
          <CheckCircle2 className="h-6 w-6" />
        </div>

        <div className="space-y-1.5">
          <h3 className="text-base font-semibold text-foreground">
            Issue reported successfully
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            Your maintenance request has been routed to university facilities and logged in the operational audit stream.
          </p>
          <div className="pt-2">
            <span className="font-mono text-sm font-bold bg-muted px-3 py-1 rounded-md border border-border/70 text-foreground inline-block">
              {submittedIssue.referenceId}
            </span>
          </div>
        </div>

        {/* Operational Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopyId}
            className="w-full sm:w-auto h-8 text-xs gap-1.5"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{copied ? "Copied Code" : "Copy Reference ID"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleReportAnother}
            className="w-full sm:w-auto h-8 text-xs gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            <span>Report Another</span>
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={handleViewIssue}
            className="w-full sm:w-auto h-8 text-xs gap-1.5 bg-brand hover:bg-brand-hover text-brand-foreground font-semibold"
          >
            <span>View Record</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    );
  }

  // IDLE & SUBMITTING FORM VIEW
  const isSubmitting = submissionState === "SUBMITTING";

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5" noValidate>
      {/* Field: Issue Title */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="title" className="text-xs font-medium text-foreground">
            Issue Title <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <span className="text-[10px] text-muted-foreground">5-100 characters</span>
        </div>
        <Input
          id="title"
          placeholder="e.g. Overhead projector flickering in Room 302"
          {...register("title")}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "title-error" : undefined}
          disabled={isSubmitting}
          className="h-8 text-xs"
          autoFocus
        />
        {errors.title && (
          <p id="title-error" className="text-[11px] font-medium text-destructive pt-0.5" role="alert">
            {errors.title.message}
          </p>
        )}
      </div>

      {/* Group: Category & Priority Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Field: Category */}
        <div className="space-y-1">
          <Label htmlFor="category" className="text-xs font-medium text-foreground">
            Category <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Controller
            control={control}
            name="category"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="category"
                  aria-invalid={!!errors.category}
                  aria-describedby={errors.category ? "category-error" : undefined}
                  className="h-8 text-xs"
                >
                  <SelectValue placeholder="Select category..." />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.category && (
            <p id="category-error" className="text-[11px] font-medium text-destructive pt-0.5" role="alert">
              {errors.category.message}
            </p>
          )}
        </div>

        {/* Field: Priority */}
        <div className="space-y-1">
          <Label htmlFor="priority" className="text-xs font-medium text-foreground">
            Priority Urgency <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <Controller
            control={control}
            name="priority"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="priority"
                  aria-invalid={!!errors.priority}
                  aria-describedby={errors.priority ? "priority-error" : undefined}
                  className="h-8 text-xs"
                >
                  <SelectValue placeholder="Select urgency..." />
                </SelectTrigger>
                <SelectContent>
                  {ISSUE_PRIORITIES.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p} Priority
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {errors.priority && (
            <p id="priority-error" className="text-[11px] font-medium text-destructive pt-0.5" role="alert">
              {errors.priority.message}
            </p>
          )}
        </div>
      </div>

      {/* Field: Campus Location */}
      <div className="space-y-1">
        <Label htmlFor="location" className="text-xs font-medium text-foreground">
          Campus Location <span className="text-destructive" aria-hidden="true">*</span>
        </Label>
        <Input
          id="location"
          placeholder="e.g. Academic Block A • 3rd Floor Lecture Hall 302"
          {...register("location")}
          aria-invalid={!!errors.location}
          aria-describedby={errors.location ? "location-error" : undefined}
          disabled={isSubmitting}
          className="h-8 text-xs"
        />
        {errors.location && (
          <p id="location-error" className="text-[11px] font-medium text-destructive pt-0.5" role="alert">
            {errors.location.message}
          </p>
        )}
      </div>

      {/* Field: Incident Description */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <Label htmlFor="description" className="text-xs font-medium text-foreground">
            Incident Description <span className="text-destructive" aria-hidden="true">*</span>
          </Label>
          <span className="text-[10px] text-muted-foreground">min 15 characters</span>
        </div>
        <Textarea
          id="description"
          rows={3}
          placeholder="Describe observed symptoms, error codes, specific equipment labels, or safety hazards..."
          {...register("description")}
          aria-invalid={!!errors.description}
          aria-describedby={errors.description ? "description-error" : undefined}
          disabled={isSubmitting}
          className="text-xs resize-none"
        />
        {errors.description && (
          <p id="description-error" className="text-[11px] font-medium text-destructive pt-0.5" role="alert">
            {errors.description.message}
          </p>
        )}
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onCancel}
          disabled={isSubmitting}
          className="h-8 text-xs"
        >
          Cancel
        </Button>
        <Button
          type="submit"
          size="sm"
          disabled={isSubmitting}
          className="h-8 min-w-[110px] text-xs font-semibold bg-brand hover:bg-brand-hover text-brand-foreground shadow-xs transition-all active:scale-95"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Report"
          )}
        </Button>
      </div>
    </form>
  );
}
