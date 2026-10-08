import { test, expect } from "@playwright/test";

test.use({ userAgent: "Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Mobile Safari/537.36" });
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    (window as any).downloadUrls = [];
    (window as any).__TAURI_INTERNALS__ = {
      transformCallback: () => 1,
      unregisterCallback: () => {},
      metadata: { currentWindow: { label: "main" }, currentWebview: { label: "main" } },
      invoke: async (command: string, args: any) => {
        if (command === "snapshot") return { version: 3, habits: [], logs: [], goals: [], activity: [] };
        if (command === "plugin:app|version") return "0.1.3";
        if (command === "plugin:opener|open_url") (window as any).downloadUrls.push(args.url);
      },
    };
  });
});

test("Android detecta una version y abre solo el APK oficial; protege sesiones", async ({ page }) => {
  const url = "https://github.com/Rosellpc/Focus/releases/download/v0.1.4/Focus_0.1.4_arm64.apk";
  await page.route("https://api.github.com/repos/Rosellpc/Focus/releases/latest", (route) => route.fulfill({
    json: { tag_name: "v0.1.4", draft: false, prerelease: false, assets: [{ name: "Focus_0.1.4_arm64.apk", size: 100, browser_download_url: url }] },
  }));
  await page.goto("/");
  await expect(page.getByText("Focus 0.1.4 está disponible.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Iniciar con Windows", { exact: true })).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("focus-timer-v1", "pending"));
  await page.getByRole("button", { name: "Descargar actualización", exact: true }).click();
  await expect(page.getByText("Guarda o descarta tu sesión del temporizador antes de actualizar.")).toBeVisible();
  expect(await page.evaluate(() => (window as any).downloadUrls)).toEqual([]);
  await page.evaluate(() => localStorage.removeItem("focus-timer-v1"));
  await page.getByRole("button", { name: "Descargar actualización", exact: true }).click();
  await expect(page.getByText("Descarga el APK, ábrelo y confirma la actualización en Android. Tus datos se conservan.")).toBeVisible();
  expect(await page.evaluate(() => (window as any).downloadUrls)).toEqual([url]);
});

test("Android permite reintentar la consulta tras un fallo de red", async ({ page }) => {
  let failing = true;
  await page.route("https://api.github.com/repos/Rosellpc/Focus/releases/latest", (route) => failing
    ? route.fulfill({ status: 503, body: "Unavailable" })
    : route.fulfill({ json: { tag_name: "v0.1.3", assets: [] } }));
  await page.goto("/");
  await expect(page.getByText("No se pudieron consultar las actualizaciones. Comprueba tu conexión y vuelve a intentarlo.")).toBeVisible();
  failing = false;
  await page.getByRole("button", { name: "Buscar actualizaciones", exact: true }).click();
  await expect(page.getByText("Focus está actualizado.", { exact: true })).toBeVisible();
});
