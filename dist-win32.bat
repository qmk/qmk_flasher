@echo off

:: This script will create a packaged version of the app in firmware_flasher in your home folder.
:: After executing this script, use NSIS to create an installer from the firmware_flasher.win32.nsi file located there.
:: You may need to run npm install electron-packager --global once before this will work correctly.

set PLATFORM=win32
set ARCH=ia32
set OUTPUT_DIR=%userprofile%\firmware_flasher
set PACKAGE_DIR="%OUTPUT_DIR%\QMK Firmware Flasher-%PLATFORM%-%ARCH%"

call npm install

rmdir %PACKAGE_DIR% /S /Q

call node package.js

copy QMK_Firmware_Flasher.wxs %PACKAGE_DIR%

copy WixDifxAppExtension.dll %PACKAGE_DIR%
copy difxapp_x86.wixlib %PACKAGE_DIR%
copy difxapp_x64.wixlib %PACKAGE_DIR%

copy build\windows.ico %PACKAGE_DIR%

cd %PACKAGE_DIR%

call candle -ext WixDifxAppExtension.dll QMK_Firmware_Flasher.wxs

if errorlevel 1 GOTO end

call light -ext WixDifxAppExtension.dll difxapp_x86.wixlib QMK_Firmware_Flasher.wixobj -o QMK_Firmware_Flasher_32-bit.msi

call light -ext WixDifxAppExtension.dll difxapp_x64.wixlib QMK_Firmware_Flasher.wixobj -o QMK_Firmware_Flasher_64-bit.msi

:end
copy *.msi ..
cd %~dp0