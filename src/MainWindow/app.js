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

const win = remote.getCurrentWindow();

let dfu_location = pathModule.normalize('dfu/dfu-programmer');
let watcher;

// State variables
let bootloader_ready = false;
let flash_in_progress = false;
let flash_when_ready = false;

//HTML entities
let $advancedFeatures = $('.advanced-feature');
let $advancedMode = $('#advanced-mode');
let $autoFlash = $('#auto-flash');
let $rebootMCU = $('#reboot-mcu');
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

const flashImmediatelyButtonText = "Flash Keyboard";
const flashWhenReadyButtonText = "Flash When Ready";
const pressResetText = "Press RESET on your keyboard's PCB.";

$flashHex.text(flashImmediatelyButtonText);

if (process.platform == "win32") {
  dfu_location = dfu_location + '.exe'
}

try {
    fs.accessSync(dfu_location, fs.F_OK);
} catch (err) {
    // Running in deployed mode, use the app copy
    dfu_location = pathModule.resolve(app.getAppPath(), '..', 'app.asar.unpacked', dfu_location);
}

//Place after all modifications to dfu_location have been made.
dfu_location = '"' + dfu_location + '"';

loadOptionsState();

$(document).ready(function() {
  $("<link/>", {
     rel: "stylesheet",
     type: "text/css",
     href: "themes/" + $currentTheme.val() + ".css"
  }).appendTo("head");

  console.log(ipcRenderer.sendSync('get-setting-advanced-mode'))
  if (ipcRenderer.sendSync('get-setting-advanced-mode')) {
    $advancedFeatures.show();
  } else {
    $advancedFeatures.hide();
  }

  $autoFlash.click(function() {
    // Turns autoflash on or off. This function is called before
    // jquery toggles the active status.
    if ($autoFlash.hasClass('active')) {
      $autoFlash.text('AutoFlash: Off')
    } else {
      $autoFlash.text('AutoFlash: On')
    }
  });

  $rebootMCU.click(function() {
    // Resets the MCU
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

  // Handle drag-n-drop events
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

  // Bind actions to our buttons
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

    if ($advancedMode.is(":checked")) {
      $advancedFeatures.show();
    } else {
      $advancedFeatures.hide();
    }

    if (themeBefore != themeAfter) {
        win.webContents.reload();
    }

    $optionsModal.modal('hide');
  });

  // Enable tooltips
  $(function () {
    $('[data-toggle="tooltip"]').tooltip()
  })

  //open links externally by default
  var shell = require('electron').shell;
  $(document).on('click', 'a[href^="http"]', function(event) {
    event.preventDefault();
    shell.openExternal(this.href);
  });

  // Enable tooltips
  $(function () {
    $('[data-toggle="tooltip"]').tooltip()
  })

  // Ready to go
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
    message: `QMK Flasher version ${app.getVersion()}`
    //TODO: Display information about open source licenses
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
  } else { // On platforms other than Mac, use Bootbox for the prompt
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
  // Load a file and prepare to flash it.
  if(watcher) watcher.close();

  if(!checkFile(filename)) {
    return;
  }

  $filePath.text(filename);
  clearStatus();

  if (bootloader_ready) {
    if (autoFlashEnabled()) {
      clearStatus();
      flashFirmware();
    } else {
      enableButton($flashHex);
      enableButton($rebootMCU);
      setFlashButtonImmediate();
      sendStatus("Ready To Flash!");
    }
  } else {
    if (!autoFlashEnabled()) {
      enableButton($flashHex);
      $flashHex.text(flashWhenReadyButtonText);
    }
    sendStatus(pressResetText);
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
  if($hexChangedFlash){
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
        disableButton($rebootMCU);
    }
}

function clearStatus() {
  $status.text('');
}

function writeStatus(text) {
  $status.append(text);
  $status.scrollTop($status.scrollHeight);
}

function sendStatus(text) {
  // Write a line to the status window.
  writeStatus('<b>' + text + '</b>\n');
}

function loadFile() {
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
  flash_in_progress = true;
  flash_when_ready = false;
  eraseChip(function(success) {
    if (success) {
      // continue
      flashChip(file, function(success) {
        if (success) {
          // continue
          resetChip(function(success) {
            if (success) {
              // completed successfully
              callback(true);
            } else {
              callback(false)
            }
          });
        } else {
          // memory error / other
          callback(false);
        }
      });
    } else {
      // no device / other error
      callback(false);
    }
  });
  flash_in_progress = false;
}

function eraseChip(callback) {
  sendStatus('dfu-programmer atmega32u4 erase --force');
  exec(dfu_location + ' atmega32u4 erase --force', function(error, stdout, stderr) {
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
  sendStatus('dfu-programmer atmega32u4 flash ' + file);
  exec(dfu_location + ' atmega32u4 flash ' + file, function(error, stdout, stderr) {
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
  sendStatus('dfu-programmer atmega32u4 reset');
  exec(dfu_location + ' atmega32u4 reset', function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
	if (stderr == "") {
	  callback(true);
    } else {
      callback(false);
    }
  });
}

function checkForBoard() {
  if (!flash_in_progress) {
    exec(dfu_location + ' atmega32u4 get bootloader-version', function(error, stdout, stderr) {
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
              setFlashButtonImmediate();
              sendStatus("Ready To Flash!");
            }
          }
        }
      } else if (bootloader_ready) {
        bootloader_ready = false;
        disableButton($rebootMCU);
        if(checkFileSilent() && !autoFlashEnabled()) {
          if(!flash_when_ready){
            enableButton($flashHex);
          }
          setFlashButtonWhenReady();
        } else {
          setFlashButtonImmediate();
          disableButton($flashHex);
        }
      }
    });
  }

  if (bootloader_ready) {
    window.setTimeout(checkForBoard, 1000);
  } else if (autoFlashEnabled()) {
    window.setTimeout(checkForBoard, 500);
  } else {
    window.setTimeout(checkForBoard, 5000);
  }
}
