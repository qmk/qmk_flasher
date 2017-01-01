window.$ = window.jQuery = require('jquery');
const bootstrap = require('bootstrap');

const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
const mainWindow = BrowserWindow.fromId(remote.getGlobal('mainWinId'));
const win = remote.getCurrentWindow();

const aboutMenuItem = $('#about-item');
const optionsMenuItem = $('#options-item');

aboutMenuItem.bind('click', () => {
  mainWindow.webContents.executeJavaScript("sendStatus('About menu item clicked.')");
  aboutMenuItem.blur();
  win.hide();
});

optionsMenuItem.bind('click', () => {
  mainWindow.webContents.executeJavaScript("openOptions()");
  optionsMenuItem.blur();
  win.hide();
});
