import { useEffect, useRef, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { openUrl } from "@tauri-apps/plugin-opener";
import {
  androidReleaseEndpoint,
  selectAndroidUpdate,
} from "../services/androidUpdates";

export function AndroidAppUpdater({ busy }: { busy: boolean }) {
  const [update, setUpdate] = useState<{ version: string; url: string } | null>(
    null,
  );
  const [message, setMessage] = useState("");
  const [working, setWorking] = useState(false);
  const [failed, setFailed] = useState(false);
  const gate = useRef(false);
  const controller = useRef<AbortController | null>(null);
  async function search() {
    if (gate.current) return;
    gate.current = true;
    setWorking(true);
    setFailed(false);
    setMessage("Buscando actualizaciones…");
    setUpdate(null);
    const request = new AbortController();
    controller.current = request;
    const timeout = window.setTimeout(() => request.abort(), 20000);
    try {
      const response = await fetch(androidReleaseEndpoint, {
        headers: { Accept: "application/vnd.github+json" },
        cache: "no-store",
        signal: request.signal,
      });
      if (!response.ok) throw new Error("No se pudo consultar GitHub");
      const found = selectAndroidUpdate(
        await response.json(),
        await getVersion(),
      );
      setUpdate(found);
      setMessage(
        found
          ? `Focus ${found.version} está disponible.`
          : "Focus está actualizado.",
      );
    } catch {
      if (!request.signal.aborted || controller.current === request) {
        setFailed(true);
        setMessage(
          "No se pudieron consultar las actualizaciones. Comprueba tu conexión y vuelve a intentarlo.",
        );
      }
    } finally {
      clearTimeout(timeout);
      gate.current = false;
      setWorking(false);
    }
  }
  useEffect(() => {
    const timer = window.setTimeout(() => void search(), 1500);
    return () => {
      clearTimeout(timer);
      const pending = controller.current;
      controller.current = null;
      pending?.abort();
    };
  }, []);
  async function download() {
    if (!update || busy || gate.current) return;
    if (localStorage.getItem("focus-timer-v1")) {
      setFailed(true);
      setMessage(
        "Guarda o descarta tu sesión del temporizador antes de actualizar.",
      );
      return;
    }
    gate.current = true;
    setWorking(true);
    try {
      await openUrl(update.url);
      setFailed(false);
      setMessage(
        "Descarga el APK, ábrelo y confirma la actualización en Android. Tus datos se conservan.",
      );
    } catch {
      setFailed(true);
      setMessage("No se pudo abrir la descarga. Vuelve a intentarlo.");
    } finally {
      gate.current = false;
      setWorking(false);
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
        {update && (
          <small>
            Android te pedirá confirmar la instalación. Actualiza sin
            desinstalar Focus.
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
        {update && (
          <button
            className="quiet-button"
            disabled={working || busy}
            onClick={() => void download()}
          >
            Descargar actualización
          </button>
        )}
      </div>
    </section>
  );
}
