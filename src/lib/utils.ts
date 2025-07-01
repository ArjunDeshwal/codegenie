import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
/*DYNAMIC TAILWIND CAN BE ADDED */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
