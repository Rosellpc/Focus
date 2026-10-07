import { ArrowUpRight, Clock3, Target } from "lucide-react";
interface OverallProgressProps {
  totalLoggedMinutes: number;
  totalTargetMinutes: number;
}
export function OverallProgress({
  totalLoggedMinutes,
  totalTargetMinutes,
}: OverallProgressProps) {
  const percentage =
    totalTargetMinutes > 0
      ? Math.round((totalLoggedMinutes / totalTargetMinutes) * 100)
      : 0;
  const progress = Math.min(100, percentage);
  return (
    <section className="daily-overview" aria-label="Progreso diario">
      <div className="overview-main glass-panel">
        <div className="eyebrow">
          <span className="live-dot" /> TU ESPACIO PERSONAL
          <ArrowUpRight size={15} />
        </div>
        <h2>
          Menos ruido.
          <br />
          <span>Más enfoque.</span>
        </h2>
        <p className="overview-copy">Cada pequeño avance cuenta.</p>
        <div className="overview-stats">
          <div>
            <span>
              <Clock3 size={13} /> TIEMPO REGISTRADO
            </span>
            <strong>
              {(totalLoggedMinutes / 60).toFixed(1)} <small>h</small>
            </strong>
          </div>
          <div>
            <span>
              <Target size={13} /> META DEL DÍA
            </span>
            <strong>
              {(totalTargetMinutes / 60).toFixed(1)} <small>h</small>
            </strong>
          </div>
        </div>
        <div className="overview-total">
          {(totalLoggedMinutes / 60).toFixed(1)} /{" "}
          {(totalTargetMinutes / 60).toFixed(1)} horas
        </div>
      </div>
      <div className="overview-ring glass-panel">
        <div className="eyebrow">PROGRESO DIARIO TOTAL</div>
        <div className="progress-dial">
          <svg viewBox="0 0 160 160" aria-hidden="true">
            <circle className="dial-track" cx="80" cy="80" r="65" />
            <circle
              className="dial-fill"
              cx="80"
              cy="80"
              r="65"
              pathLength="100"
              strokeDasharray={`${progress} 100`}
            />
          </svg>
          <div>
            <strong>
              {percentage}
              <span>%</span>
            </strong>
            <p>de tu objetivo</p>
          </div>
        </div>
        <div className="ring-caption">
          <span className="live-dot" />
          {percentage >= 100 ? "Meta alcanzada" : "A tu propio ritmo"}
        </div>
      </div>
    </section>
  );
}
