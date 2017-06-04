# Releases

[Check out the releases](https://github.com/jackhumbert/qmk_firmware_flasher/releases/) (darwin is OSX)

# Contributions

We welcome contributions from everyone. Contributions may take the form of
code, documentation, bug reports, feature requests, and any other activity
that will improve QMK Flasher. We ask that you follow a few guidelines when 
contributing:

* Be excellent to each other
* The primary audience for this tool is non-technical
* Indent your code with 2 spaces and use One True Brace Style.

# Development

This app uses Node.js. To get started you will need to download and install
an appropriate version.

    https://nodejs.org/en/download/

### Windows

Download and install the version that best fits your situation.

### Mac

If you have [homebrew](http://brew.sh) installed you can install node
that way:

    brew install node

## Starting the App

To run the app in development mode, enter the directory and:

    npm install && npm start

# Make A Release

Setup your environment:

* Install electron-packager globally (npm install -g electron-packager)
* (If on Linux or OSX) Install wine (brew install wine)
* Run "npm install"

## Make Windows Package

The `dist-win32.sh` script will build a release in `~/dist/win32`.

## Make macOS Package

The `dist-darwin.sh` script will build a release in `~/dist/darwin`.
