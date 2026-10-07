import { useState } from "react";
import { 
  Code2, 
  BookOpen, 
  Languages, 
  BrainCircuit, 
  Dumbbell, 
  Plus, 
  CheckCircle2, 
  BarChart3, 
  Calendar,
  LayoutDashboard,
  Award,
  TrendingUp,
  Clock
} from "lucide-react";

interface Habit {
  id: string;
  title: string;
  targetHours: number;
  loggedMinutes: number;
  color: string;
  icon: any;
}

const INITIAL_HABITS: Habit[] = [
  { id: "prog", title: "Programación", targetHours: 6, loggedMinutes: 180, color: "from-blue-500/20 to-cyan-500/20", icon: Code2 },
  { id: "read", title: "Lectura", targetHours: 2, loggedMinutes: 120, color: "from-amber-500/20 to-orange-500/20", icon: BookOpen },
  { id: "eng", title: "Inglés", targetHours: 1, loggedMinutes: 60, color: "from-purple-500/20 to-indigo-500/20", icon: Languages },
  { id: "ml", title: "Machine Learning", targetHours: 1, loggedMinutes: 30, color: "from-emerald-500/20 to-teal-500/20", icon: BrainCircuit },
  { id: "ex", title: "Ejercicio", targetHours: 1, loggedMinutes: 60, color: "from-rose-500/20 to-pink-500/20", icon: Dumbbell },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports">("dashboard");
  const [habits, setHabits] = useState<Habit[]>(INITIAL_HABITS);

  const addMinutes = (id: string, minutes: number) => {
    setHabits((prev) =>
      prev.map((h) => {
        if (h.id === id) {
          const maxMinutes = h.targetHours * 60;
          const newLogged = Math.min(maxMinutes, h.loggedMinutes + minutes);
          return { ...h, loggedMinutes: newLogged };
        }
        return h;
      })
    );
  };

  const totalTargetMinutes = 11 * 60;
  const totalLoggedMinutes = habits.reduce((acc, h) => acc + h.loggedMinutes, 0);
  const overallPercentage = Math.round((totalLoggedMinutes / totalTargetMinutes) * 100);

  // Datos simulados del mes actual (Octubre)
  const daysInMonth = 30;
  const targetMonthlyHours = 11 * daysInMonth; // 330 hrs
  const currentLoggedMonthlyHours = 248.5; // horas logueadas simuladas
  const monthlyOverallPercentage = Math.round((currentLoggedMonthlyHours / targetMonthlyHours) * 100);

  const monthlyCategoryStats = [
    { title: "Programación", targetHours: 180, loggedHours: 142, color: "bg-blue-500", icon: Code2 },
    { title: "Lectura", targetHours: 60, loggedHours: 48, color: "bg-amber-500", icon: BookOpen },
    { title: "Inglés", targetHours: 30, loggedHours: 26, color: "bg-purple-500", icon: Languages },
    { title: "Machine Learning", targetHours: 30, loggedHours: 18.5, color: "bg-emerald-500", icon: BrainCircuit },
    { title: "Ejercicio", targetHours: 30, loggedHours: 25, color: "bg-rose-500", icon: Dumbbell },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] text-slate-100 p-6 max-w-6xl mx-auto">
      {/* Header con Navegación por Pestañas */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-lg">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
            Focus AI
          </h1>
          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
            <Calendar className="w-3.5 h-3.5" /> Meta Diaria: 11 Horas
          </p>
        </div>

        {/* Tab Buttons */}
        <div className="flex bg-slate-900/80 p-1 rounded-xl border border-white/10 w-full sm:w-auto">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "dashboard"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab("reports")}
            className={`flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === "reports"
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Reporte Mensual
          </button>
        </div>
      </header>

      {/* VISTA 1: DASHBOARD */}
      {activeTab === "dashboard" && (
        <main className="space-y-8">
          {/* Resumen General */}
          <div className="bg-gradient-to-r from-blue-900/20 to-purple-900/20 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
            <div className="flex justify-between items-end mb-2">
              <div>
                <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Progreso Diario Total</span>
                <div className="text-2xl font-bold text-white">
                  {(totalLoggedMinutes / 60).toFixed(1)} / 11.0 <span className="text-sm font-normal text-slate-400">horas</span>
                </div>
              </div>
              <span className="text-lg font-bold text-blue-400">{overallPercentage}%</span>
            </div>
            <div className="w-full bg-slate-800/60 rounded-full h-3 overflow-hidden border border-white/5">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-500 h-3 rounded-full transition-all duration-500"
                style={{ width: `${overallPercentage}%` }}
              />
            </div>
          </div>

          {/* Grid de Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {habits.map((habit) => {
              const Icon = habit.icon;
              const targetMinutes = habit.targetHours * 60;
              const percentage = Math.round((habit.loggedMinutes / targetMinutes) * 100);
              const isCompleted = habit.loggedMinutes >= targetMinutes;

              return (
                <div
                  key={habit.id}
                  className={`bg-gradient-to-br ${habit.color} backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:border-white/20 transition-all`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <div className="p-2.5 bg-white/10 rounded-xl border border-white/10">
                        <Icon className="w-5 h-5 text-white" />
                      </div>
                      {isCompleted && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Meta Lista
                        </span>
                      )}
                    </div>

                    <h2 className="font-semibold text-slate-100 text-base">{habit.title}</h2>
                    <div className="text-xs text-slate-400 mt-1">
                      {(habit.loggedMinutes / 60).toFixed(1)} / {habit.targetHours}h ({percentage}%)
                    </div>

                    <div className="w-full bg-slate-900/50 rounded-full h-2 my-3 overflow-hidden border border-white/5">
                      <div
                        className="bg-white/80 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => addMinutes(habit.id, 30)}
                      disabled={isCompleted}
                      className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 border border-white/10 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" /> 30m
                    </button>
                    <button
                      onClick={() => addMinutes(habit.id, 60)}
                      disabled={isCompleted}
                      className="flex-1 flex items-center justify-center gap-1 bg-white/10 hover:bg-white/20 border border-white/10 py-1.5 rounded-lg text-xs font-medium transition-all disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3" /> 1h
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* VISTA 2: REPORTE MENSUAL */}
      {activeTab === "reports" && (
        <main className="space-y-8">
          {/* Métricas Resumen del Mes */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-500/10 rounded-xl border border-blue-500/20 text-blue-400">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Éxito Global Mensual</span>
              </div>
              <div className="text-3xl font-extrabold text-white">{monthlyOverallPercentage}%</div>
              <p className="text-[11px] text-emerald-400 mt-1">↑ +4% respecto al mes anterior</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Horas Acumuladas</span>
              </div>
              <div className="text-3xl font-extrabold text-white">{currentLoggedMonthlyHours}h</div>
              <p className="text-[11px] text-slate-400 mt-1">de {targetMonthlyHours}h proyectadas</p>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-5 rounded-2xl shadow-lg">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-purple-500/10 rounded-xl border border-purple-500/20 text-purple-400">
                  <Award className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-400 font-medium">Mejor Categoría</span>
              </div>
              <div className="text-2xl font-bold text-white">Inglés</div>
              <p className="text-[11px] text-purple-300 mt-1">87% de cumplimiento</p>
            </div>
          </div>

          {/* Desglose Individual por Categoría */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl shadow-xl">
            <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-400" />
              Porcentaje de Éxito Individual por Categoría
            </h2>

            <div className="space-y-6">
              {monthlyCategoryStats.map((item, idx) => {
                const Icon = item.icon;
                const percentage = Math.round((item.loggedHours / item.targetHours) * 100);

                return (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <div className="flex items-center gap-2 font-medium text-slate-200">
                        <div className={`p-1.5 rounded-lg bg-white/5 border border-white/10`}>
                          <Icon className="w-4 h-4 text-slate-300" />
                        </div>
                        {item.title}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400">
                          {item.loggedHours}h / {item.targetHours}h
                        </span>
                        <span className="font-bold text-slate-100 min-w-[40px] text-right">
                          {percentage}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar con Color Personalizado */}
                    <div className="w-full bg-slate-900/60 rounded-full h-3 overflow-hidden border border-white/5">
                      <div
                        className={`${item.color} h-3 rounded-full transition-all duration-500`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}