import { Plus, Check, ArrowUpRight } from "lucide-react";
import type { Habit } from "../types/habit";
interface HabitCardProps {
  disabled: boolean;
  habit: Habit;
  onComplete: (id: string) => void;
  onAddMinutes: (id: string, minutes: number) => void;
}
export function HabitCard({
  habit,
  onAddMinutes,
  onComplete,
  disabled,
}: HabitCardProps) {
  const Icon = habit.icon;
  const percentage = Math.round(
    (habit.loggedMinutes / (habit.targetHours * 60)) * 100,
  );
  return (
    <div className="habit-card">
      <div className="habit-top">
        <div className="habit-icon">
          <Icon size={21} strokeWidth={1.4} />
        </div>
        <span className="habit-percentage">
          {percentage >= 100 && <Check size={12} />}
          {percentage}%<ArrowUpRight size={12} />
        </span>
      </div>
      <span className="eyebrow habit-label">HÁBITO DIARIO</span>
      <h2>{habit.title}</h2>
      <p className="habit-time">
        {(habit.loggedMinutes / 60).toFixed(1)} / {habit.targetHours}h (
        {percentage}%)
      </p>
      <div className="habit-track">
        <div style={{ width: `${Math.min(100, percentage)}%` }} />
      </div>
      <div className="habit-controls">
        <div className="minute-controls">
          <button
            disabled={disabled}
            onClick={() => onAddMinutes(habit.id, 30)}
          >
            <Plus size={12} />
            30m
          </button>
          <button
            disabled={disabled}
            onClick={() => onAddMinutes(habit.id, 60)}
          >
            <Plus size={12} />
            1h
          </button>
        </div>
        <button
          className="complete-button"
          disabled={disabled}
          onClick={() => onComplete(habit.id)}
        >
          <Check size={13} />
          Tarea completada
        </button>
      </div>
    </div>
  );
}
