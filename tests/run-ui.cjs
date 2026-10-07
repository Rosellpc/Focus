const { spawn } = require("node:child_process");
const server = spawn(
  process.execPath,
  ["node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "1422"],
  { stdio: "ignore", windowsHide: true },
);
let serverFailed = false;
server.on("exit", () => {
  serverFailed = true;
});
(async () => {
  try {
    let ready = false;
    for (let i = 0; i < 100; i++) {
      if (serverFailed)
        throw new Error(
          "No se pudo iniciar el servidor de pruebas en el puerto 1422",
        );
      try {
        if ((await fetch("http://127.0.0.1:1422")).ok) {
          ready = true;
          break;
        }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!ready) throw new Error("El servidor de pruebas no respondió");
    const runner = spawn(
      process.execPath,
      ["node_modules/@playwright/test/cli.js", "test"],
      { stdio: "inherit", windowsHide: true },
    );
    process.exitCode = await new Promise((resolve, reject) => {
      runner.on("error", reject);
      runner.on("exit", (code) => resolve(code ?? 1));
    });
  } catch (e) {
    console.error(e);
    process.exitCode = 1;
  } finally {
    server.kill();
  }
})();
