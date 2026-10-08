type SavedRingtone = { name: string; blob: Blob };
type State = {
  name: string;
  duration: number;
  playing: boolean;
  loading: boolean;
  error: string;
};
let state: State = {
  name: "",
  duration: 0,
  playing: false,
  loading: true,
  error: "",
};
const listeners = new Set<() => void>();
let context: AudioContext | null = null;
let buffer: AudioBuffer | null = null;
let source: AudioBufferSourceNode | null = null;
let initialized: Promise<void> | null = null;
function publish(change: Partial<State>) {
  state = { ...state, ...change };
  listeners.forEach((listener) => listener());
}
function audioContext() {
  return (context ??= new AudioContext());
}
async function database() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("focus-audio", 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("settings");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("No se pudo abrir el almacenamiento del sonido."));
    request.onblocked = () =>
      reject(new Error("Cierra otras ventanas de Focus e inténtalo de nuevo."));
  });
}
async function readSaved(): Promise<SavedRingtone | undefined> {
  const db = await database();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("settings")
        .objectStore("settings")
        .get("ringtone");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}
async function writeSaved(value: SavedRingtone | null) {
  const db = await database();
  try {
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction("settings", "readwrite");
      const store = transaction.objectStore("settings");
      if (value) store.put(value, "ringtone");
      else store.delete("ringtone");
      transaction.oncomplete = () => resolve();
      transaction.onabort = () =>
        reject(
          new Error(
            "No se pudo guardar el sonido. Revisa el espacio disponible.",
          ),
        );
      transaction.onerror = () =>
        reject(
          new Error(
            "No se pudo guardar el sonido. Revisa el espacio disponible.",
          ),
        );
    });
  } finally {
    db.close();
  }
}
export const ringtone = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
  initialize() {
    return (initialized ??= (async () => {
      try {
        const saved = await readSaved();
        if (saved) {
          buffer = await audioContext().decodeAudioData(
            await saved.blob.arrayBuffer(),
          );
          publish({ name: saved.name, duration: buffer.duration });
        }
      } catch {
        publish({
          error: "No se pudo cargar tu sonido. Puedes seleccionarlo de nuevo.",
        });
      } finally {
        publish({ loading: false });
      }
    })());
  },
  async choose(file: File) {
    await this.initialize();
    if (!file.size || file.size > 50 * 1024 * 1024)
      throw new Error("Elige un audio de hasta 50 MB.");
    publish({ loading: true, error: "" });
    try {
      const decoded = await audioContext().decodeAudioData(
        await file.arrayBuffer(),
      );
      if (!decoded.duration) throw new Error("El audio está vacío.");
      await writeSaved({ name: file.name, blob: file });
      this.stop();
      buffer = decoded;
      publish({ name: file.name, duration: decoded.duration });
    } catch {
      throw new Error(
        "No se pudo cargar o guardar el audio. Prueba un MP3, WAV o M4A compatible y revisa el espacio disponible.",
      );
    } finally {
      publish({ loading: false });
    }
  },
  async reset() {
    await this.initialize();
    await writeSaved(null);
    this.stop();
    buffer = null;
    publish({ name: "", duration: 0, error: "" });
  },
  unlock() {
    if (context) return context.resume();
    return Promise.resolve();
  },
  async play(): Promise<boolean> {
    await this.initialize();
    if (!buffer) return false;
    const ctx = audioContext();
    // Timer completion must not wait indefinitely for a blocked audio context.
    if (ctx.state !== "running")
      throw new Error(
        "Pulsa Probar sonido o vuelve a iniciar el temporizador para activar el audio.",
      );
    this.stop();
    const next = ctx.createBufferSource();
    next.buffer = buffer;
    next.loop = false;
    next.connect(ctx.destination);
    next.onended = () => {
      next.disconnect();
      if (source === next) {
        source = null;
        publish({ playing: false });
      }
    };
    source = next;
    next.start();
    publish({ playing: true });
    return true;
  },
  stop() {
    const current = source;
    source = null;
    if (current) {
      current.stop();
      current.disconnect();
    }
    publish({ playing: false });
  },
};
