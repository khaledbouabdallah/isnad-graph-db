import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Get color based on narrator rank
 */
export function getRankColor(rank: string | null): string {
  if (!rank) return "var(--default-rank)";

  if (rank.includes("صحابي")) return "var(--sahabi)";
  if (rank.includes("ثقة ثبت")) return "var(--thiqa-thabt)";
  if (rank.includes("ثقة")) return "var(--thiqa)";
  if (rank.includes("حافظ")) return "var(--hafiz)";

  return "var(--default-rank)";
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string | null, length: number): string {
  if (!text) return "";
  if (text.length <= length) return text;
  return text.slice(0, length) + "...";
}

/**
 * Format large numbers with Western Arabic numerals
 */
export function formatNumber(num: number): string {
  return num.toLocaleString("en-US");
}
