#!/bin/sh
cp -R * /Users/j/Downloads/dfu-programmer-app-darwin/dfu-programmer.app/Contents/Resources/app/
cp -R * /Users/j/Downloads/dfu-programmer-app-win32/resources/app/
rm /Users/j/Downloads/dfu-programmer-app-darwin.zip
rm /Users/j/Downloads/dfu-programmer-app-win32.zip
zip -r /Users/j/Downloads/dfu-programmer-app-darwin.zip /Users/j/Downloads/dfu-programmer-app-darwin/
zip -r /Users/j/Downloads/dfu-programmer-app-win32.zip /Users/j/Downloads/dfu-programmer-app-win32/
