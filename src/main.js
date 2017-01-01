const electron = require('electron');  // Module to control application life.
require('electron-debug')({showDevTools: false});
const {app} = electron;
const {BrowserWindow} = electron;
const {ipcMain} = electron;
let mainWin;  // Ensure that our mainWin isn't garbage collected
let menuWin;

const shouldQuit = app.makeSingleInstance((commandLine, workingDirectory) => {
  if(mainWin) {
    if(mainWin.isMinimized()) mainWin.restore();
    mainWin.focus();
  }
});

if(shouldQuit) {
  app.quit();
}

app.on('ready', function() {
  // Create the browser window.
  if (process.platform == 'win32')
    mainWin = new BrowserWindow({width: 659, height: 510, frame: true, resizable: false});
  else
    mainWin = new BrowserWindow({width: 640, height: 480, frame: true, resizable: false});

  // Load the main interface
  mainWin.loadURL('file://' + __dirname + '/MainWindow/index.html');

  //Disable the menubar for dev versions
  mainWin.setMenu(null);

  mainWin.on('closed', function() {
    // Dereference the window object so our app exits
    mainWin = null;
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
    x: mainWin.getPosition()[0] + menuWinXOffset,
    y: mainWin.getPosition()[1] + menuWinYOffset,
    show: false
  });
  menuWin.loadURL('file://' + __dirname + '/OptionsMenuWindow/index.html');
  menuWin.on('blur', function () {
    menuWin.hide();
  });

  global.menuWinId = menuWin.id;
  global.mainWinId = mainWin.id;

  ipcMain.on('show-menu', () => {
    menuWin.setPosition(
      mainWin.getPosition()[0] + menuWinXOffset,
      mainWin.getPosition()[1] + menuWinYOffset,
      false
    );
    menuWin.show();
  }); {

  }
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});