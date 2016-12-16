var electron = require('electron');  // Module to control application life.
var process = require('process');
require('electron-debug')({showDevTools: false});
const {app} = electron;
const {BrowserWindow} = electron;
let win;  // Ensure that our win isn't garbage collected

app.on('ready', function() {
  // Create the browser window.
  if (process.platform == 'win32')
    win = new BrowserWindow({width: 659, height: 230, frame: true, resizable: false});
  else
    win = new BrowserWindow({width: 640, height: 200, frame: true, resizable: false});

  // Load the main interface
  win.loadURL('file://' + __dirname + '/index.html');

  //Disable the menubar for dev versions
  win.setMenu(null);

  win.on('closed', function() {
    // Dereference the window object so our app exits
    win = null;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
