if (Test-Path Env:\APPVEYOR) {
    $version = (Get-Content -Raw -Path package.json | ConvertFrom-Json).version
    cmd /c "$PSScriptRoot\dist-win32.bat $version"
} else {
    "Not running in AppVeyor. Exiting."
}