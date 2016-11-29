var electron = require('electron');  // Module to control application life.
var process = require('process');
const {app} = electron;
const {BrowserWindow} = electron;
let win;  // Ensure that our win isn't garbage collected

app.on('ready', function() {
  // Create the browser window.
  if (process.platform == 'win32')
    win = new BrowserWindow({width: 670, height: 510, frame: true, resizable: false});
  else
    win = new BrowserWindow({width: 640, height: 480, frame: true, resizable: false});

  // Load the main interface
  win.loadURL('file://' + __dirname + '/index.html');

  // Uncomment this line to open the DevTools upon launch. 
  //win.webContents.openDevTools({'mode':'undocked'});

  win.on('closed', function() {
    // Dereference the window object so our app exits
    win = null;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
