@echo off
setlocal EnableDelayedExpansion

echo Waiting for the firmware flasher to exit.
:waitForExitLoop
tasklist /FI "IMAGENAME eq QMK Firmware Flasher.exe" 2>NUL | find /I /N "QMK Firmware Flasher.exe">NUL
if errorlevel 1 (
  goto continue
) else (
  sleep 1
  goto waitForExitLoop
)

:continue
cd %~dp0\resources

if exist app.asar.update (
  move /y app.asar app.asar.backup
  move /y app.asar.update app.asar
) else (
    echo Nothing to update.
)

cd ..
"QMK Firmware Flasher.exe"