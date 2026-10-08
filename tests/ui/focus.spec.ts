import { test, expect } from "@playwright/test";

test("audio propio se conserva, suena al terminar y puede detenerse", async ({
  page,
}) => {
  const samples = 8000 * 30;
  const wav = Buffer.alloc(44 + samples * 2);
  wav.write("RIFF", 0);
  wav.writeUInt32LE(wav.length - 8, 4);
  wav.write("WAVEfmt ", 8);
  wav.writeUInt32LE(16, 16);
  wav.writeUInt16LE(1, 20);
  wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(8000, 24);
  wav.writeUInt32LE(16000, 28);
  wav.writeUInt16LE(2, 32);
  wav.writeUInt16LE(16, 34);
  wav.write("data", 36);
  wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++)
    wav.writeInt16LE(
      Math.round(100 * Math.sin((i * 2 * Math.PI * 440) / 8000)),
      44 + i * 2,
    );
  const picker = page.getByLabel("Archivo de sonido", { exact: true });
  await picker.setInputFiles({
    name: "Mi cancion.wav",
    mimeType: "audio/wav",
    buffer: wav,
  });
  await expect(page.locator(".ringtone-name")).toHaveText("Mi cancion.wav");
  await expect(
    page.getByText("0:30 · Se reproduce completo una vez."),
  ).toBeVisible();
  await picker.setInputFiles({
    name: "roto.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from("invalid audio"),
  });
  await expect(page.getByRole("alert")).toContainText(
    "No se pudo cargar o guardar el audio",
  );
  await expect(page.locator(".ringtone-name")).toHaveText("Mi cancion.wav");
  await page.reload();
  await expect(page.locator(".ringtone-name")).toHaveText("Mi cancion.wav");
  await page
    .getByRole("button", { name: "Probar sonido", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Detener sonido", exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Detener sonido", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Detener sonido", exact: true }),
  ).toHaveCount(0);
  await page.getByLabel("Minutos", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.runFor(61000);
  await expect(
    page.getByRole("button", { name: "Detener sonido", exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).completionAlerts.length))
    .toBe(1);
  expect(
    await page.evaluate(() => (window as any).completionAlerts[0]),
  ).toEqual({ showNotification: true, playSound: false });
  await page
    .getByRole("button", { name: "Guardar sesión", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Detener sonido", exact: true }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Usar predeterminado", exact: true })
    .click();
  await expect(page.locator(".ringtone-name")).toHaveText(
    "Sonido predeterminado",
  );
  await page.reload();
  await expect(page.locator(".ringtone-name")).toHaveText(
    "Sonido predeterminado",
  );
});

test("modo claro conserva la preferencia y adapta formularios y movil", async ({
  page,
}) => {
  const toggle = page.getByRole("button", { name: "Modo White", exact: true });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await expect(page.locator("body")).toHaveCSS("color", "rgb(52, 69, 78)");
  await page.screenshot({
    path: "docs/white-mode-preview.png",
    fullPage: true,
  });
  await page.getByRole("button", { name: "Nuevo hábito", exact: true }).click();
  await expect(page.getByRole("dialog")).toHaveCSS(
    "background-color",
    "rgb(242, 245, 246)",
  );
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(toggle).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: "docs/white-mode-mobile.png", fullPage: true });
  await page
    .getByRole("button", { name: "Reporte Mensual", exact: true })
    .click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await toggle.click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
});

test.beforeEach(async ({ page }) => {
  await page.clock.install({ time: new Date("2026-10-07T23:59:50-05:00") });
  await page.addInitScript(() => {
    const data = {
      version: 2,
      habits: [
        {
          id: "read",
          title: "Lectura",
          targetHours: 1,
          color: "amber",
          createdOn: "2026-10-01",
          archivedOn: null as string | null,
        },
      ],
      logs: [] as {
        habitId: string;
        logDate: string;
        loggedMinutes: number;
        completed?: boolean;
      }[],
      goals: [{ habitId: "read", effectiveOn: "2026-10-01", targetHours: 1 }],
      activity: [{ habitId: "read", effectiveOn: "2026-10-01", active: true }],
    };
    let failNext = false;
    let failSnapshot = false;
    let auto = false;
    (window as any).completionAlerts = [];
    (window as any).notificationPermission = true;
    (window as any).failNextSnapshot = () => {
      failSnapshot = true;
    };
    (window as any).failNextSave = () => {
      failNext = true;
    };
    (window as any).__TAURI_INTERNALS__ = {
      transformCallback: () => 1,
      unregisterCallback: () => {},
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { label: "main" },
      },
      invoke: async (command: string, args: any) => {
        if (command === "plugin:updater|check") {
          if ((window as any).failUpdate) throw new Error("Network failure");
          return (window as any).availableUpdate
            ? {
                rid: 99,
                currentVersion: "0.1.2",
                version: "0.1.3",
                body: "Nueva versión",
              }
            : null;
        }
        if (command === "plugin:updater|download_and_install") {
          (window as any).updateInstalls =
            ((window as any).updateInstalls || 0) + 1;
          args.onEvent.onmessage({
            event: "Started",
            data: { contentLength: 100 },
          });
          args.onEvent.onmessage({
            event: "Progress",
            data: { chunkLength: 100 },
          });
          args.onEvent.onmessage({ event: "Finished" });
          return;
        }
        if (command === "snapshot") {
          if (failSnapshot) {
            failSnapshot = false;
            throw new Error("Lectura fallida");
          }
          return structuredClone(data);
        }
        if (command === "save_minutes") {
          if (failNext) {
            failNext = false;
            throw new Error("Fallo de disco simulado");
          }
          let log = data.logs.find(
            (l) => l.habitId === args.habitId && l.logDate === args.date,
          );
          if (!log) {
            log = {
              habitId: args.habitId,
              logDate: args.date,
              loggedMinutes: 0,
            };
            data.logs.push(log);
          }
          log.loggedMinutes = args.delta
            ? Math.max(0, log.loggedMinutes + args.minutes)
            : args.minutes;
          return;
        }
        if (command === "complete_habit") {
          if (failNext) {
            failNext = false;
            throw new Error("Fallo de disco simulado");
          }
          let log = data.logs.find(
            (l) => l.habitId === args.habitId && l.logDate === args.date,
          );
          if (!log) {
            log = {
              habitId: args.habitId,
              logDate: args.date,
              loggedMinutes: 0,
            };
            data.logs.push(log);
          }
          if (args.completed)
            log.loggedMinutes = Math.max(
              log.loggedMinutes,
              data.habits.find((h) => h.id === args.habitId)!.targetHours * 60,
            );
          (log as any).completed = args.completed;
          return;
        }
        if (command === "save_habit") {
          data.habits.push({
            id: args.id,
            title: args.title,
            targetHours: args.targetHours,
            color: args.color,
            createdOn: args.date,
            archivedOn: null,
          });
          data.goals.push({
            habitId: args.id,
            effectiveOn: args.date,
            targetHours: args.targetHours,
          });
          data.activity.push({
            habitId: args.id,
            effectiveOn: args.date,
            active: true,
          });
          return;
        }
        if (command === "archive_habit") {
          data.habits.find((h) => h.id === args.id)!.archivedOn = args.archived
            ? args.date
            : null;
          const event = data.activity.find(
            (a) => a.habitId === args.id && a.effectiveOn === args.date,
          );
          if (event) event.active = !args.archived;
          else
            data.activity.push({
              habitId: args.id,
              effectiveOn: args.date,
              active: !args.archived,
            });
          return;
        }
        if (command === "export_backup" || command === "import_backup")
          return "C:\\Focus-test.json";
        if (command === "plugin:autostart|is_enabled") return auto;
        if (command === "plugin:autostart|enable") {
          auto = true;
          return;
        }
        if (command === "plugin:autostart|disable") {
          auto = false;
          return;
        }
        if (command === "plugin:notification|is_permission_granted")
          return (window as any).notificationPermission;
        if (command === "plugin:notification|request_permission")
          return "denied";
        if (command === "notify_timer_finished") {
          (window as any).completionAlerts.push(args);
          return;
        }
        return;
      },
    };
  });
  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Lectura", exact: true }),
  ).toBeVisible();
});

test("guardar, corregir y mostrar fallo sin progreso ficticio", async ({
  page,
}) => {
  await page.getByRole("button", { name: "30m", exact: true }).click();
  await expect(page.getByRole("status")).toHaveText("Minutos guardados.");
  await expect(page.getByText("0.5 / 1h (50%)", { exact: true })).toBeVisible();
  await page.evaluate(() => (window as any).failNextSave());
  await page.getByRole("button", { name: "30m", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText(
    "Fallo de disco simulado",
  );
  await expect(page.getByText("0.5 / 1h (50%)", { exact: true })).toBeVisible();
  await page
    .getByRole("button", { name: "Editar minutos", exact: true })
    .click();
  await page.getByLabel("Total de minutos").fill("15");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(page.getByText("0.3 / 1h (25%)", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reporte Mensual" }).click();
  await expect(page.getByText("25% de cumplimiento")).not.toBeVisible();
  await expect(page.getByText("1% de cumplimiento")).toBeVisible();
});

test("crear y archivar hábito con meta dinámica", async ({ page }) => {
  await page.getByRole("button", { name: "Nuevo hábito" }).click();
  await page.getByLabel("Nombre", { exact: true }).fill("Caminar");
  await page.getByLabel("Meta diaria en minutos").fill("30");
  await page.getByRole("button", { name: "Guardar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Caminar", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Meta diaria: 1.5 horas")).toBeVisible();
  await page.getByText("Administrar hábitos", { exact: true }).click();
  await page
    .getByRole("button", { name: "Archivar", exact: true })
    .last()
    .click();
  await expect(
    page.getByRole("heading", { name: "Caminar", exact: true }),
  ).not.toBeVisible();
});

test("cambio local de día y sesión guardada en fecha de inicio", async ({
  page,
}) => {
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByLabel("Minutos", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.runFor(61000);
  await expect(
    page.getByLabel("Fecha del registro", { exact: true }),
  ).toHaveValue("2026-10-08");
  await page.getByRole("button", { name: "Guardar sesión" }).click();
  await expect(page.getByRole("status")).toHaveText("Sesión guardada.");
  await page
    .getByLabel("Fecha del registro", { exact: true })
    .fill("2026-10-07");
  await expect(page.getByText("0.0 / 1h (2%)", { exact: true })).toBeVisible();
});

test("respaldo y confirmación de restauración", async ({ page }) => {
  await page.getByRole("button", { name: "Crear respaldo" }).click();
  await expect(
    page.getByRole("button", { name: "Mostrar respaldo" }),
  ).toBeVisible();
  await page.getByLabel("Archivo de respaldo", { exact: true }).setInputFiles({
    name: "Focus.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        version: 2,
        habits: [],
        logs: [],
        goals: [],
        activity: [],
      }),
    ),
  });
  await expect(page.getByRole("dialog")).toContainText("Se reemplazarán");
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();
});

test("Tailwind y controles adaptados a pantalla estrecha", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 760 });
  const style = await page
    .getByRole("button", { name: "Dashboard", exact: true })
    .evaluate((el) => ({
      background: getComputedStyle(el).backgroundColor,
      padding: getComputedStyle(el).paddingLeft,
    }));
  expect(style.padding).toBe("16px");
  expect(style.background).not.toBe("rgba(0, 0, 0, 0)");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
});

test("guardado confirmado con lectura fallida permite recargar sin duplicar", async ({
  page,
}) => {
  await page.evaluate(() => (window as any).failNextSnapshot());
  await page.getByRole("button", { name: "30m", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("La operación terminó");
  await page
    .getByRole("button", { name: "Recargar datos", exact: true })
    .click();
  await expect(page.getByText("0.5 / 1h (50%)", { exact: true })).toBeVisible();
});

test("completar oculta la tarea, conserva el total y reaparece al día siguiente", async ({
  page,
}) => {
  await page.getByRole("button", { name: "30m", exact: true }).click();
  await page
    .getByRole("button", { name: "Tarea completada", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Lectura", exact: true }),
  ).not.toBeVisible();
  await expect(page.getByText("1.0 / 1.0", { exact: false })).toBeVisible();
  await page.getByText("Tareas completadas (1)", { exact: true }).click();
  await expect(
    page.getByText("Lectura · 1 h registradas", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Volver a mostrar", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Tarea completada", exact: true })
    .click();
  await expect(page.getByText("1.0 / 1.0", { exact: false })).toBeVisible();
  await page.clock.runFor(11000);
  await expect(
    page.getByRole("heading", { name: "Lectura", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0.0 / 1h (0%)", { exact: true })).toBeVisible();
  await page
    .getByLabel("Fecha del registro", { exact: true })
    .fill("2026-10-07");
  await expect(
    page.getByRole("heading", { name: "Lectura", exact: true }),
  ).not.toBeVisible();
  await expect(page.getByText("1.0 / 1.0", { exact: false })).toBeVisible();
});

test("un fallo al completar mantiene la card y sus minutos", async ({
  page,
}) => {
  await page.evaluate(() => (window as any).failNextSave());
  await page
    .getByRole("button", { name: "Tarea completada", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText(
    "Fallo de disco simulado",
  );
  await expect(
    page.getByRole("heading", { name: "Lectura", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("0.0 / 1h (0%)", { exact: true })).toBeVisible();
});

// Capture desktop and compact layouts using an isolated database fixture.
test("vista de referencia de escritorio", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1100 });
  for (const [name, minutes] of [
    ["Programación", "360"],
    ["Ejercicio", "60"],
  ]) {
    await page
      .getByRole("button", { name: "Nuevo hábito", exact: true })
      .click();
    await page.getByLabel("Nombre", { exact: true }).fill(name);
    await page.getByLabel("Meta diaria en minutos").fill(minutes);
    await page.getByRole("button", { name: "Guardar", exact: true }).click();
    await expect(
      page.getByRole("heading", { name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "30m", exact: true }).first().click();
  await expect(page.getByRole("status")).toHaveText("Minutos guardados.");
  await page.screenshot({
    path: "test-results/focus-desktop.png",
    fullPage: true,
  });
  await page.setViewportSize({ width: 480, height: 850 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/focus-compact.png",
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Reporte Mensual", exact: true })
    .click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: "test-results/focus-report.png",
    fullPage: true,
  });
});

test("panel neumórfico: duración, opciones y sesión", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 1000 });
  await expect(page.getByRole("timer")).toBeVisible();
  await page.getByRole("button", { name: "45 min", exact: true }).click();
  await expect(page.getByLabel("Minutos", { exact: true })).toHaveValue("45");
  await expect(page.getByRole("timer")).toHaveText("45:00");
  await page.getByLabel("Ajustar duración", { exact: true }).fill("30");
  await expect(page.getByRole("timer")).toHaveText("30:00");
  await page
    .getByRole("checkbox", { name: "Iniciar con Windows", exact: true })
    .check();
  await expect(
    page.getByRole("checkbox", { name: "Iniciar con Windows", exact: true }),
  ).toBeChecked();
  await page
    .getByRole("checkbox", { name: "Iniciar con Windows", exact: true })
    .uncheck();
  await page
    .locator(".studio-body")
    .screenshot({ path: "test-results/timer-studio.png" });
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.runFor(61000);
  await expect(page.getByRole("timer")).toHaveText("28:59");
  await page
    .getByRole("button", { name: "Terminar y guardar", exact: true })
    .click();
  await expect(page.getByRole("status")).toHaveText("Sesión guardada.");
  await page.setViewportSize({ width: 480, height: 850 });
  await expect(page.getByRole("timer")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page
    .locator(".studio-body")
    .screenshot({ path: "test-results/timer-studio-compact.png" });
});

test("fin del temporizador: aviso único, sonido y prueba manual", async ({
  page,
}) => {
  await expect(
    page.getByLabel("Notificar al terminar", { exact: true }),
  ).toBeChecked();
  await page.getByRole("button", { name: "Probar aviso y sonido" }).click();
  await expect
    .poll(() => page.evaluate(() => (window as any).completionAlerts.length))
    .toBe(1);
  await page.getByLabel("Minutos", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.runFor(61000);
  await expect(
    page.getByText("Sesión terminada. Guarda tus minutos cuando estás listo."),
  ).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => (window as any).completionAlerts.length))
    .toBe(2);
  await page.clock.runFor(5000);
  expect(
    await page.evaluate(() => (window as any).completionAlerts.length),
  ).toBe(2);
  await page.reload();
  await expect(page.getByRole("timer")).toHaveText("0:00");
  expect(
    await page.evaluate(() => (window as any).completionAlerts.length),
  ).toBe(0);
});

test("permiso denegado conserva el sonido y explica cómo activar mensajes", async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).notificationPermission = false;
  });
  await page.getByRole("button", { name: "Probar aviso y sonido" }).click();
  await expect(page.getByRole("alert")).toContainText("El sonido está activo");
  expect(await page.evaluate(() => (window as any).completionAlerts)).toEqual([
    { showNotification: false },
  ]);
});

test("avisos desactivados no notifican y conservan la preferencia", async ({
  page,
}) => {
  await page.getByLabel("Notificar al terminar", { exact: true }).uncheck();
  await page.getByLabel("Minutos", { exact: true }).fill("1");
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page.clock.runFor(61000);
  await expect(page.getByRole("timer")).toHaveText("0:00");
  expect(
    await page.evaluate(() => (window as any).completionAlerts.length),
  ).toBe(0);
  await page.reload();
  await expect(
    page.getByLabel("Notificar al terminar", { exact: true }),
  ).not.toBeChecked();
});

test("updater busca al abrir y permite instalar una versión disponible", async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).availableUpdate = true;
  });
  await page.clock.runFor(1600);
  await expect(
    page.getByText("Focus 0.1.3 está disponible.", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Actualizar ahora", exact: true })
    .click();
  await expect(
    page.getByText(
      "Instalando actualización. Focus se cerrará para aplicar los cambios.",
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).updateInstalls)).toBe(1);
});

test("updater protege la sesión pendiente y permite reintentar tras fallo de red", async ({
  page,
}) => {
  await page.evaluate(() => {
    (window as any).availableUpdate = true;
  });
  await page
    .getByRole("button", { name: "Buscar actualizaciones", exact: true })
    .click();
  await page.getByRole("button", { name: "Iniciar", exact: true }).click();
  await page
    .getByRole("button", { name: "Actualizar ahora", exact: true })
    .click();
  await expect(
    page.getByText(
      "Guarda o descarta tu sesión del temporizador antes de actualizar.",
    ),
  ).toBeVisible();
  expect(await page.evaluate(() => (window as any).updateInstalls || 0)).toBe(
    0,
  );
  await page.evaluate(() => {
    (window as any).failUpdate = true;
  });
  await page
    .getByRole("button", { name: "Buscar actualizaciones", exact: true })
    .click();
  await expect(
    page.getByText(
      "No se pudieron consultar las actualizaciones. Comprueba tu conexión y vuelve a intentarlo.",
    ),
  ).toBeVisible();
  await page.evaluate(() => {
    (window as any).failUpdate = false;
    (window as any).availableUpdate = false;
  });
  await page
    .getByRole("button", { name: "Buscar actualizaciones", exact: true })
    .click();
  await expect(
    page.getByText("Focus está actualizado.", { exact: true }),
  ).toBeVisible();
});
