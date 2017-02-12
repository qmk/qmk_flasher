@echo off
setlocal EnableDelayedExpansion

set PLATFORM=win32
set ARCH=ia32
set OUTPUT_DIR=..\dist\windows
set PACKAGE_DIR="%OUTPUT_DIR%\QMK Firmware Flasher-%PLATFORM%-%ARCH%"
set VERSION=%1

set WIX_DIR="%WIX%bin"

pushd

:: Color setup
for /F "tokens=1,2 delims=#" %%a in ('"prompt #$H#$E# & echo on & for %%b in (1) do rem"') do (
  set "DEL=%%a"
)

if not defined APPVEYOR (
	set VERSION=test
	goto warnUser
)
:: If we're running in AppVeyor and no version parameter is provided, quit.
if [%1]==[] goto end
goto build

:warnUser
echo.
call :color 0e "	WARNING"
echo.
echo  	This script will generate a Windows installer.
echo.
call :color 0e " 	It is important that only one Windows installer is built for each version number."
echo.
echo  	AppVeyor will build and publish the official installer for each version.
echo.
call :color 0e " 	This script should only be run manually if you are working on the installer, and need to test it."
echo. 
call :color 0e " 	Any installers made by running this script manually should ONLY be executed inside of a clean VM."
echo.	
set /p acknowledgedInput=To continue, type "ACKNOWLEDGED". Any other input will quit.  
if "%acknowledgedInput%"=="ACKNOWLEDGED" goto build
goto end
exit /b

:build
cd %~dp0

call npm install

if not defined APPVEYOR (
    rmdir %PACKAGE_DIR% /S /Q
    del "%OUTPUT_DIR%\QMK Firmware Flasher-*.exe"
)

call node package.js

copy internal\windows-installer\* %PACKAGE_DIR%

copy ..\build\windows.ico %PACKAGE_DIR%
copy ..\build\icon.iconset\icon_32x32@2x.png %PACKAGE_DIR%\windows.png

cd %PACKAGE_DIR%

call %WIX_DIR%\candle.exe -ext WixDifxAppExtension.dll QMK_Firmware_Flasher_msi.wxs
if errorlevel 1 goto end

call %WIX_DIR%\light.exe -cc . -ext WixDifxAppExtension.dll -ext WixUIExtension difxapp_x86.wixlib QMK_Firmware_Flasher_msi.wixobj -o QMK_Firmware_Flasher_32-bit.msi
if errorlevel 1 goto end

call %WIX_DIR%\light.exe -cc . -reusecab -ext WixDifxAppExtension.dll -ext WixUIExtension difxapp_x64.wixlib QMK_Firmware_Flasher_msi.wixobj -o QMK_Firmware_Flasher_64-bit.msi
if errorlevel 1 goto end

call %WIX_DIR%\candle.exe QMK_Firmware_Flasher_setup.wxs -ext WixBalExtension
if errorlevel 1 goto end

call %WIX_DIR%\light.exe -ext WixBalExtension QMK_Firmware_Flasher_setup.wixobj -o "QMK Firmware Flasher-%VERSION%-setup.exe"
if errorlevel 1 goto end

copy "QMK Firmware Flasher*setup.exe" ..
copy resources\app.asar ..\win32-x86-%VERSION%.asar
exit /b

:: color function obtained from http://stackoverflow.com/a/5344911
:color
set "param=^%~2" !
set "param=!param:"=\"!"
<nul > X set /p ".=."
findstr /p /A:%1 "." "!param!\..\X" nul
<nul set /p ".=%DEL%%DEL%%DEL%%DEL%%DEL%%DEL%%DEL%"
del X
echo.
exit /b

:end
popd
endlocal