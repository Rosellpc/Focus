import { useEffect, useRef, useState } from "react";
import { revealItemInDir } from "@tauri-apps/plugin-opener";
import {
  LayoutDashboard,
  BarChart3,
  Settings2,
  Sparkles,
  Code2,
  BookOpen,
  Languages,
  BrainCircuit,
  Dumbbell,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Modal } from "./components/Modal";
import { AppUpdater } from "./components/AppUpdater";
import { DesktopTools } from "./components/DesktopTools";
import { Header } from "./components/Header";
import { HabitCard } from "./components/HabitCard";
import { OverallProgress } from "./components/OverallProgress";
import { CategoryReport } from "./components/CategoryReport";
import { MonthPicker } from "./components/MonthPicker";
import { MonthlyMetrics } from "./components/MonthlyMetrics";
import {
  archiveHabit,
  completeHabit,
  exportBackup,
  importBackup,
  loadSnapshot,
  saveHabit,
  saveMinutes,
  type Snapshot,
  type StoredHabit,
} from "./services/db";
import {
  dailyHabits,
  localDate,
  monthlyStats,
  percent,
  previousMonth,
} from "./services/stats";

const icons: Record<string, LucideIcon> = {
  prog: Code2,
  read: BookOpen,
  eng: Languages,
  ml: BrainCircuit,
  ex: Dumbbell,
};
const colors: Record<string, { gradient: string; bar: string }> = {
  blue: { gradient: "from-blue-500/20 to-cyan-500/20", bar: "bg-blue-500" },
  amber: {
    gradient: "from-amber-500/20 to-orange-500/20",
    bar: "bg-amber-500",
  },
  purple: {
    gradient: "from-purple-500/20 to-indigo-500/20",
    bar: "bg-purple-500",
  },
  emerald: {
    gradient: "from-emerald-500/20 to-teal-500/20",
    bar: "bg-emerald-500",
  },
  rose: { gradient: "from-rose-500/20 to-pink-500/20", bar: "bg-rose-500" },
};
const empty: Snapshot = {
  version: 3,
  habits: [],
  logs: [],
  goals: [],
  activity: [],
};
const button = "quiet-button";
const input = "focus-input";
type Editor = { id: string; title: string; minutes: string; color: string };

export default function App() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "reports">(
    "dashboard",
  );
  const [data, setData] = useState(empty);
  const [today, setToday] = useState(localDate);
  const [date, setDate] = useState(localDate);
  const [month, setMonth] = useState(() => localDate().slice(0, 7));
  const [saving, setBusy] = useState(false);
  const [updating, setUpdating] = useState(false);
  const busy = saving || updating;
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [backupPath, setBackupPath] = useState("");
  const [editor, setEditor] = useState<Editor | null>(null);
  const [record, setRecord] = useState<{
    id: string;
    title: string;
    minutes: string;
    date: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const gate = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const update = () => setToday(localDate());
    const timer = window.setInterval(update, 1000);
    window.addEventListener("focus", update);
    document.addEventListener("visibilitychange", update);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", update);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const previousToday = useRef(today);
  useEffect(() => {
    const old = previousToday.current;
    setDate((d) => (d === old ? today : d));
    setMonth((m) => (m === old.slice(0, 7) ? today.slice(0, 7) : m));
    previousToday.current = today;
  }, [today]);
  useEffect(() => {
    let cancelled = false;
    loadSnapshot()
      .then((s) => {
        if (!cancelled) {
          setData(s);
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function run(action: () => Promise<unknown>, success: string) {
    if (gate.current) return false;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    let completed = false;
    try {
      await action();
      completed = true;
      const fresh = await loadSnapshot();
      setData(fresh);
      setLoaded(true);
      setMessage(success);
      return true;
    } catch (e) {
      if (completed) {
        setLoaded(false);
        setError(
          `La operación terminó, pero no se pudieron recargar los datos: ${String(e)}. Pulsa Recargar datos antes de continuar.`,
        );
      } else {
        setError(
          `No se pudo completar la operación: ${String(e)}. Puedes reintentar.`,
        );
      }
      return completed;
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  const habits = dailyHabits(data, date).map((h) => ({
    ...h,
    color: colors[h.color]?.gradient ?? colors.blue.gradient,
    icon: icons[h.id] ?? Target,
  }));
  const stats = monthlyStats(data, month).map((h) => ({
    ...h,
    color: colors[h.color]?.bar ?? colors.blue.bar,
    icon: icons[h.id] ?? Target,
  }));
  const totals = (rows: ReturnType<typeof monthlyStats>) => ({
    logged: rows.reduce((s, h) => s + h.loggedHours, 0),
    target: rows.reduce((s, h) => s + h.targetHours, 0),
  });
  const current = totals(stats),
    previous = totals(monthlyStats(data, previousMonth(month)));
  const best = stats
    .filter((h) => h.targetHours > 0 && h.loggedHours > 0)
    .sort(
      (a, b) => b.loggedHours / b.targetHours - a.loggedHours / a.targetHours,
    )[0];
  const pendingHabits = habits.filter((h) => !h.completed);
  const completedHabits = habits.filter((h) => h.completed);
  const dailyTarget = habits.reduce((s, h) => s + h.targetHours * 60, 0);
  function editHabit(h?: StoredHabit) {
    setEditor(
      h
        ? {
            id: h.id,
            title: h.title,
            minutes: String(Math.round(h.targetHours * 60)),
            color: h.color,
          }
        : { id: crypto.randomUUID(), title: "", minutes: "60", color: "blue" },
    );
  }

  return (
    <div className="focus-app">
      <div className="focus-shell">
        <aside className="focus-rail" aria-label="Accesos rápidos">
          <div className="rail-brand">
            <Sparkles size={19} />
          </div>
          <button
            title="Ir a tareas"
            aria-label="Ir a tareas"
            className={
              activeTab === "dashboard"
                ? "rail-button is-active"
                : "rail-button"
            }
            onClick={() => setActiveTab("dashboard")}
          >
            <LayoutDashboard size={18} strokeWidth={1.5} />
          </button>
          <button
            title="Ir a reportes"
            aria-label="Ir a reportes"
            className={
              activeTab === "reports" ? "rail-button is-active" : "rail-button"
            }
            onClick={() => setActiveTab("reports")}
          >
            <BarChart3 size={18} strokeWidth={1.5} />
          </button>
          <button
            title="Opciones de escritorio"
            aria-label="Opciones de escritorio"
            className="rail-button"
            onClick={() => {
              const tools = document.getElementById(
                "desktop-tools",
              ) as HTMLElement | null;
              if (tools) {
                tools.scrollIntoView({ behavior: "smooth", block: "center" });
              }
            }}
          >
            <Settings2 size={18} strokeWidth={1.5} />
          </button>
          <span className="rail-line" />
          <span className="live-dot" />
        </aside>
        <div className="focus-content">
          <Header
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            targetHours={dailyTarget / 60}
          />
          <AppUpdater busy={busy || !!editor || !!record || !!pendingImport} onInstallingChange={setUpdating} />
          <fieldset disabled={busy} className="action-toolbar">
            <button
              className={button}
              onClick={() => editHabit()}
              disabled={!loaded}
            >
              Nuevo hábito
            </button>
            <button
              className={button}
              disabled={!loaded}
              onClick={() =>
                void run(async () => {
                  setBackupPath(await exportBackup());
                }, "Respaldo guardado. Copia el archivo a otra unidad para proteger tus datos.")
              }
            >
              Crear respaldo
            </button>
            <button
              className={button}
              disabled={!loaded}
              onClick={() => fileInput.current?.click()}
            >
              Restaurar respaldo
            </button>
            {backupPath && (
              <button
                className={button}
                onClick={() =>
                  void run(
                    () => revealItemInDir(backupPath),
                    "Carpeta de respaldos abierta.",
                  )
                }
              >
                Mostrar respaldo
              </button>
            )}
            <input
              ref={fileInput}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file) return;
                try {
                  if (file.size > 50_000_000)
                    throw new Error("El archivo supera 50 MB");
                  const content = await file.text();
                  const parsed = JSON.parse(content);
                  if (
                    ![1, 2, 3].includes(parsed.version) ||
                    !Array.isArray(parsed.habits) ||
                    !Array.isArray(parsed.logs) ||
                    !Array.isArray(parsed.goals)
                  )
                    throw new Error("Formato de respaldo no compatible");
                  setPendingImport({ name: file.name, content });
                } catch (err) {
                  setError(String(err));
                }
              }}
            />
          </fieldset>

          {busy && (
            <p role="status" className="mb-4 text-blue-300">
              Guardando…
            </p>
          )}
          {error && (
            <div
              role="alert"
              className="mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 p-4"
            >
              <p>{error}</p>
              <button
                className={button + " mt-2"}
                disabled={busy}
                onClick={() => void run(async () => {}, "Datos recargados.")}
              >
                Recargar datos
              </button>
            </div>
          )}
          {message && (
            <p role="status" className="mb-4 text-emerald-300">
              {message}
            </p>
          )}
          {!loaded && !error && <p role="status">Cargando tus datos…</p>}
          {loaded && activeTab === "dashboard" && (
            <main className="space-y-6">
              <label className="date-toolbar">
                Fecha del registro{" "}
                <input
                  aria-label="Fecha del registro"
                  type="date"
                  min="1970-01-01"
                  max={today}
                  value={date}
                  disabled={busy}
                  onChange={(e) => {
                    if (e.target.value) setDate(e.target.value);
                  }}
                  className={input + " !w-auto"}
                />
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => setDate(today)}
                >
                  Hoy
                </button>
              </label>
              <OverallProgress
                totalLoggedMinutes={habits.reduce(
                  (s, h) => s + h.loggedMinutes,
                  0,
                )}
                totalTargetMinutes={dailyTarget}
              />
              {!habits.length && (
                <p className="text-slate-400">
                  No hay hábitos activos para esta fecha.
                </p>
              )}
              {habits.length > 0 && pendingHabits.length === 0 && (
                <p role="status" className="text-emerald-300">
                  Todas las tareas de este día están completadas. Volverán a
                  aparecer mañana.
                </p>
              )}
              <div className="section-label">
                <h2>Tus tareas</h2>
                <span>
                  {pendingHabits.length} pendientes · {completedHabits.length}{" "}
                  completadas
                </span>
              </div>
              <div className="habit-grid">
                {pendingHabits.map((h) => (
                  <div key={h.id} className="task-unit glass-panel">
                    <HabitCard
                      habit={h}
                      disabled={busy}
                      onComplete={(id) =>
                        void run(
                          () => completeHabit(id, date),
                          "Tarea completada. Sus horas quedan registradas.",
                        )
                      }
                      onAddMinutes={(id, minutes) =>
                        void run(
                          () => saveMinutes(id, date, minutes, true),
                          "Minutos guardados.",
                        )
                      }
                    />
                    <div className="task-actions">
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() =>
                          void run(
                            () => saveMinutes(h.id, date, -30, true),
                            "Registro corregido.",
                          )
                        }
                      >
                        −30m
                      </button>
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() =>
                          setRecord({
                            id: h.id,
                            title: h.title,
                            minutes: String(h.loggedMinutes),
                            date,
                          })
                        }
                      >
                        Editar minutos
                      </button>
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() =>
                          editHabit(data.habits.find((x) => x.id === h.id))
                        }
                      >
                        Editar hábito
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <DesktopTools
                habits={data.habits}
                busy={busy}
                onSave={(id, sessionDate, minutes) =>
                  run(
                    () => saveMinutes(id, sessionDate, minutes, true),
                    "Sesión guardada.",
                  )
                }
              />
              {completedHabits.length > 0 && (
                <details className="rounded-xl border border-emerald-500/20 p-4">
                  <summary className="cursor-pointer">
                    Tareas completadas ({completedHabits.length})
                  </summary>
                  <div className="mt-3 space-y-2">
                    {completedHabits.map((h) => (
                      <div
                        key={h.id}
                        className="flex flex-wrap items-center justify-between gap-2"
                      >
                        <span>
                          {h.title} ·{" "}
                          {Number((h.loggedMinutes / 60).toFixed(2))} h
                          registradas
                        </span>
                        <button
                          className={button}
                          disabled={busy}
                          onClick={() =>
                            void run(
                              () => completeHabit(h.id, date, false),
                              "Tarea visible de nuevo. Sus horas se conservan.",
                            )
                          }
                        >
                          Volver a mostrar
                        </button>
                      </div>
                    ))}
                  </div>
                </details>
              )}
              <details className="rounded-xl border border-white/10 p-4">
                <summary className="cursor-pointer">
                  Administrar hábitos
                </summary>
                <p className="text-sm text-slate-400 my-3">
                  Las metas nuevas se aplican desde hoy. Archivar conserva el
                  historial; reactivar lo incluye de nuevo desde hoy.
                </p>
                <div className="space-y-2">
                  {data.habits.map((h) => (
                    <div
                      key={h.id}
                      className="flex flex-wrap justify-between gap-2 items-center"
                    >
                      <span>
                        {h.title} · {Math.round(h.targetHours * 60)} min{" "}
                        {h.archivedOn ? "· Archivado" : ""}
                      </span>
                      <div className="flex gap-2">
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() => editHabit(h)}
                        >
                          Editar
                        </button>
                        <button
                          disabled={busy}
                          className={button}
                          onClick={() =>
                            void run(
                              () => archiveHabit(h.id, today, !h.archivedOn),
                              h.archivedOn
                                ? "Hábito reactivado."
                                : "Hábito archivado. Su historial se conserva.",
                            )
                          }
                        >
                          {h.archivedOn ? "Reactivar" : "Archivar"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            </main>
          )}
          {loaded && activeTab === "reports" && (
            <main className="space-y-6">
              <MonthPicker selectedYearMonth={month} onChange={setMonth} />
              <MonthlyMetrics
                monthlyOverallPercentage={percent(
                  current.logged,
                  current.target,
                )}
                currentLoggedMonthlyHours={Number(current.logged.toFixed(1))}
                targetMonthlyHours={Number(current.target.toFixed(1))}
                comparison={
                  previous.logged > 0
                    ? percent(current.logged, current.target) -
                      percent(previous.logged, previous.target)
                    : null
                }
                bestTitle={best?.title ?? "Sin registros"}
                bestPercentage={
                  best ? percent(best.loggedHours, best.targetHours) : null
                }
              />
              <CategoryReport stats={stats} />
              {!stats.length && (
                <p className="text-slate-400">No hay datos para este mes.</p>
              )}
              <p className="text-xs text-slate-400">
                El porcentaje compara las horas registradas con la meta del mes
                completo, según el historial de metas.
              </p>
            </main>
          )}
          {loaded && activeTab === "reports" && (
            <DesktopTools
              habits={data.habits}
              busy={busy}
              onSave={(id, sessionDate, minutes) =>
                run(
                  () => saveMinutes(id, sessionDate, minutes, true),
                  "Sesión guardada.",
                )
              }
            />
          )}
          {editor && (
            <Modal
              titleId="habit-title"
              onClose={() => setEditor(null)}
              busy={busy}
            >
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await saveHabit(
                      {
                        id: editor.id,
                        title: editor.title,
                        targetHours: Number(editor.minutes) / 60,
                        color: editor.color,
                      },
                      today,
                    );
                    setEditor(null);
                  }, "Hábito guardado.");
                }}
                className="space-y-4"
              >
                <h2 id="habit-title" className="font-bold text-lg">
                  {data.habits.some((h) => h.id === editor.id)
                    ? "Editar hábito"
                    : "Nuevo hábito"}
                </h2>
                <label className="block">
                  Nombre
                  <input
                    autoFocus
                    required
                    maxLength={80}
                    value={editor.title}
                    onChange={(e) =>
                      setEditor({ ...editor, title: e.target.value })
                    }
                    className={input}
                  />
                </label>
                <label className="block">
                  Meta diaria en minutos
                  <input
                    type="number"
                    required
                    min={1}
                    max={1440}
                    step={1}
                    value={editor.minutes}
                    onChange={(e) =>
                      setEditor({ ...editor, minutes: e.target.value })
                    }
                    className={input}
                  />
                </label>
                <label className="block">
                  Color
                  <select
                    value={editor.color}
                    onChange={(e) =>
                      setEditor({ ...editor, color: e.target.value })
                    }
                    className={input}
                  >
                    <option value="blue">Azul</option>
                    <option value="amber">Ámbar</option>
                    <option value="purple">Morado</option>
                    <option value="emerald">Verde</option>
                    <option value="rose">Rosa</option>
                  </select>
                </label>
                <p className="text-xs text-slate-400">
                  La meta se aplica desde hoy. Los días anteriores conservan su
                  meta.
                </p>
                <div className="flex gap-2">
                  <button disabled={busy} className={button} type="submit">
                    Guardar
                  </button>
                  <button
                    disabled={busy}
                    className={button}
                    type="button"
                    onClick={() => setEditor(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </Modal>
          )}
          {record && (
            <Modal
              titleId="record-title"
              onClose={() => setRecord(null)}
              busy={busy}
            >
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  void run(async () => {
                    await saveMinutes(
                      record.id,
                      record.date,
                      Number(record.minutes),
                    );
                    setRecord(null);
                  }, "Registro corregido.");
                }}
              >
                <h2 id="record-title" className="font-bold">
                  {record.title} · {record.date}
                </h2>
                <label className="block">
                  Total de minutos
                  <input
                    autoFocus
                    type="number"
                    required
                    min={0}
                    max={1440}
                    step={1}
                    className={input}
                    value={record.minutes}
                    onChange={(e) =>
                      setRecord({ ...record, minutes: e.target.value })
                    }
                  />
                </label>
                <div className="flex gap-2">
                  <button className={button} disabled={busy}>
                    Guardar
                  </button>
                  <button
                    type="button"
                    className={button}
                    disabled={busy}
                    onClick={() => setRecord(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </Modal>
          )}
          {pendingImport && (
            <Modal
              titleId="restore-title"
              onClose={() => setPendingImport(null)}
              busy={busy}
            >
              <h2 id="restore-title" className="font-bold">
                Restaurar respaldo
              </h2>
              <p>
                Se reemplazarán tus hábitos y registros por los de{" "}
                {pendingImport.name}. Se guardará una copia de los datos
                actuales antes de restaurar.
              </p>
              <div className="flex gap-2">
                <button
                  disabled={busy}
                  className={button}
                  onClick={() =>
                    void run(async () => {
                      setBackupPath(await importBackup(pendingImport.content));
                      setPendingImport(null);
                    }, "Respaldo restaurado. La copia anterior está disponible en Mostrar respaldo.")
                  }
                >
                  Restaurar
                </button>
                <button
                  disabled={busy}
                  className={button}
                  onClick={() => setPendingImport(null)}
                >
                  Cancelar
                </button>
              </div>
            </Modal>
          )}
        </div>
      </div>
    </div>
  );
}
