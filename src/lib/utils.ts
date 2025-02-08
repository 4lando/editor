import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Concatenates multiple class names into a single string.
 *
 * This function takes advantage of both `clsx` and `tailwind-merge` to merge class names.
 * It first uses `clsx` to merge the input class names, then passes the result to `twMerge`
 * to ensure the classes are correctly merged according to Tailwind CSS's rules.
 *
 * @param inputs - The class names to be merged
 * @returns The merged class names as a single string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
