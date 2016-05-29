# Releases

[Check out the releases](https://github.com/jackhumbert/dfu-programmer-app/releases/) (darwin is OSX)

# Development

To run the app in development mode, enter the directory and:

    npm install && npm start

# Make A Release

Setup your environment:

* Install electron-packager globally (npm install -g electron-packager)
* (If on Linux or OSX) Install wine (brew install wine)
* Run "npm install"

## Make Windows Package

The `dist-win32.sh` script will build a release in `~/QMK Firmware Flasher`.

## Make OS X Package

Use `npm run pack` on OS X to make a DMG that can be distributed.
