$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $projectRoot
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$ndkVersion = Get-ChildItem -LiteralPath "$env:ANDROID_HOME\ndk" -Directory | Sort-Object Name -Descending | Select-Object -First 1
if (!$ndkVersion) { throw 'Instala NDK (Side by side) en Android Studio.' }
$env:NDK_HOME = $ndkVersion.FullName
$env:Path = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:Path"
$privateDir = Join-Path $projectRoot '.android-signing'
$keyFile = Join-Path $privateDir 'focus-release.jks'
$passwordFile = Join-Path $privateDir 'password.txt'
New-Item -ItemType Directory -Path $privateDir -Force | Out-Null
if (!(Test-Path -LiteralPath $keyFile)) {
    if (!(Test-Path -LiteralPath $passwordFile)) {
        $randomBytes = New-Object byte[] 32
        $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
        try { $rng.GetBytes($randomBytes) } finally { $rng.Dispose() }
        [System.IO.File]::WriteAllText($passwordFile, [Convert]::ToBase64String($randomBytes))
    }
    $env:FOCUS_ANDROID_SIGNING_PASSWORD = [System.IO.File]::ReadAllText($passwordFile).Trim()
    try {
        & "$env:JAVA_HOME\bin\keytool.exe" -genkeypair -keystore $keyFile -storetype JKS -keyalg RSA -keysize 3072 -validity 10000 -alias focus-release -dname 'CN=Focus, OU=Android, O=Focus, C=CO' -storepass:env FOCUS_ANDROID_SIGNING_PASSWORD -keypass:env FOCUS_ANDROID_SIGNING_PASSWORD
        if ($LASTEXITCODE -ne 0) { throw 'No se pudo generar la firma. No reemplaces una clave existente.' }
    } finally { Remove-Item Env:FOCUS_ANDROID_SIGNING_PASSWORD -ErrorAction SilentlyContinue }
}
if (!(Test-Path -LiteralPath $passwordFile)) { throw 'Falta password.txt. Restaura el respaldo de la firma; no generes otra clave.' }
$password = [System.IO.File]::ReadAllText($passwordFile).Trim()
$properties = "keyAlias=focus-release`npassword=$password`nstoreFile=$($keyFile.Replace('\', '/'))`n"
[System.IO.File]::WriteAllText((Join-Path $projectRoot 'src-tauri\gen\android\keystore.properties'), $properties)
$password = $null
$properties = $null
& pnpm.cmd tauri android build --apk --target aarch64
if ($LASTEXITCODE -ne 0) { throw 'La compilacion Android fallo.' }
Write-Host 'APK generado. Conserva un respaldo privado de .android-signing para futuras actualizaciones.'
