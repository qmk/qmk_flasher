#!/bin/sh
cp -R * /Users/j/Downloads/qmk-firmware-flasher-darwin/qmk-firmware-flasher.app/Contents/Resources/app/
cp -R * /Users/j/Downloads/qmk-firmware-flasher-win32/resources/app/
rm /Users/j/Downloads/qmk-firmware-flasher-darwin.zip
rm /Users/j/Downloads/qmk-firmware-flasher-win32.zip
cd /Users/j/Downloads
zip -r /Users/j/Downloads/qmk-firmware-flasher-darwin.zip qmk-firmware-flasher-darwin/ -x node_modules
zip -r /Users/j/Downloads/qmk-firmware-flasher-win32.zip qmk-firmware-flasher-win32/ -x node_modules
