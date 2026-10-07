import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/ui",
  workers: 1,
  timeout: 30000,
  use: {
    channel: "msedge",
    baseURL: "http://127.0.0.1:1422",
    timezoneId: "America/Bogota",
    headless: true,
  },
});
