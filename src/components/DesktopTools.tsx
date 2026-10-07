import { useEffect, useRef, useState } from "react";
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
const button =
  "rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40";
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
  const seconds = session
    ? Math.max(0, Math.ceil((session.end - now) / 1000))
    : 0;
  return (
    <details
      id="desktop-tools"
      className="mt-6 rounded-xl border border-white/10 bg-white/5 p-4"
      open={!!session}
    >
      <summary className="cursor-pointer font-medium">
        Temporizador y opciones de escritorio
      </summary>
      <div className="mt-4 space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          {!session ? (
            <>
              <label className="text-sm">
                Hábito
                <select
                  aria-label="Hábito del temporizador"
                  disabled={busy}
                  value={habitId || active[0]?.id || ""}
                  onChange={(e) => setHabitId(e.target.value)}
                  className="block rounded-lg bg-slate-900 p-2 border border-white/20"
                >
                  {active.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.title}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm">
                Minutos
                <input
                  type="number"
                  min={1}
                  max={1440}
                  step={1}
                  value={duration}
                  disabled={busy}
                  onChange={(e) => setDuration(e.target.value)}
                  className="block w-24 rounded-lg bg-slate-900 p-2 border border-white/20"
                />
              </label>
              <button
                className={button}
                disabled={busy || !active.length}
                onClick={() => {
                  const minutes = Number(duration);
                  const id = habitId || active[0]?.id;
                  if (
                    !Number.isInteger(minutes) ||
                    minutes < 1 ||
                    minutes > 1440 ||
                    !active.some((h) => h.id === id)
                  ) {
                    setError(
                      "Selecciona un hábito y una duración entre 1 y 1440 minutos.",
                    );
                    return;
                  }
                  const start = Date.now();
                  notified.current = false;
                  setNow(start);
                  setSession({
                    habitId: id,
                    date: localDate(),
                    started: start,
                    end: start + minutes * 60000,
                    notified: false,
                  });
                }}
              >
                Iniciar
              </button>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums">
                {finished
                  ? "Sesión terminada"
                  : `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}
                <span className="block text-xs text-slate-400">
                  {habits.find((h) => h.id === session.habitId)?.title ??
                    "Hábito"}{" "}
                  · {session.date}
                </span>
              </p>
              <button
                className={button}
                disabled={busy || now - session.started < 60000}
                onClick={async () => {
                  const minutes = Math.floor(
                    (Math.min(Date.now(), session.end) - session.started) /
                      60000,
                  );
                  if (await onSave(session.habitId, session.date, minutes)) {
                    localStorage.removeItem(key);
                    setSession(null);
                  }
                }}
              >
                {finished ? "Guardar sesión" : "Terminar y guardar"}
              </button>
              <button
                className={button}
                disabled={busy}
                onClick={() => setSession(null)}
              >
                Descartar sesión
              </button>
            </>
          )}
        </div>
        <p className="text-xs text-slate-400">
          Los minutos se guardan al confirmar la sesión. El temporizador
          conserva su hora de finalización si cierras o suspendes el equipo.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={auto}
              disabled={settingBusy}
              onChange={async (e) => {
                const value = e.target.checked;
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
              }}
            />
            Iniciar con Windows
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={notifications}
              disabled={settingBusy}
              onChange={async (e) => {
                const value = e.target.checked;
                setSettingBusy(true);
                setError("");
                try {
                  const allowed =
                    !value ||
                    (await isPermissionGranted()) ||
                    (await requestPermission()) === "granted";
                  if (!allowed)
                    throw new Error("Windows no permitió las notificaciones.");
                  localStorage.setItem("focus-notifications", String(value));
                  setNotifications(value);
                } catch (err) {
                  setError(String(err));
                } finally {
                  setSettingBusy(false);
                }
              }}
            />
            Notificar al terminar
          </label>
          <button
            className={button}
            onClick={() =>
              void getCurrentWindow()
                .hide()
                .catch((e) => setError(String(e)))
            }
          >
            Ocultar en la bandeja
          </button>
        </div>
        <p className="text-xs text-slate-400">
          Puedes abrir Focus desde su icono en la bandeja. Cerrar la ventana
          termina la aplicación.
        </p>
        {error && (
          <p role="alert" className="text-rose-300">
            {error}
          </p>
        )}
      </div>
    </details>
  );
}
