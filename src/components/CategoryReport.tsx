import { BarChart3 } from "lucide-react";
import { MonthlyCategoryStat } from "../types/habit";

interface CategoryReportProps {
  stats: MonthlyCategoryStat[];
}

export function CategoryReport({ stats }: CategoryReportProps) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
      <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-400" />
        Porcentaje de Éxito Individual por Categoría
      </h2>

      <div className="space-y-6">
        {stats.map((item, idx) => {
          const Icon = item.icon;
          const percentage =
            item.targetHours > 0
              ? Math.round((item.loggedHours / item.targetHours) * 100)
              : 0;

          return (
            <div key={idx} className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <div className="flex items-center gap-2 font-medium text-slate-200">
                  <div className="p-1.5 rounded-lg bg-white/5 border border-white/10">
                    <Icon className="w-4 h-4 text-slate-300" />
                  </div>
                  {item.title}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-slate-400">
                    {Number(item.loggedHours.toFixed(1))}h /{" "}
                    {Number(item.targetHours.toFixed(1))}h
                  </span>
                  <span className="font-bold text-slate-100 min-w-[40px] text-right">
                    {percentage}%
                  </span>
                </div>
              </div>

              <div className="w-full bg-slate-900/60 rounded-full h-3 overflow-hidden border border-white/5">
                <div
                  className={`${item.color} h-3 rounded-full transition-all duration-500`}
                  style={{ width: `${Math.min(100, percentage)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
