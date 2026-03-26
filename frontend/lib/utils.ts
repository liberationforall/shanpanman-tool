import { clsx, type ClassValue } from "clsx";

/** Merge Tailwind class strings safely. */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

/** Format an ISO date string to a readable format, e.g. "11 Mar 2026". */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "Unknown";
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

/** Format an ISO date to a short label for chart axes, e.g. "11 Mar". */
export function formatDateShort(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
    });
  } catch {
    return iso;
  }
}

/** Extract username from a Twitter/X URL. */
export function extractTwitterUsername(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/x\.com\/([^/]+)\/status/);
  return match ? `@${match[1]}` : null;
}
