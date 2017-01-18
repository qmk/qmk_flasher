@echo off

:: This script will create a packaged version of the app in firmware_flasher in your home folder.
:: After executing this script, use NSIS to create an installer from the firmware_flasher.win32.nsi file located there.
:: You may need to run npm install electron-packager --global once before this will work correctly.

set PLATFORM=win32
set ARCH=ia32
set OUTPUT_DIR=dist\windows
set PACKAGE_DIR="%OUTPUT_DIR%\QMK Firmware Flasher-%PLATFORM%-%ARCH%"

set WIX_DIR="C:\Program Files (x86)\WiX Toolset v3.10\bin"

call npm install

rmdir %PACKAGE_DIR% /S /Q
del %OUTPUT_DIR%\QMK_Firmware_Flasher_setup.exe

call node package.js

copy msi\* %PACKAGE_DIR%
copy setup\* %PACKAGE_DIR%

copy build\windows.ico %PACKAGE_DIR%
copy build\windows.png %PACKAGE_DIR%

cd %PACKAGE_DIR%

call %WIX_DIR%\candle.exe -ext WixDifxAppExtension.dll QMK_Firmware_Flasher_msi.wxs
if errorlevel 1 GOTO end

call %WIX_DIR%\light.exe -cc . -ext WixDifxAppExtension.dll -ext WixUIExtension difxapp_x86.wixlib QMK_Firmware_Flasher_msi.wixobj -o QMK_Firmware_Flasher_32-bit.msi
if errorlevel 1 GOTO end

call %WIX_DIR%\light.exe -cc . -reusecab -ext WixDifxAppExtension.dll -ext WixUIExtension difxapp_x64.wixlib QMK_Firmware_Flasher_msi.wixobj -o QMK_Firmware_Flasher_64-bit.msi
if errorlevel 1 GOTO end

call %WIX_DIR%\candle.exe QMK_Firmware_Flasher_setup.wxs -ext WixBalExtension
if errorlevel 1 GOTO end

call %WIX_DIR%\light.exe -ext WixBalExtension QMK_Firmware_Flasher_setup.wixobj
if errorlevel 1 GOTO end

copy QMK_Firmware_Flasher_setup.exe ..

:end
cd %~dp0