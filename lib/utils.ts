import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function sanitizeInput(text: string): string {
  if (!text) return "";
  return text
    // Remove script tags and their contents
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    // Remove any remaining HTML tags
    .replace(/<[^>]*>/g, "")
    // Avoid HTML entity conversion to prevent double-encoding in React JSX and Flutter Text widgets
    .trim();
}

export async function generateUniqueReferenceCode(
  checkUniqueFn: (code: string) => Promise<boolean>
): Promise<string> {
  let attempts = 0;
  while (attempts < 10) {
    const candidate = `CFX-${Math.floor(1000 + Math.random() * 9000)}`;
    const isUnique = await checkUniqueFn(candidate);
    if (isUnique) {
      return candidate;
    }
    attempts++;
  }
  return `CFX-${Date.now().toString().slice(-4)}${Math.floor(10 + Math.random() * 90)}`;
}
