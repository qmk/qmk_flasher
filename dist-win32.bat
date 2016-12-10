@echo off

:: This script will create a packaged version of the app in firmware_flasher in your home folder.
:: After executing this script, use NSIS to create an installer from the firmware_flasher.win32.nsi file located there.
:: You may need to run npm install electron-packager --global once before this will work correctly.

set PLATFORM=win32
set ARCH=ia32
set OUTPUT_DIR=%userprofile%\firmware_flasher
set PACKAGE_DIR="%OUTPUT_DIR%\QMK Firmware Flasher-%PLATFORM%-%ARCH%"

call npm install

call node package.js

:: call electron-packager . --platform=%PLATFORM% --arch=%ARCH% --out %OUTPUT_DIR% --overwrite --asar.unpackDir dfu'

copy installer.wxs %PACKAGE_DIR%

copy build\windows.ico %PACKAGE_DIR%

cd %PACKAGE_DIR%

call candle installer.wxs

if errorlevel 0 call light installer.wixobj

cd %~dp0