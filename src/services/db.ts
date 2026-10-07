import { invoke } from "@tauri-apps/api/core";

export interface StoredHabit {
  id: string;
  title: string;
  targetHours: number;
  color: string;
  createdOn: string;
  archivedOn: string | null;
}
export interface DailyLog {
  habitId: string;
  logDate: string;
  loggedMinutes: number;
  completed: boolean;
}
export interface Goal {
  habitId: string;
  effectiveOn: string;
  targetHours: number;
}
export interface Activity {
  habitId: string;
  effectiveOn: string;
  active: boolean;
}
export interface Snapshot {
  version: number;
  habits: StoredHabit[];
  logs: DailyLog[];
  goals: Goal[];
  activity: Activity[];
}
export const loadSnapshot = () => invoke<Snapshot>("snapshot");
export const saveMinutes = (
  habitId: string,
  date: string,
  minutes: number,
  delta = false,
) => invoke("save_minutes", { habitId, date, minutes, delta });
export const completeHabit = (
  habitId: string,
  date: string,
  completed = true,
) => invoke("complete_habit", { habitId, date, completed });
export const saveHabit = (
  habit: Pick<StoredHabit, "id" | "title" | "targetHours" | "color">,
  date: string,
) => invoke("save_habit", { ...habit, date });
export const archiveHabit = (id: string, date: string, archived: boolean) =>
  invoke("archive_habit", { id, date, archived });
export const exportBackup = () => invoke<string>("export_backup");
export const importBackup = (content: string) =>
  invoke<string>("import_backup", { content });
