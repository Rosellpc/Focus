import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Music2, Play, Square, Upload } from "lucide-react";
import { ringtone } from "../services/ringtone";

export function RingtoneSettings({ disabled }: { disabled: boolean }) {
  const state = useSyncExternalStore(ringtone.subscribe, ringtone.getSnapshot);
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    void ringtone.initialize();
  }, []);
  const duration = `${Math.floor(state.duration / 60)}:${String(Math.floor(state.duration % 60)).padStart(2, "0")}`;
  const locked = disabled || working || state.loading;
  return (
    <section className="ringtone-settings" aria-labelledby="ringtone-title">
      <h3 id="ringtone-title">
        <Music2 size={16} /> Sonido del aviso
      </h3>
      <p className="ringtone-name">{state.name || "Sonido predeterminado"}</p>
      <p className="neo-footnote">
        {state.name
          ? `${duration} · Se reproduce completo una vez.`
          : "Puedes elegir un ringtone o una canción completa."}
      </p>
      <input
        ref={input}
        type="file"
        accept="audio/*,.mp3,.wav,.m4a,.ogg,.aac,.flac"
        className="hidden"
        aria-label="Archivo de sonido"
        onChange={async (event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (!file) return;
          setWorking(true);
          setError("");
          try {
            await ringtone.choose(file);
          } catch (err) {
            setError(String(err));
          } finally {
            setWorking(false);
          }
        }}
      />
      <div className="ringtone-actions">
        <button
          type="button"
          className="quiet-button"
          disabled={locked}
          onClick={() => input.current?.click()}
        >
          <Upload size={13} /> Cargar audio
        </button>
        {state.name && (
          <button
            type="button"
            className="quiet-button"
            disabled={locked}
            onClick={async () => {
              setError("");
              try {
                await ringtone.unlock();
                await ringtone.play();
              } catch (err) {
                setError(String(err));
              }
            }}
          >
            <Play size={13} /> Probar sonido
          </button>
        )}
        {state.playing && (
          <button
            type="button"
            className="quiet-button"
            onClick={() => ringtone.stop()}
          >
            <Square size={13} /> Detener sonido
          </button>
        )}
        {state.name && (
          <button
            type="button"
            className="quiet-button"
            disabled={locked}
            onClick={async () => {
              setWorking(true);
              setError("");
              try {
                await ringtone.reset();
              } catch {
                setError("No se pudo quitar el audio. Inténtalo de nuevo.");
              } finally {
                setWorking(false);
              }
            }}
          >
            Usar predeterminado
          </button>
        )}
      </div>
      <p className="neo-footnote">
        Audio local de hasta 50 MB. Se guarda en este dispositivo, sin subirlo a
        Internet. Mantén Focus abierta para escuchar el aviso; Android puede
        pausar la app con la pantalla bloqueada.
      </p>
      {(error || state.error) && (
        <p role="alert" className="neo-error">
          {error || state.error}
        </p>
      )}
    </section>
  );
}
