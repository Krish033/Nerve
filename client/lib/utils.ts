import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { formatDistanceToNow } from "date-fns"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getErrorMessage(error: unknown, fallback = "Unexpected error") {
  return error instanceof Error ? error.message : fallback;
}

export function safeFormatDistanceToNow(dateInput: string | number | Date | null | undefined): string {
  if (!dateInput) return "Unknown time";
  try {
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "Unknown time";
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return "Unknown time";
  }
}


