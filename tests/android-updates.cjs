const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const vm = require("node:vm");
const output = ts.transpileModule(
  fs.readFileSync("src/services/androidUpdates.ts", "utf8"),
  {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  },
).outputText;
const moduleObject = { exports: {} };
vm.runInNewContext(output, {
  exports: moduleObject.exports,
  module: moduleObject,
});
const { selectAndroidUpdate } = moduleObject.exports;
function release(version) {
  return {
    tag_name: `v${version}`,
    draft: false,
    prerelease: false,
    assets: [
      {
        name: `Focus_${version}_arm64.apk`,
        size: 123,
        browser_download_url: `https://github.com/Rosellpc/Focus/releases/download/v${version}/Focus_${version}_arm64.apk`,
      },
    ],
  };
}
assert.equal(selectAndroidUpdate(release("0.1.3"), "0.1.3"), null);
assert.equal(selectAndroidUpdate(release("0.1.2"), "0.1.3"), null);
assert.equal(selectAndroidUpdate(release("0.1.10"), "0.1.9").version, "0.1.10");
assert.equal(selectAndroidUpdate(release("1.0.0"), "0.99.99").version, "1.0.0");
assert.equal(
  selectAndroidUpdate({ ...release("0.1.4"), prerelease: true }, "0.1.3"),
  null,
);
assert.equal(
  selectAndroidUpdate({ ...release("0.1.4"), draft: true }, "0.1.3"),
  null,
);
assert.throws(() =>
  selectAndroidUpdate({ ...release("0.1.4"), assets: [] }, "0.1.3"),
);
const malicious = release("0.1.4");
malicious.assets[0].browser_download_url = "https://example.com/untrusted.apk";
assert.throws(() => selectAndroidUpdate(malicious, "0.1.3"));
assert.throws(() => selectAndroidUpdate(release("0.1.4-beta"), "0.1.3"));
assert.throws(() => selectAndroidUpdate(null, "0.1.3"));
console.log("Android update version and download validation passed.");
