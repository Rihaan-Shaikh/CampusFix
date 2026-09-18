import { z } from "zod";

export const ISSUE_CATEGORIES = [
  "Classroom Equipment",
  "Electrical",
  "Network",
  "Furniture",
  "Cleanliness",
  "Laboratory",
  "Plumbing",
  "Other",
] as const;

export const ISSUE_PRIORITIES = ["Low", "Medium", "High"] as const;

export const ISSUE_STATUSES = ["Open", "In Progress", "Resolved"] as const;

export type IssueCategory = (typeof ISSUE_CATEGORIES)[number];
export type IssuePriority = (typeof ISSUE_PRIORITIES)[number];
export type IssueStatus = (typeof ISSUE_STATUSES)[number];

export const issueFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(5, { message: "Title must be at least 5 characters long." })
    .max(100, { message: "Title cannot exceed 100 characters." }),
  category: z.enum(ISSUE_CATEGORIES, {
    errorMap: () => ({ message: "Please select a valid category." }),
  }),
  location: z
    .string()
    .trim()
    .min(3, { message: "Location must be at least 3 characters (e.g. Science Block 302)." })
    .max(80, { message: "Location cannot exceed 80 characters." }),
  priority: z.enum(ISSUE_PRIORITIES, {
    errorMap: () => ({ message: "Please specify an urgency priority." }),
  }),
  description: z
    .string()
    .trim()
    .min(15, { message: "Description must provide at least 15 characters of detail." })
    .max(1000, { message: "Description cannot exceed 1000 characters." }),
});

export type IssueFormData = z.infer<typeof issueFormSchema>;

export interface StatusHistoryItem {
  id: string;
  status: IssueStatus;
  changedByName: string;
  note?: string;
  createdAt: string;
}

export interface CampusIssue extends IssueFormData {
  id: string;
  status: IssueStatus;
  reportedAt: string;
  updatedAt?: string;
  referenceId: string;
  createdById?: string;
  createdByName?: string;
  assignedToId?: string | null;
  assignedToName?: string;
  history?: StatusHistoryItem[];
}
