import type { Snapshot, StoredHabit } from "./db";
export const localDate = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
export const previousMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return localDate(new Date(y, m - 2, 1)).slice(0, 7);
};
export const isActive = (data: Snapshot, h: StoredHabit, date: string) => {
  const event = data.activity
    .filter((a) => a.habitId === h.id && a.effectiveOn <= date)
    .sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn))[0];
  return h.createdOn <= date && (event?.active ?? false);
};
export function goalOn(data: Snapshot, h: StoredHabit, date: string) {
  const goals = data.goals
    .filter((g) => g.habitId === h.id && g.effectiveOn <= date)
    .sort((a, b) => b.effectiveOn.localeCompare(a.effectiveOn));
  return goals[0]?.targetHours ?? h.targetHours;
}
export function dailyHabits(data: Snapshot, date: string) {
  return data.habits
    .filter((h) => isActive(data, h, date))
    .map((h) => ({
      ...h,
      targetHours: goalOn(data, h, date),
      completed:
        data.logs.find((l) => l.habitId === h.id && l.logDate === date)
          ?.completed ?? false,
      loggedMinutes:
        data.logs.find((l) => l.habitId === h.id && l.logDate === date)
          ?.loggedMinutes ?? 0,
    }));
}
export function monthlyStats(data: Snapshot, month: string) {
  const [y, m] = month.split("-").map(Number);
  const days = new Date(y, m, 0).getDate();
  return data.habits
    .map((h) => {
      let targetHours = 0;
      for (let d = 1; d <= days; d++) {
        const date = `${month}-${String(d).padStart(2, "0")}`;
        if (isActive(data, h, date)) targetHours += goalOn(data, h, date);
      }
      const loggedHours =
        data.logs
          .filter(
            (l) => l.habitId === h.id && l.logDate.startsWith(month + "-"),
          )
          .reduce((sum, l) => sum + l.loggedMinutes, 0) / 60;
      return { ...h, targetHours, loggedHours };
    })
    .filter((h) => h.targetHours > 0 || h.loggedHours > 0);
}
export const percent = (logged: number, target: number) =>
  target > 0 ? Math.round((logged / target) * 100) : 0;
