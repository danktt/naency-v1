import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to generate gradient from color
export const getGradientFromColor = (color: string | undefined | null) => {
  const safeColor = color || "#6366F1"; // Default fallback
  // Convert hex to RGB
  const hex = safeColor.replace("#", "");
  const r = Number.parseInt(hex.substring(0, 2), 16);
  const g = Number.parseInt(hex.substring(2, 4), 16);
  const b = Number.parseInt(hex.substring(4, 6), 16);

  // Create a darker variant for gradient
  const darkerR = Math.max(0, r - 40);
  const darkerG = Math.max(0, g - 40);
  const darkerB = Math.max(0, b - 40);

  return `linear-gradient(135deg, ${safeColor} 0%, rgb(${darkerR}, ${darkerG}, ${darkerB}) 100%)`;
};
