window.$ = window.jQuery = require('jquery');

const fs = require('fs');
const {ipcRenderer} = require('electron');
const remote = require('electron').remote;
const app = remote.app;
const dialog = remote.dialog;
const exec = require('child_process').exec;
const pathModule = require('path');
const chokidar = require('chokidar');
const bootstrap = require('bootstrap');
const bootbox = require('bootbox');
const usb = require('usb');

const usbDevices = {
  1003: {  // Atmel Corp., list sourced from http://www.linux-usb.org/usb.ids
    12270: ['atmega8u2'],
    12271: ['atmega16u2'],
    12272: ['atmega32u2'],
    12273: ['at32uc3a3'],
    12275: ['atmega16u4'],
    12276: ['atmega32u4'],
    12278: ['at32uc3b0', 'at32uc3b1'],
    12279: ['at90usb82'],
    12280: ['at32uc3a0', 'at32uc3a1'],
    12281: ['at90usb646'],
    12282: ['at90usb162'],
    12283: ['at90usb1286', 'at90usb1287'],
    12285: ['at89c5130', 'at89c5131'],
    12287: ['at89c5132', 'at89c5snd1c'],
  }
}
const win = remote.getCurrentWindow();

/* Figure out how to invoke dfu-programmer
 */
let eeprom_reset_location = pathModule.normalize('dfu/eeprom_reset.hex');
let dfu_location = pathModule.normalize('dfu/dfu-programmer');
if (process.platform == "win32") {
  dfu_location = dfu_location + '.exe'
}

try {
    fs.accessSync(dfu_location, fs.F_OK);
} catch (err) {
    // Running in deployed mode, use the app copy
    dfu_location = pathModule.resolve(app.getAppPath(), '..', 'app.asar.unpacked', dfu_location);
    eeprom_reset_location = pathModule.resolve(app.getAppPath(), '..', 'app.asar.unpacked', eeprom_reset_location);
}

//Place after all modifications to dfu_location have been made.
dfu_location = '"' + dfu_location + '"';
eeprom_reset_location = '"' + eeprom_reset_location + '"';

/* State variables
 */
let bootloader_ready = false;
let dfu_device = null;
let flash_in_progress = false;
let flash_when_ready = false;
let watcher;

/* HTML entities
 */
let $advancedMode = $('#advanced-mode');
let $autoFlash = $('#auto-flash');
let $rebootMCU = $('#reboot-mcu');
let $eraseEEPROM = $('#erase-eeprom');
let $bringToFront = $('#bring-to-front');
let $currentTheme = $('#current-theme');
let $filePath = $('#file-path');
let $flashHex = $('#flash-hex');
let $gearMenu = $('#gear-menu');
let $loadFile = $('#load-file');
let $optionsModal = $('#options-modal');
let $saveOptions = $('#save-options');
let $status = $('#status');

let $hexChangedFlash;

/* Setup some text strings
 */
const flashImmediatelyButtonText = "Flash";
const flashWhenReadyButtonText = "Flash When Ready";
const pressResetText = "Press RESET on your keyboard's PCB.";
const aboutText = "<p>QMK Flasher version " + app.getVersion() + "</p>\
<p>Copyright (c) 2015-2017 Jack Humbert, Zach White</p>\
<p>Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the conditions laid out in the included <a href=\"https://github.com/qmk/qmk_flasher/blob/master/LICENSE.md\">LICENSE.md</a> file.</p>";

$flashHex.text(flashImmediatelyButtonText);

/* Populate the HTML entities that use user preferences.
 */
loadOptionsState();

$(document).ready(function() {
  /* Setup stylesheets.
   */
  if ($advancedMode.is(":checked")) {
    $("<link/>", {rel: "stylesheet", type: "text/css", href: "advanced.css"}).appendTo("head");
  } else {
    $("<link/>", {rel: "stylesheet", type: "text/css", href: "simple.css"}).appendTo("head");
  }
  $("<link/>", {rel: "stylesheet", type: "text/css", href: "themes/" + $currentTheme.val() + ".css"}).appendTo("head");

  /* Reboot the MCU
   */
  $rebootMCU.click(function() {
    if (bootloader_ready) {
      resetChip(function(success) {
        if (success) {
          clearStatus();
          sendStatus(pressResetText);
        } else {
          sendStatus('Could not reset MCU!');
        }
      });
    }
  });

  /* Reset the EEPROM
   */
  $eraseEEPROM.click(function() {
    if (bootloader_ready) {
      eraseEEPROM(function(success) {
        if (success) {
          sendStatus(pressResetText);
        } else {
          sendStatus('Could not erase EEPROM!');
        }
      });
    }
  });

  /* Handle drag-n-drop events
   */
  $(document).on('dragenter dragover', function(event) {
    event.preventDefault();
    event.stopPropagation();
  });

  $(document).on('drop', function(event) {
    event.preventDefault();
    event.stopPropagation();

    const file = event.originalEvent.dataTransfer.files[0];
    loadHex(file.path);
  });

  $(document).on('open-file', function(event, path) {
    event.preventDefault();
    event.stopPropagation();

    loadHex(path);
  });

  /* Bind actions to our buttons
   */
  $loadFile.bind('click', function (event) {
    loadHex(loadFile()[0]);
  });

  $flashHex.bind('click', function (event) {
    handleFlashButton();
  });

  $gearMenu.bind('click', function (event) {
    ipcRenderer.send('show-menu');
  });

  $optionsModal.on('hidden.bs.modal', function (e) {
    loadOptionsState();
  });

  $saveOptions.bind('click', function (event) {
    themeBefore = ipcRenderer.sendSync('get-setting-theme');
    newSettings = {
      focusWindowOnHexChange: $bringToFront.is(":checked"),
      theme: $currentTheme.val(),
      advancedMode: $advancedMode.is(":checked")
    }
    ipcRenderer.send('set-settings', newSettings);
    themeAfter = ipcRenderer.sendSync('get-setting-theme');
    $optionsModal.modal('hide');
    win.webContents.reload();
  });

  /* Open links externally by default
   */
  var shell = require('electron').shell;
  $(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
  });

  /* Ready to go
   */
  exec(dfu_location + ' --version', function(error, stdout, stderr) {
    if (stderr.indexOf('dfu-programmer') > -1) {
      window.setTimeout(checkForBoard, 10);
      sendStatus("Select a firmware file by clicking 'Choose .hex' or drag and drop a file onto this window.");
    } else {
      if (process.platform === 'win32') {
        sendStatus("Could not run dfu-programmer! Have you installed the driver?");
        sendStatus("<br>Try using <a href=\"https://github.com/qmk/qmk_driver_installer/releases\">qmk_driver_installer</a> to fix it.");
      } else {
        sendStatus("Could not run dfu-programmer! Please report this as a bug!");
      }
      sendStatus("<br>Debugging information:<br>");
      sendStatus(error);
      sendStatus("stdout:");
      writeStatus(stdout);
      sendStatus("stderr:");
      writeStatus(stderr);
      sendStatus("dfu location:");
      writeStatus(dfu_location);
    }
  });
});

function autoFlashEnabled() {
  return ipcRenderer.sendSync('get-setting-advanced-mode') && $autoFlash.hasClass('active');
}

function openAboutDialog() {
  bootbox.alert({
    size: "small",
    title: "About",
    message: aboutText
  });
}

function openOptions() {
  $optionsModal.modal('show');
}

function loadOptionsState() {
  $currentTheme.val(ipcRenderer.sendSync('get-setting-theme'));
  $bringToFront.prop('checked', ipcRenderer.sendSync('get-setting-focus-window-on-hex-change'));
  $advancedMode.prop('checked', ipcRenderer.sendSync('get-setting-advanced-mode'));
}

function checkFile(filename = $filePath.text()) {
    if (filename.slice(-4).toUpperCase() == '.HEX') {
        return true;
    } else {
        sendStatus("Invalid firmware file: " + filename);
        return false;
    }
}

function checkFileSilent(filename = $filePath.text()) {
    return filename.slice(-4).toUpperCase() == '.HEX';
}

function displayHexFileChangedPrompt(useNativeDialog) {
  let confirmButtonText;
  if (bootloader_ready) confirmButtonText = "Flash Keyboard";
  else confirmButtonText = "Flash When Ready";
  const messageText = "The hex file has changed. Would you like to flash the new version?";

  if (useNativeDialog) {
    /* Use a native dialog on macOS
     */
    dialog.showMessageBox(win, {
      buttons: [confirmButtonText, "Cancel"],
      defaultId: 0,
      message: messageText
      //TODO: Set an appropriate icon
    }, function (response) {
      if (response == 0) {
        handleFlashButton();
      }
    })
  } else {
    /* Use Bootbox on all other platforms.
     */
    const hexChangedModal = bootbox.confirm({
      message: messageText,
      buttons: {
        confirm: {
          label: confirmButtonText,
          className: 'btn-success'
        },
        cancel: {
          label: 'Cancel'
        }
      },
      callback: function (result) {
        if (result) {
          handleFlashButton();
        }
      }
    });

    hexChangedModal.init(function () {
      $hexChangedFlash = hexChangedModal.find("[data-bb-handler='confirm']");
    });
  }
}

function loadHex(filename) {
  /* Load a file and prepare to flash it.
   */
  if(watcher) watcher.close();

  if(!checkFile(filename)) {
    return;
  }

  $filePath.text(filename);
  clearStatus();

  enableButton($flashHex);

  if (bootloader_ready) {
    if (autoFlashEnabled()) {
      clearStatus();
      flashFirmware();
    } else {
      enableButton($flashHex);
      enableButton($rebootMCU);
      enableButton($eraseEEPROM);
      setFlashButtonImmediate();
      sendStatus("Ready To Flash!");
    }
  } else {
    if (!autoFlashEnabled()) {
      enableButton($flashHex);
      $flashHex.text(flashWhenReadyButtonText);
    }
    sendStatus(pressResetText);
    $flashHex.text(flashWhenReadyButtonText);
  }

  watcher = chokidar.watch(filename, {});
  watcher.on('change', path => {
    if(process.platform == "win32") {
      win.once('focus', () => win.flashFrame(false));
      win.flashFrame(true);
    } else if(process.platform == "darwin") {
      app.dock.bounce();
    }

    if(ipcRenderer.sendSync('get-setting-focus-window-on-hex-change')) {
      win.focus();
    }
    if (process.platform == "darwin") {
      displayHexFileChangedPrompt(true);
    } else {
      displayHexFileChangedPrompt(false);
    }
  });
}

function disableButton(button) {
    button.prop('disabled', true);
    button.removeClass('btn-success');
    button.addClass('btn-secondary');
}

function enableButton(button) {
    button.prop('disabled', false);
    button.removeClass('btn-secondary');
    button.addClass('btn-success');
}

function setFlashButtonImmediate() {
  $flashHex.text(flashImmediatelyButtonText);
  if($hexChangedFlash){
    $hexChangedFlash.text(flashImmediatelyButtonText);
  }
}

function setFlashButtonWhenReady() {
  $flashHex.text(flashWhenReadyButtonText);
  if($hexChangedFlash) {
    $hexChangedFlash.text(flashWhenReadyButtonText);
  }
}

function handleFlashButton() {
    if ($flashHex.text() == flashImmediatelyButtonText) {
        clearStatus();
        flashFirmware();
    } else {
        if(!checkFile()) return;
        flash_when_ready = true;
        clearStatus();
        sendStatus("The firmware will flash as soon as the keyboard is ready to receive it.");
        sendStatus("Press the RESET button to prepare the keyboard.");
        disableButton($flashHex);
        disableButton($eraseEEPROM);
        disableButton($rebootMCU);
    }
}

function clearStatus() {
  $status.text('');
}

function writeStatus(text) {
  /* Write a line to the status window. Should only be used to write
   * command output.
   */
  $status.append(text);
  $status.scrollTop($status.scrollHeight);
}

function sendStatus(text) {
  /* Send a bold line to the status window. Should be used for most
   * status updates.
   */
  writeStatus('<b>' + text + '</b>\n');
}

function loadFile() {
  /* Glue code to open a native file dialog box.
   */
  return dialog.showOpenDialog({
    properties: [ 'openFile' ],
    filters: [
      { name: 'Custom File Type', extensions: ['hex'] }
    ]
  });
}

function flashFirmware() {
  if(!checkFile()) return;
  disableButton($flashHex);
  disableButton($rebootMCU);
  disableButton($eraseEEPROM);
  sendHex($filePath.text(), function (success) {
    if (success) {
      sendStatus("Flashing complete!");
      if (autoFlashEnabled()) {
        sendStatus(pressResetText);
      } else {
        sendStatus("Load another hex or press RESET on a keyboard.")
      }
    } else {
      sendStatus("An error occurred - please try again.");
    }
  });
}

function sendHex(file, callback) {
  /* Do all the steps necessary to flash the hex to the keyboard.
   * Called after all checks have been performed.
   */
  flash_in_progress = true;
  flash_when_ready = false;

  eraseChip(function(success) {
    if (success) {
      flashChip(file, function(success) {
        if (success) {
          resetChip(function(success) {
            if (success) {
              callback(true);
            } else {
              console.log('Error resetting chip, see status window.')
              callback(false)
            }
          });
        } else {
          console.log('Error resetting chip, memory/other.')
          callback(false);
        }
      });
    } else {
      console.log('Error resetting chip, no device/other.')
      callback(false);
    }
  });
  flash_in_progress = false;
}

function eraseChip(callback) {
  let dfu_args = ' ' + dfu_device + ' erase --force';
  sendStatus('dfu-programmer' + dfu_args);
  console.log(dfu_location + dfu_args);
  exec(dfu_location + dfu_args, function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
    const regex = /.*Success.*\r?\n|\rChecking memory from .* Empty.*/;
    if (regex.test(stderr)) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function flashChip(file, callback) {
  let dfu_args = ' ' + dfu_device + ' flash ' + file;
  sendStatus('dfu-programmer' + dfu_args);
  console.log(dfu_location + dfu_args);
  exec(dfu_location + dfu_args, function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
    if (stderr.indexOf("Validating...  Success") > -1) {
      callback(true);
    } else {
      callback(false);
    }
  });
}

function resetChip(callback) {
  let dfu_args = ' ' + dfu_device + ' reset';
  sendStatus('dfu-programmer' + dfu_args);
  console.log(dfu_location + dfu_args);
  exec(dfu_location + dfu_args, function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
	if (stderr == "") {
	  callback(true);
    } else {
      callback(false);
    }
  });
}

function flashEEPROM(callback) {
  let dfu_args = ' atmega32u4 flash --eeprom ' + eeprom_reset_location;

  sendStatus('dfu-programmer' + dfu_args);
  console.log(dfu_location + dfu_args);

  exec(dfu_location + dfu_args, function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
    if (stderr.indexOf("Validating...  Success") > -1) {
	  callback(true);
    } else {
      callback(false);
    }
  });
}

function eraseEEPROM(callback) {
  flash_in_progress = true;

  eraseChip(function(success) {
    if (success) {
      flashEEPROM(function(success) {
        if (success) {
          flashChip($filePath.text(), function(success) {
            if (success) {
              resetChip(function(success) {
                if (success) {
                  callback(true);
                } else {
                  console.log('Error resetting chip, see status window.')
                  callback(false)
                }
              });
            } else {
              console.log('Error flashing new firmware, see status window.')
              callback(false)
            }
          });
        } else {
          console.log('Error erasing EEPROM, see status window.')
          callback(false);
        }
      });
    } else {
      console.log('Error erasing flash, see status window.')
      callback(false);
    }
  });

  flash_in_progress = false;
}

function checkForBoard() {
  if (!flash_in_progress) {
    // First look for a supported bootloader
    dfu_device = null;
    for (let device of usb.getDeviceList()) {
      if (usbDevices.hasOwnProperty(device.deviceDescriptor.idVendor) && (usbDevices[device.deviceDescriptor.idVendor].hasOwnProperty(device.deviceDescriptor.idProduct))) {
        dfu_device = usbDevices[device.deviceDescriptor.idVendor][device.deviceDescriptor.idProduct];
        console.log('Found atmel device: '+dfu_device[0]);
        break; // First match wins for now
      }
    }
    if (dfu_device) {
      exec(dfu_location + ' ' + dfu_device + ' get bootloader-version', function(error, stdout, stderr) {
        if (stdout.indexOf("Bootloader Version:") > -1) {
          if (!bootloader_ready && checkFileSilent()) {
            clearStatus();
          }

        if (!bootloader_ready) {
          bootloader_ready = true;
          if (checkFileSilent()) {
            if (flash_when_ready || autoFlashEnabled()) {
              flashFirmware();
            } else {
              enableButton($flashHex);
              enableButton($rebootMCU);
              enableButton($eraseEEPROM);
              setFlashButtonImmediate();
              sendStatus("Ready To Flash!");
            }
          }
        }
      } else if (bootloader_ready) {
        bootloader_ready = false;
        disableButton($rebootMCU);
        disableButton($eraseEEPROM);
        if(checkFileSilent() && !autoFlashEnabled()) {
          if(!flash_when_ready){
            enableButton($flashHex);
          }
        }
      });
    }
  }

  if (bootloader_ready) {
    window.setTimeout(checkForBoard, 1000);
  } else if (autoFlashEnabled()) {
    window.setTimeout(checkForBoard, 500);
  } else {
    window.setTimeout(checkForBoard, 5000);
  }
}
