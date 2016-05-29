var app = require('app');  // Module to control application life.
var BrowserWindow = require('browser-window');  // Module to create native browser window.
require('crash-reporter').start();  // Report crashes to our server.
var mainWindow = null;  // Ensure that our mainWindow isn't garbage collected

app.on('ready', function() {
  // Create the browser window.
  mainWindow = new BrowserWindow({width: 640, height: 480, frame: true, resizable: false});

  // Load the main interface
  mainWindow.loadUrl('file://' + __dirname + '/index.html');

  // Open the DevTools. FIXME: Comment this out before release
  // mainWindow.webContents.openDevTools({'mode':'undocked'});

  mainWindow.on('closed', function() {
    // Dereference the window object so our app exits
    mainWindow = null;
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
