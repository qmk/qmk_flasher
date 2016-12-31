const electron = require('electron');  // Module to control application life.
require('electron-debug')({showDevTools: false});
const {app} = electron;
const {BrowserWindow} = electron;
let win;  // Ensure that our win isn't garbage collected
let menuWin;

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  if(win) {
    if(win.isMinimized()) win.restore();
    win.focus();
  }
});

if(shouldQuit) {
  app.quit();
}

app.on('ready', function() {
  // Create the browser window.
  if (process.platform == 'win32')
    win = new BrowserWindow({width: 659, height: 510, frame: true, resizable: false});
  else
    win = new BrowserWindow({width: 640, height: 480, frame: true, resizable: false});

  // Load the main interface
  win.loadURL('file://' + __dirname + '/index.html');

  //Disable the menubar for dev versions
  win.setMenu(null);

  win.on('closed', function() {
    // Dereference the window object so our app exits
    win = null;
    menuWin.close();
  });


  let menuWinXOffset;
  let menuWinYOffset;
  if (process.platform == "darwin") {
    menuWinXOffset = 10;
    menuWinYOffset = 470;
  } else {
    menuWinXOffset = 20;
    menuWinYOffset = 490;
  }

  menuWin = new BrowserWindow({
    width: 120,
    height: 64,
    frame: false,
    x: win.getPosition()[0] + menuWinXOffset,
    y: win.getPosition()[1] + menuWinYOffset,
    show: false
  });
  menuWin.loadURL('file://' + __dirname + '/options-menu.html');
  menuWin.on('blur', function () {
    menuWin.hide();
  });

  global.showMenu = function () {
    menuWin.setPosition(
      win.getPosition()[0] + menuWinXOffset,
      win.getPosition()[1] + menuWinYOffset,
      false
    );
    menuWin.show();
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
