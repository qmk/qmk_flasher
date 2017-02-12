All files in this directory are scripts that are intended to be run by humans.

The `internal` folder contains additional files used in the packaging process.

### dist-win32.bat
This script builds the Windows installer using the WiX toolset.
Only installers built by AppVeyor should be distributed.
This script should only be run manually if you are working on the installer
and need to make a test installer to be run from within a virtual machine.

### package.js
This script will package the Windows version of the application without
generating an installer. The resulting directory is
`dist\windows\QMK Firmware Flasher-win32-ia32`.