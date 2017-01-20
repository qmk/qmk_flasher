const packager = require('electron-packager');
const path = require('path');
const os = require('os');

packagerOptions = {
	"dir": ".",
	"out": path.resolve("dist", "windows"),
	"icon": path.resolve("build", "windows.ico"),
	"platform": "win32",
	"arch": "ia32",
	"overwrite": true,
	"asar": {
		"unpackDir": "dfu"
	},
	"ignore": ["msi", "setup", ".idea"]
};
	
packager(packagerOptions, function done_callback (err, appPaths) {
	if(err) {
		console.log(err);		
	}
});