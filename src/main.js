const electron = require('electron');  // Module to control application life.
require('electron-debug')({showDevTools: false});
const {app} = electron;
const {BrowserWindow} = electron;
const {ipcMain} = electron;
const settings = require('electron-settings');

let mainWin;  // Ensure that our mainWin isn't garbage collected
let menuWin;

let isSettingsInitialized = false;
let settingsCache;

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
  let mainWinOptions = {show: false, frame: true, resizable: false};
  if (process.platform == 'win32') {
    mainWinOptions.width = 659;
    mainWinOptions.height = 260;
  } else {
    mainWinOptions.width = 640;
    mainWinOptions.height = 230;
  }

  mainWin = new BrowserWindow(mainWinOptions);

  // Load the main interface
  mainWin.loadURL('file://' + __dirname + '/MainWindow/index.html');

  //Disable the menubar for dev versions
  mainWin.setMenu(null);

  mainWin.once('ready-to-show', () => {
    mainWin.show();
  });

  mainWin.on('closed', function() {
    // Dereference the window object so our app exits
    mainWin = null;
    menuWin.close();
  });


  let focusWindowByDefault = true;
  if(process.platform == "darwin") focusWindowByDefault = false;

  settings.defaults({
    focusWindowOnHexChange: focusWindowByDefault
  });

  settings.get().then(result => {
    settingsCache = result;
    isSettingsInitialized = true;
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
  menuWin.loadURL('file://' + __dirname + '/GearMenuWindow/index.html');
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
  });

  ipcMain.on('get-setting-focus-window-on-hex-change', (event) => {
    if(isSettingsInitialized) {
      event.returnValue = settingsCache.focusWindowOnHexChange;
    }
  });

  ipcMain.on('set-settings', (event, updatedSettings) => {
    settingsCache.focusWindowOnHexChange = updatedSettings.focusWindowOnHexChange;
    settings.set('focusWindowOnHexChange', updatedSettings.focusWindowOnHexChange);
  });
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
