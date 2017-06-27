/* This file says HID device, which is redundant, a lot. You'll get over it.
 */

window.$ = window.jQuery = require('jquery');
const bootstrap = require('bootstrap');

const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const BrowserWindow = remote.BrowserWindow;
const HID = require('node-hid');

/* HTML Entities
 */
let $status = $('#status');
let $keyboardChooserLabel = $('#keyboard-chooser-label');
let $keyboardList = $('#keyboard-list');

/* State variables
 */
let currentHidDevice;

/* Helpful functions
 */
function clearConsole() {
  $status.text('');
}

function writeConsole(text) {
  /* Write a line to the console window. Should only be used to write
   * log output.
   */
  $status.append(text);
  $status.scrollTop(1E10);  // Scroll a lot so we don't have to calculate.
}

function process_usb_packet(data_array) {
  /* Process a USB message.
   */
  let message = '';
  for (let char of data_array) {
    message += String.fromCharCode(char);
  }
  writeConsole(message);
}

function handleError(error) {
  /* Called when there's an error from the HID device
   */
  console.log('HID error:', error);
  writeConsole('\n<b>Connection to keyboard closed:</b> ' + error);
  currentHidDevice.close();
  currentHidDevice = null;
  $keyboardChooserLabel.html('Choose Keyboard');
}

function selectKeyboard(manufacturer, product, path) {
  console.log('selectKeyboard: ', manufacturer, product, path);
  clearConsole();
  currentHidDevice = new HID.HID(path);
  currentHidDevice.on("data", process_usb_packet);
  currentHidDevice.on("error", handleError);
  $keyboardChooserLabel.html('<b>Manufacturer:</b> ' + manufacturer + ', <b>Keyboard:</b> ' + product);
  writeConsole('<b>Connected to ' + manufacturer + ' ' + product + ': ' + path + '</b>\n');
}

function populateKeyboardDropdown() {
  /* Empty the keyboard list and repopulate it.
   */
  let keys = [];
  let keyboards = {}
  let devices = HID.devices();
  console.log('devices:', devices);

  for (let device of devices) {
    if (device.usage == 116) {  // Look for USB devices with hid_listen usage
      console.log('device:', device)
      keys.push(device.path);
      keyboards[device.path] = device;
    }
  }

  keys.sort();
  $keyboardList.empty();
  for (let key of keys) {
    keyboard = keyboards[key];
    let select_opts = "'" + keyboard.manufacturer + "', '" + keyboard.product + "', '" + keyboard.path + "'";
    let dropdown_entry = keyboard.manufacturer + '(0x' + keyboard.vendorId.toString(16).toUpperCase() + '): ' + keyboard.product + '(0x' + keyboard.productId.toString(16).toUpperCase() + ')';

    $keyboardList.append('<li><a href="#" onclick="selectKeyboard(' + select_opts + ');">' + dropdown_entry + '</a></li>');
  }

  window.setTimeout(populateKeyboardDropdown, 3000);
}

$(document).ready(function() {
  /* main()
   */
  $("<link/>", {rel: "stylesheet", type: "text/css", href: "../MainWindow/themes/" + ipcRenderer.sendSync('get-setting-theme') + ".css"}).appendTo("head");

  populateKeyboardDropdown();
});
