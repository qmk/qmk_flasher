const execFileSync = require('child_process').execFileSync;
const path = require('path');
const os = require('os');

const args = require('minimist')(process.argv.slice(2));
const deasync = require('deasync');
const fs = require('fs-extra');
const packager = deasync(require('electron-packager'));
const path7za = require('7zip-bin').path7za;

const distDir = path.resolve("__dirname", "..", "dist");
// TODO: If the windows installer script is calling this file, we should change the suffix appropriately.
const windowsOutputPath = getFromDistDir("QMK-Firmware-Flasher-Windows-test");
const macOutputPath = getFromDistDir("QMK-Firmware-Flasher-Mac-test");

if((args.p === "mac" || args.p === "both") && os.platform() === "win32") {
  console.log("Packaging the Mac version from Windows is not supported at this time.");
  console.log("Subscribe to this issue for updates: https://github.com/electron-userland/electron-packager/issues/164");
  process.exit(1);
  /*
  const execSync = require('child_process').execSync;
  try {
    execSync("net session >nul 2>&1"); // Check for admin privileges. See http://stackoverflow.com/a/11995662/4651874
  } catch (e) {
    console.log("This script must be run with admin privileges to package the Mac version using Windows.");
    process.exit(1); // Exit with an error state
  }*/
}

packagerOptions = {
	"dir": path.resolve("__dirname", ".."),
	"icon": path.resolve("__dirname", "..", "build", "icon"),
	"overwrite": true,
	"asar": {
		"unpackDir": "dfu"
	},
	"out": distDir,
	"ignore": ["dist", "packaging", ".idea"]
};

// if args.p === "windows-setup-installer" //This is intentionally undocumented.For use by the win32-dist.bat script ONLY.
// set zip option to true
if(args.p === "windows") {
  deleteFilesWindows();
	packageWindows(packagerOptions);
} else if(args.p === "mac") {
  deleteFilesMac()
	packageMac(packagerOptions);
} else if(args.p === "both") {
  deleteFilesWindows();
  deleteFilesMac();
  packageWindows(packagerOptions);
  packageMac(packagerOptions);
} else {
	console.log("Usage: node package.js -p <platform> [--nozip]\n");
	console.log("Supported platform values:\n* windows\n* mac\n* both");
}

function packageWindows(options) {
  options.platform = "win32";
  options.arch = "ia32";
  packager(options);
  console.log("Done packaging");
  fs.renameSync(getFromDistDir("QMK Firmware Flasher-win32-ia32"), windowsOutputPath);
  if(!args.nozip) {
    console.log("Creating zip");
    execFileSync(path7za, ["a", "-tzip", getFromDistDir("qmk-ff-windows-test.zip"), windowsOutputPath]);
    console.log("Done creating zip");
    fs.removeSync(windowsOutputPath);
  }
}

function packageMac(options) {
  packagerOptions.platform = "darwin";
  packagerOptions.arch = "x64";
  packager(options);
  console.log("Done packaging");
  fs.renameSync(getFromDistDir("QMK Firmware Flasher-darwin-x64"), macOutputPath);
  if(!args.nozip) {
    console.log("Creating zip");
    execFileSync(path7za, ["a", "-snl", "-tzip", getFromDistDir("qmk-ff-mac-test.zip"), path.resolve(macOutputPath, "QMK Firmware Flasher.app")]);
    console.log("Done creating zip");
    fs.removeSync(macOutputPath);
  }
}

function deleteFilesWindows() {
  fs.readdirSync(distDir)
    .filter(file => {
      return file.match(/win/i);
    })
    .forEach(file => {
      fs.removeSync(getFromDistDir(file));
    });
}

function deleteFilesMac() {
  fs.readdirSync(distDir)
    .filter(file => {
      return file.match(/mac/i) || file.match(/darwin/i);
    })
    .forEach(file => {
      fs.removeSync(getFromDistDir(file));
    });
}

function getFromDistDir(path_) {
  return path.resolve(distDir, path_);
}

// 7z a -snl -tzip mac.zip "QMK Firmware Flasher-darwin-x64\QMK Firmware Flasher.app"

// If we are just building zips, we should delete the intermediate directory. We need options to not build zips, and
// one for building the Windows installer that will generate a zip but will leave the directory intact.
// The batch script should then clean up the directory.