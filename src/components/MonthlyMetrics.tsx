import { TrendingUp, Clock, Award } from "lucide-react";
interface MonthlyMetricsProps {
  comparison: number | null;
  bestTitle: string;
  bestPercentage: number | null;
  monthlyOverallPercentage: number;
  currentLoggedMonthlyHours: number;
  targetMonthlyHours: number;
}
export function MonthlyMetrics({
  comparison,
  bestTitle,
  bestPercentage,
  monthlyOverallPercentage,
  currentLoggedMonthlyHours,
  targetMonthlyHours,
}: MonthlyMetricsProps) {
  return (
    <div className="monthly-metrics">
      <div className="metric glass-panel">
        <div className="metric-label">
          <TrendingUp size={15} /> Éxito Global Mensual
        </div>
        <strong>
          {monthlyOverallPercentage}
          <small>%</small>
        </strong>
        <p>
          {comparison === null
            ? "Sin registros del mes anterior"
            : `${comparison > 0 ? "+" : ""}${comparison} puntos respecto al mes anterior`}
        </p>
      </div>
      <div className="metric glass-panel">
        <div className="metric-label">
          <Clock size={15} /> Horas Acumuladas
        </div>
        <strong>
          {currentLoggedMonthlyHours}
          <small>h</small>
        </strong>
        <p>de {targetMonthlyHours}h proyectadas</p>
      </div>
      <div className="metric glass-panel">
        <div className="metric-label">
          <Award size={15} /> Mejor Categoría
        </div>
        <strong className="metric-title">{bestTitle}</strong>
        <p>
          {bestPercentage === null
            ? "Sin actividad registrada"
            : `${bestPercentage}% de cumplimiento`}
        </p>
      </div>
    </div>
  );
}
