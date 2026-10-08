import { useEffect, useState } from "react";
import { LayoutDashboard, BarChart3, Sparkles } from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
interface HeaderProps {
  targetHours: number;
  activeTab: "dashboard" | "reports";
  setActiveTab: (tab: "dashboard" | "reports") => void;
}
export function Header({ activeTab, setActiveTab, targetHours }: HeaderProps) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return (
    <header className="focus-header">
      <div className="focus-brand">
        <div className="brand-mark">
          <Sparkles size={19} strokeWidth={1.5} />
        </div>
        <div>
          <h1>
            Focus<span className="brand-dot">.</span>
          </h1>
          <p>Un día a la vez.</p>
        </div>
      </div>
      <ThemeToggle />
      <nav aria-label="Vistas de Focus" className="view-switch">
        <button
          aria-pressed={activeTab === "dashboard"}
          onClick={() => setActiveTab("dashboard")}
          className={`view-tab ${activeTab === "dashboard" ? "is-active" : ""}`}
        >
          <LayoutDashboard size={15} strokeWidth={1.5} />
          Dashboard
        </button>
        <button
          aria-pressed={activeTab === "reports"}
          onClick={() => setActiveTab("reports")}
          className={`view-tab ${activeTab === "reports" ? "is-active" : ""}`}
        >
          <BarChart3 size={15} strokeWidth={1.5} />
          Reporte Mensual
        </button>
      </nav>
      <div className="header-clock">
        <time>
          {now.toLocaleTimeString("es-CO", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
          })}
        </time>
        <p>Meta diaria: {Number(targetHours.toFixed(2))} horas</p>
      </div>
    </header>
  );
}
