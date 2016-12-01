@echo off

:: This script will create a packaged version of the app in firmware_flasher in your home folder.
:: After executing this script, use NSIS to create an installer from the firmware_flasher.win32.nsi file located there.
:: You may need to run npm install electron-packager --global once before this will work correctly.

set PLATFORM=win32
set ARCH=ia32
set OUTPUT_DIR=%userprofile%\firmware_flasher
set PACKAGE_DIR="%OUTPUT_DIR%\QMK Firmware Flasher-%PLATFORM%-%ARCH%"

call electron-packager . --platform=%PLATFORM% --arch=%ARCH% --out %OUTPUT_DIR% --overwrite

copy firmware_flasher.win32.nsi %PACKAGE_DIR%