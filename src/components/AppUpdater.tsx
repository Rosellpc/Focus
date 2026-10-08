import { useEffect, useRef, useState } from "react";
import { check, type Update } from "@tauri-apps/plugin-updater";

export function AppUpdater({
  busy,
  onInstallingChange,
}: {
  busy: boolean;
  onInstallingChange: (value: boolean) => void;
}) {
  const update = useRef<Update | null>(null);
  const gate = useRef(false);
  const [version, setVersion] = useState("");
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  async function search() {
    if (gate.current) return;
    gate.current = true;
    setWorking(true);
    setFailed(false);
    setMessage("Buscando actualizaciones…");
    try {
      await update.current?.close();
      update.current = null;
      setVersion("");
      const found = await check({ timeout: 20000 });
      update.current = found;
      setVersion(found?.version ?? "");
      setMessage(
        found
          ? `Focus ${found.version} está disponible.`
          : "Focus está actualizado.",
      );
    } catch {
      setFailed(true);
      setMessage(
        "No se pudieron consultar las actualizaciones. Comprueba tu conexión y vuelve a intentarlo.",
      );
    } finally {
      gate.current = false;
      setWorking(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void search(), 1500);
    return () => {
      clearTimeout(timer);
      void update.current?.close();
    };
  }, []);
  async function install() {
    if (!update.current || gate.current || busy) return;
    if (localStorage.getItem("focus-timer-v1")) {
      setFailed(true);
      setMessage(
        "Guarda o descarta tu sesión del temporizador antes de actualizar.",
      );
      return;
    }
    gate.current = true;
    setWorking(true);
    setFailed(false);
    setMessage("Descargando actualización…");
    onInstallingChange(true);
    let total = 0;
    let downloaded = 0;
    try {
      await update.current.downloadAndInstall((event) => {
        if (event.event === "Started") total = event.data.contentLength ?? 0;
        if (event.event === "Progress") {
          downloaded += event.data.chunkLength;
          setMessage(
            total
              ? `Descargando actualización: ${Math.min(100, Math.round((downloaded / total) * 100))}%`
              : "Descargando actualización…",
          );
        }
        if (event.event === "Finished")
          setMessage(
            "Instalando actualización. Focus se cerrará para aplicar los cambios.",
          );
      });
    } catch {
      setFailed(true);
      setMessage(
        "No se pudo instalar la actualización. Tus datos se conservan; puedes volver a intentarlo.",
      );
    } finally {
      gate.current = false;
      setWorking(false);
      onInstallingChange(false);
    }
  }
  return (
    <section
      className="app-updater glass-panel"
      aria-label="Actualizaciones de Focus"
    >
      <div>
        <strong>Focus · Actualizaciones</strong>
        <p role={failed ? "alert" : undefined} aria-live="polite">
          {message || "Busca nuevas versiones de Focus."}
        </p>
        {version && (
          <small>
            Guarda tus cambios antes de instalar. La app se cerrará durante la
            actualización.
          </small>
        )}
      </div>
      <div className="update-actions">
        <button
          className="quiet-button"
          disabled={working || busy}
          onClick={() => void search()}
        >
          Buscar actualizaciones
        </button>
        {version && (
          <button
            className="quiet-button"
            disabled={working || busy}
            onClick={() => void install()}
          >
            Actualizar ahora
          </button>
        )}
      </div>
    </section>
  );
}
