const electron = require('electron');  // Module to control application life.
require('electron-debug')({showDevTools: false});
const {app} = electron;
const {BrowserWindow} = electron;
const {ipcMain} = electron;
const {Menu} = electron;
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
  /* Initialize the main window
   */
  let mainWinOptions = {show: false, frame: true, resizable: false, icon: __dirname + 'build/icon.iconset/icon_128x128.png'};
  if (process.platform == 'win32') {
    mainWinOptions.width = 659;
    mainWinOptions.height = 510;
  } else {
    mainWinOptions.width = 640;
    mainWinOptions.height = 480;
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


  /* Setup the default settings.
   */
  default_settings = {
    'focusWindowOnHexChange': true,
    'theme': 'default'
  }

  if (process.platform == "darwin") {
    default_settings = {
      'focusWindowOnHexChange': false,
      'theme': 'platform'
    }
  }

  for (var key in default_settings) {
    if (!settings.has(key)) {
      console.log('Initializing setting: ' + key + '=' + default_settings[key]);
      settings.set(key, default_settings[key]);
    }
  }

  /* Populate the settings cache
   */
  settingsCache = settings.getAll();
  isSettingsInitialized = true;

  /* Initialize the gear menu window
   */
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

  ipcMain.on('get-setting-theme', (event) => {
    if(isSettingsInitialized) {
      event.returnValue = settingsCache.theme;
    }
  });

  ipcMain.on('set-settings', (event, updatedSettings) => {
    settingsCache.focusWindowOnHexChange = updatedSettings.focusWindowOnHexChange;
    settings.set('focusWindowOnHexChange', updatedSettings.focusWindowOnHexChange);
    settingsCache.theme = updatedSettings.theme;
    settings.set('theme', updatedSettings.theme);
  });

  /* Setup the mac menu items
   */
  if (process.platform === 'darwin') {
    const template = [
      {
        label: app.getName(),
        submenu: [
          {label: 'About '+app.getName(), click: function(menuItem, browserWindow, event) {mainWin.webContents.executeJavaScript("openAboutDialog()");}},
          {role: 'separator'},
          {role: 'services',submenu:[]},
          {role: 'separator'},
          {role: 'hide'},
          {role: 'hideothers'},
          {role: 'unhide'},
          {role: 'separator'},
          {role: 'quit'},
        ]
      }, {
        label: 'Edit',
        submenu: [
          {role: 'copy'},
          {role: 'selectall'}
        ]
      }, {
        label: 'View',
        submenu: [
          {role: 'toggledevtools'}
        ]
      }, {
        label: 'Window',
        submenu: [
          {role: 'minimize'},
          {role: 'close'}
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template)
    Menu.setApplicationMenu(menu);
  }
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
  app.quit();
});
