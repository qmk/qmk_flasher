var electron = require('electron');  // Module to control application life.
var process = require('process');
require('electron-debug')({showDevTools: false});
const {app} = electron;
const {BrowserWindow} = electron;
let win;  // Ensure that our win isn't garbage collected

app.on('ready', function() {
  let windowOptions = {show: false, frame: true, resizable: false};
  if (process.platform == 'win32') {
    windowOptions.width = 659;
    windowOptions.height = 510;
  } else {
    windowOptions.width = 640;
    windowOptions.height = 480;
  }

  win = new BrowserWindow(windowOptions);
  // Load the main interface
  win.loadURL('file://' + __dirname + '/index.html');

  //Disable the menubar for dev versions
  win.setMenu(null);

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('closed', function() {
    // Dereference the window object so our app exits
    win = null;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
