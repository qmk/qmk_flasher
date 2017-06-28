window.$ = window.jQuery = require('jquery');
const bootstrap = require('bootstrap');

const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
const mainWindow = BrowserWindow.fromId(remote.getGlobal('mainWinId'));
const win = remote.getCurrentWindow();

const $aboutMenu = $('#about');
const $consoleMenu = $('#console');
const $optionsMenu = $('#options');

$aboutMenu.bind('click', () => {
  mainWindow.webContents.executeJavaScript("openAboutDialog()");
  $aboutMenu.blur();
  win.hide();
});

$consoleMenu.bind('click', () => {
  $consoleMenu.blur();
  consoleWin = new BrowserWindow({
    show: false,
    frame: true,
    resizable: true,
    maximizable: true,
    fullscreen: false,
    fullscreenable: false,
    title: 'hid_listen',
  });
  consoleWin.loadURL('file://' + __dirname + '/../ConsoleWindow/index.html');
  consoleWin.setMenu(null);
  consoleWin.once('ready-to-show', () => { consoleWin.show(); });
  consoleWin.on('closed', function() { consoleWin = null; });
  win.hide();
});

$optionsMenu.bind('click', () => {
  mainWindow.webContents.executeJavaScript("openOptions()");
  $optionsMenu.blur();
  win.hide();
});
