var electron = require('electron');  // Module to control application life.
const {app} = electron;
const {BrowserWindow} = electron;
let win;  // Ensure that our win isn't garbage collected

app.on('ready', function() {
  // Create the browser window.
  if (app.platform == 'win32')
    win = new BrowserWindow({width: 670, height: 510, frame: true, resizable: false});
  else
    win = new BrowserWindow({width: 640, height: 480, frame: true, resizable: false});

  // Load the main interface
  win.loadURL('file://' + __dirname + '/index.html');

  // Open the DevTools. FIXME: Comment this out before release
  win.webContents.openDevTools({'mode':'undocked'});

  win.on('closed', function() {
    // Dereference the window object so our app exits
    win = null;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
