import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const durationStringToSlots = new Map<string, number>();
const slotsPerSecond = 2.5;

durationStringToSlots.set("5sec", 5 * slotsPerSecond);
durationStringToSlots.set("1min", 60 * slotsPerSecond);
durationStringToSlots.set("5min", 5 * 60 * slotsPerSecond);
durationStringToSlots.set("10min", 10 * 60 * slotsPerSecond);
durationStringToSlots.set("1hour", 60 * 60 * slotsPerSecond);
durationStringToSlots.set("1day", 60 * 60 * 24 * slotsPerSecond);
durationStringToSlots.set("1week", 60 * 60 * 24 * 7 * slotsPerSecond);
durationStringToSlots.set("1month", 60 * 60 * 24 * 30 * slotsPerSecond);
