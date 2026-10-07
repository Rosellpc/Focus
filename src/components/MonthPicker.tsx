import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MonthPickerProps {
  selectedYearMonth: string; // Formato "YYYY-MM"
  onChange: (newYearMonth: string) => void;
}

export function MonthPicker({ selectedYearMonth, onChange }: MonthPickerProps) {
  const [yearStr, monthStr] = selectedYearMonth.split("-");
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10) - 1; // 0-indexed para Date

  const date = new Date(year, month, 1);
  const monthName = date.toLocaleString("es-ES", { month: "long" });

  const handlePrev = () => {
    const prevDate = new Date(year, month - 1, 1);
    const y = prevDate.getFullYear();
    const m = String(prevDate.getMonth() + 1).padStart(2, "0");
    onChange(`${y}-${m}`);
  };

  const handleNext = () => {
    const nextDate = new Date(year, month + 1, 1);
    const y = nextDate.getFullYear();
    const m = String(nextDate.getMonth() + 1).padStart(2, "0");
    onChange(`${y}-${m}`);
  };

  return (
    <div className="flex items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 p-3 px-4 rounded-2xl shadow-md">
      <div className="flex items-center gap-2 text-slate-300 font-medium text-sm capitalize">
        <Calendar className="w-4 h-4 text-blue-400" />
        <span>
          {monthName} {year}
        </span>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handlePrev}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          title="Mes anterior"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button
          onClick={handleNext}
          className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 hover:text-white transition-all"
          title="Mes siguiente"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
