@echo off

:: This script will create a packaged version of the app in firmware_flasher in your home folder.
:: After executing this script, use NSIS to create an installer from the firmware_flasher.win32.nsi file located there.
:: You may need to run npm install electron-packager --global once before this will work correctly.

set PLATFORM=win32
set ARCH=ia32
set OUTPUT_DIR=%userprofile%\qmk_flasher
set PACKAGE_DIR="%OUTPUT_DIR%\QMK Flasher-%PLATFORM%-%ARCH%"

call npm install

call electron-packager . --platform=%PLATFORM% --arch=%ARCH% --out %OUTPUT_DIR% --overwrite=true --asar.unpackDir=**/{dfu,node_modules/fsevents} --icon=build\windows.ico --prune

copy qmk_flasher.win32.nsi %PACKAGE_DIR%
