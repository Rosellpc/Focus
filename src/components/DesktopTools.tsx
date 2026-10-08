import { useEffect, useRef, useState } from "react";
import {
  Play,
  Check,
  Square,
  Bell,
  Monitor,
  PanelsTopLeft,
  Timer,
} from "lucide-react";
import { enable, disable, isEnabled } from "@tauri-apps/plugin-autostart";
import {
  isPermissionGranted,
  requestPermission,
  sendNotification,
} from "@tauri-apps/plugin-notification";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { localDate } from "../services/stats";
import type { StoredHabit } from "../services/db";
type Session = {
  habitId: string;
  date: string;
  started: number;
  end: number;
  notified: boolean;
};
const key = "focus-timer-v1";
function readSession(): Session | null {
  try {
    const s = JSON.parse(localStorage.getItem(key) ?? "null");
    return s &&
      typeof s.habitId === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(s.date) &&
      Number.isFinite(s.started) &&
      Number.isFinite(s.end) &&
      s.end > s.started &&
      s.end - s.started <= 1440 * 60000
      ? s
      : null;
  } catch {
    return null;
  }
}
export function DesktopTools({
  habits,
  busy,
  onSave,
}: {
  habits: StoredHabit[];
  busy: boolean;
  onSave: (id: string, date: string, minutes: number) => Promise<boolean>;
}) {
  const [session, setSession] = useState<Session | null>(readSession);
  const [now, setNow] = useState(Date.now);
  const [habitId, setHabitId] = useState("");
  const [duration, setDuration] = useState("25");
  const [auto, setAuto] = useState(false);
  const [settingBusy, setSettingBusy] = useState(false);
  const [notifications, setNotifications] = useState(
    () => localStorage.getItem("focus-notifications") === "true",
  );
  const [error, setError] = useState("");
  const notified = useRef(false);
  useEffect(() => {
    isEnabled()
      .then(setAuto)
      .catch((e) => setError(String(e)));
  }, []);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    try {
      if (session) localStorage.setItem(key, JSON.stringify(session));
      else localStorage.removeItem(key);
    } catch {
      setError("No se pudo conservar el temporizador para el próximo inicio.");
    }
  }, [session]);
  const finished = session !== null && now >= session.end;
  useEffect(() => {
    if (!session || !finished || session.notified || notified.current) return;
    notified.current = true;
    setSession({ ...session, notified: true });
    if (notifications)
      void isPermissionGranted()
        .then((granted) => {
          if (granted)
            sendNotification({
              title: "Focus",
              body: "Sesión terminada. Abre Focus para guardar los minutos.",
            });
        })
        .catch((e) => setError(String(e)));
  }, [session, finished, notifications]);
  const active = habits.filter((h) => !h.archivedOn);
  const selectedId = habitId || active[0]?.id || "";
  const durationValue = Number(duration);
  const seconds = session
    ? Math.max(0, Math.ceil((session.end - now) / 1000))
    : Number.isFinite(durationValue)
      ? Math.max(0, durationValue) * 60
      : 0;
  const fraction = session
    ? Math.max(
        0,
        Math.min(1, (session.end - now) / (session.end - session.started)),
      )
    : 1;
  const label =
    habits.find((h) => h.id === (session?.habitId ?? selectedId))?.title ??
    "Selecciona un hábito";
  function startTimer() {
    const minutes = Number(duration);
    if (
      !Number.isInteger(minutes) ||
      minutes < 1 ||
      minutes > 1440 ||
      !active.some((h) => h.id === selectedId)
    ) {
      setError("Selecciona un hábito y una duración entre 1 y 1440 minutos.");
      return;
    }
    const start = Date.now();
    notified.current = false;
    setError("");
    setNow(start);
    setSession({
      habitId: selectedId,
      date: localDate(),
      started: start,
      end: start + minutes * 60000,
      notified: false,
    });
  }
  async function saveSession() {
    if (!session) return;
    const minutes = Math.floor(
      (Math.min(Date.now(), session.end) - session.started) / 60000,
    );
    if (await onSave(session.habitId, session.date, minutes)) {
      localStorage.removeItem(key);
      setSession(null);
    }
  }
  async function toggleAutostart(value: boolean) {
    setSettingBusy(true);
    setError("");
    try {
      await (value ? enable() : disable());
      setAuto(await isEnabled());
    } catch (err) {
      setError(String(err));
    } finally {
      setSettingBusy(false);
    }
  }
  async function toggleNotifications(value: boolean) {
    setSettingBusy(true);
    setError("");
    try {
      const allowed =
        !value ||
        (await isPermissionGranted()) ||
        (await requestPermission()) === "granted";
      if (!allowed) throw new Error("Windows no permitió las notificaciones.");
      localStorage.setItem("focus-notifications", String(value));
      setNotifications(value);
    } catch (err) {
      setError(String(err));
    } finally {
      setSettingBusy(false);
    }
  }
  return (
    <section
      id="desktop-tools"
      className="desktop-studio"
      aria-labelledby="desktop-tools-title"
    >
      <h2 id="desktop-tools-title" className="studio-title">
        <span>
          <Timer size={15} strokeWidth={1.5} />
          Temporizador y opciones de escritorio
        </span>
      </h2>
      <div className="studio-body">
        <section className="neo-timer" aria-label="Sesión de enfoque">
          <header className="neo-heading">
            <div>
              <span className="neo-eyebrow">TU MOMENTO DE CALMA</span>
              <h2>Sesión de enfoque</h2>
            </div>
            <span
              className={`neo-state ${session && !finished ? "is-running" : ""}`}
            >
              <i />
              {finished ? "Completada" : session ? "En curso" : "Listo"}
            </span>
          </header>
          <div className="neo-dial">
            <div className="neo-dial-rim" />
            <svg viewBox="0 0 280 280" aria-hidden="true">
              <defs>
                <linearGradient id="timer-aqua" x1="0" y1="0" x2="1" y2="1">
                  <stop stopColor="#72d8d3" />
                  <stop offset="1" stopColor="#239ba8" />
                </linearGradient>
              </defs>
              <circle className="neo-dial-track" cx="140" cy="140" r="105" />
              <circle
                className="neo-dial-progress"
                cx="140"
                cy="140"
                r="105"
                pathLength="100"
                strokeDasharray={`${fraction * 100} 100`}
              />
              <circle
                className="neo-dial-ticks"
                cx="140"
                cy="140"
                r="126"
                pathLength="60"
                strokeDasharray="0.4 4.6"
              />
            </svg>
            <div className="neo-dial-center">
              <span>
                {finished
                  ? "Sesión terminada"
                  : session
                    ? "TIEMPO RESTANTE"
                    : "DURACIÓN"}
              </span>
              <strong role="timer" aria-live="off">
                {Math.floor(seconds / 60)}:
                {String(Math.floor(seconds % 60)).padStart(2, "0")}
              </strong>
              <p>{label}</p>
            </div>
          </div>
          {session ? (
            <p className="neo-session-date">
              {session.date} · Los minutos se guardan al confirmar
            </p>
          ) : (
            <div className="neo-setup">
              <label className="neo-habit-label">
                Hábito
                <select
                  aria-label="Hábito del temporizador"
                  value={selectedId}
                  disabled={busy || !active.length}
                  onChange={(e) => setHabitId(e.target.value)}
                >
                  {!active.length && (
                    <option value="">Sin hábitos activos</option>
                  )}
                  {active.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </label>
              <div className="neo-duration-row">
                <span>Duración de la sesión</span>
                <label>
                  Minutos
                  <input
                    type="number"
                    min={1}
                    max={1440}
                    step={1}
                    value={duration}
                    disabled={busy}
                    onChange={(e) => setDuration(e.target.value)}
                  />
                </label>
              </div>
              <input
                className="neo-slider"
                aria-label="Ajustar duración"
                type="range"
                min={1}
                max={120}
                step={1}
                value={Math.min(120, Math.max(1, durationValue || 1))}
                disabled={busy}
                onChange={(e) => setDuration(e.target.value)}
              />
              <div className="neo-presets">
                {[15, 25, 45, 60].map((value) => (
                  <button
                    key={value}
                    aria-pressed={Number(duration) === value}
                    disabled={busy}
                    className={Number(duration) === value ? "is-selected" : ""}
                    onClick={() => setDuration(String(value))}
                  >
                    {value} min
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="neo-controls">
            {!session ? (
              <button
                className="neo-primary"
                disabled={busy || !active.length}
                onClick={startTimer}
              >
                <Play size={16} fill="currentColor" />
                Iniciar
              </button>
            ) : (
              <>
                <button
                  className="neo-primary"
                  disabled={busy || now - session.started < 60000}
                  onClick={() => void saveSession()}
                >
                  <Check size={17} />
                  {finished ? "Guardar sesión" : "Terminar y guardar"}
                </button>
                <button
                  className="neo-stop"
                  disabled={busy}
                  onClick={() => {
                    setSession(null);
                    setError("");
                  }}
                >
                  <Square size={13} fill="currentColor" />
                  Descartar sesión
                </button>
              </>
            )}
          </div>
          <p className="neo-footnote">
            El temporizador conserva su hora de finalización si cierras o
            suspendes el equipo.
          </p>
        </section>
        <section
          className="neo-options"
          aria-labelledby="desktop-options-title"
        >
          <span className="neo-eyebrow">A TU MANERA</span>
          <h2 id="desktop-options-title">
            Tu escritorio,
            <br />
            tu ritmo.
          </h2>
          <p className="neo-options-intro">
            Pequeños ajustes para acompañar tu día.
          </p>
          <label className="neo-option">
            <span className="neo-option-icon">
              <Monitor size={18} strokeWidth={1.5} />
            </span>
            <span className="neo-option-copy">
              <strong>Iniciar con Windows</strong>
              <small>Focus, listo al empezar tu día.</small>
            </span>
            <input
              aria-label="Iniciar con Windows"
              type="checkbox"
              checked={auto}
              disabled={settingBusy}
              onChange={(e) => void toggleAutostart(e.target.checked)}
            />
          </label>
          <label className="neo-option">
            <span className="neo-option-icon">
              <Bell size={18} strokeWidth={1.5} />
            </span>
            <span className="neo-option-copy">
              <strong>Notificar al terminar</strong>
              <small>Un aviso cuando tu sesión finalice.</small>
            </span>
            <input
              aria-label="Notificar al terminar"
              type="checkbox"
              checked={notifications}
              disabled={settingBusy}
              onChange={(e) => void toggleNotifications(e.target.checked)}
            />
          </label>
          <div className="neo-tray">
            <span className="neo-option-icon">
              <PanelsTopLeft size={19} strokeWidth={1.5} />
            </span>
            <h3>
              Menos ventanas.
              <br />
              El mismo enfoque.
            </h3>
            <p>Oculta Focus en la bandeja para mantener tu sesión en marcha.</p>
            <button
              onClick={() =>
                void getCurrentWindow()
                  .hide()
                  .catch((e) => setError(String(e)))
              }
            >
              Ocultar en la bandeja
              <PanelsTopLeft size={14} />
            </button>
          </div>
          <p className="neo-footnote">
            Puedes abrir Focus desde su icono en la bandeja. Cerrar la ventana
            termina la aplicación.
          </p>
        </section>
        {error && (
          <p role="alert" className="neo-error">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
