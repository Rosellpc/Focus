import { LucideIcon } from "lucide-react";

export interface Habit {
  id: string;
  title: string;
  targetHours: number;
  loggedMinutes: number;
  color: string;
  icon: LucideIcon;
}

export interface MonthlyCategoryStat {
  title: string;
  targetHours: number;
  loggedHours: number;
  color: string;
  icon: LucideIcon;
}
