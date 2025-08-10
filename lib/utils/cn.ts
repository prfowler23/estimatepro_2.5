import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility function to merge CSS classes using clsx and tailwind-merge
 * Combines multiple class values and deduplicates Tailwind classes
 *
 * @param inputs - Class values to merge (strings, objects, arrays, etc.)
 * @returns Merged and deduplicated class string
 *
 * @example
 * cn("px-2 py-1", "px-3") // Returns "py-1 px-3" (px-2 is overridden)
 * cn("text-red-500", { "text-blue-500": true }) // Returns "text-blue-500"
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
