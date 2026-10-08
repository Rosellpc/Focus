const repository = "https://github.com/Rosellpc/Focus";
export const androidReleaseEndpoint =
  "https://api.github.com/repos/Rosellpc/Focus/releases/latest";

function versionParts(value: string): number[] {
  if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error("Versión inválida");
  const parts = value.split(".").map(Number);
  if (!parts.every(Number.isSafeInteger)) throw new Error("Versión inválida");
  return parts;
}

export function selectAndroidUpdate(
  release: unknown,
  installedVersion: string,
): { version: string; url: string } | null {
  const current = versionParts(installedVersion);
  if (!release || typeof release !== "object")
    throw new Error("Release inválido");
  const data = release as Record<string, unknown>;
  if (data.draft || data.prerelease) return null;
  if (typeof data.tag_name !== "string" || !data.tag_name.startsWith("v"))
    throw new Error("Etiqueta inválida");
  const version = data.tag_name.slice(1);
  const next = versionParts(version);
  const different = next.findIndex((part, index) => part !== current[index]);
  if (different < 0 || next[different] < current[different]) return null;
  const name = `Focus_${version}_arm64.apk`;
  const expectedUrl = `${repository}/releases/download/v${version}/${name}`;
  if (!Array.isArray(data.assets)) throw new Error("Falta el APK Android");
  const asset = data.assets.find(
    (item) => item?.name === name && item?.browser_download_url === expectedUrl,
  );
  if (!asset || !Number.isSafeInteger(asset.size) || asset.size <= 0)
    throw new Error("Falta un APK Android válido en el release");
  return { version, url: expectedUrl };
}
