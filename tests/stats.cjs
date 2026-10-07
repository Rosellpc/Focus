process.env.TZ = "America/Bogota";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const output = ts.transpileModule(
  fs.readFileSync("src/services/stats.ts", "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS } },
).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(output, {
  exports: moduleObject.exports,
  module: moduleObject,
  Date,
  String,
  Number,
});
const { localDate, dailyHabits, monthlyStats, previousMonth, percent } =
  moduleObject.exports;
assert.equal(localDate(new Date("2026-10-08T01:00:00Z")), "2026-10-07");
assert.equal(previousMonth("2026-01"), "2025-12");
const data = {
  version: 2,
  habits: [
    {
      id: "a",
      title: "Leer",
      targetHours: 2,
      color: "blue",
      createdOn: "2024-02-01",
      archivedOn: null,
    },
  ],
  goals: [
    { habitId: "a", effectiveOn: "2024-02-01", targetHours: 1 },
    { habitId: "a", effectiveOn: "2024-02-15", targetHours: 2 },
  ],
  logs: [{ habitId: "a", logDate: "2024-02-14", loggedMinutes: 90 }],
  activity: [
    { habitId: "a", effectiveOn: "2024-02-01", active: true },
    { habitId: "a", effectiveOn: "2024-02-20", active: false },
    { habitId: "a", effectiveOn: "2024-02-25", active: true },
  ],
};
assert.equal(dailyHabits(data, "2024-02-14")[0].targetHours, 1);
assert.equal(dailyHabits(data, "2024-02-15")[0].targetHours, 2);
assert.equal(dailyHabits(data, "2024-02-21").length, 0);
assert.equal(dailyHabits(data, "2024-02-25").length, 1);
assert.equal(monthlyStats(data, "2024-02")[0].targetHours, 34);
assert.equal(monthlyStats(data, "2024-02")[0].loggedHours, 1.5);
assert.equal(percent(1, 0), 0);
console.log(
  "OK: fecha de Bogotá, cambio de año, metas históricas, archivo/reactivación, febrero bisiesto y reportes exactos.",
);
