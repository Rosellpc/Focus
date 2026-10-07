import { test, expect } from "@playwright/test";

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
    (window as any).failNextSnapshot = () => {
      failSnapshot = true;
    };
    (window as any).failNextSave = () => {
      failNext = true;
    };
    (window as any).__TAURI_INTERNALS__ = {
      metadata: {
        currentWindow: { label: "main" },
        currentWebview: { label: "main" },
      },
      invoke: async (command: string, args: any) => {
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
          return true;
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
  await page
    .getByText("Temporizador y opciones de escritorio", { exact: true })
    .click();
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
  await page.locator('input[type="file"]').setInputFiles({
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
