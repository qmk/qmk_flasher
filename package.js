const packager = require('electron-packager');
const path = require('path');
const os = require('os');

packagerOptions = {
	"dir": ".",
	"out": path.resolve(os.homedir(), "firmware_flasher"),
	"platform": "win32,darwin",
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