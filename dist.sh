#!/bin/sh
cp -R * /Users/j/Downloads/dfu-programmer-app-darwin/dfu-programmer.app/Contents/Resources/app/
cp -R * /Users/j/Downloads/dfu-programmer-app-win32/resources/app/
rm /Users/j/Downloads/dfu-programmer-app-darwin.zip
rm /Users/j/Downloads/dfu-programmer-app-win32.zip
cd /Users/j/Downloads
zip -r /Users/j/Downloads/dfu-programmer-app-darwin.zip dfu-programmer-app-darwin/
zip -r /Users/j/Downloads/dfu-programmer-app-win32.zip dfu-programmer-app-win32/
