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
let ui_mode = 'simple';

//HTML entities
let flashButton = $('#flash-hex');
let loadButton = $('#load-file');
let pathField = $('#file-path');
let statusBox = $('#status');
let optionsModal = $('#options-modal');
let saveOptionsButton = $('#save-options-button');
let bringToFrontCheckbox = $('#bring-to-front-checkbox');
let simple_tab = $('#simple');
let expert_tab = $('#expert');
let expertFeatures = $('#expert-features');
let simpleStatus = $('#simple-status');
let gearMenuButton = $('#gear-menu');
let hexChangedFlashButton;

const flashImmediatelyButtonText = "Flash Keyboard";
const flashWhenReadyButtonText = "Flash When Ready";

flashButton.text(flashImmediatelyButtonText);

if (process.platform == "win32") {
  dfu_location = dfu_location + '.exe'
}

try {
    fs.accessSync(dfu_location, fs.F_OK);
} catch (err) {
    // Running in deployed mode, use the app copy
    dfu_location = pathModule.resolve(app.getAppPath(), dfu_location);
}

//Place after all modifications to dfu_location have been made.
dfu_location = '"' + dfu_location + '"';

loadOptionsState();

$(document).ready(function() {
// Setup the tabs
  $('#simple').click(function() {
    win_size = win.getSize();
    if (win_size[1] > 330) {
      simple_tab.css('background-color', '#ccc');
      expert_tab.css('background-color', '#fff');
      let y = win_size[1] - 330;
      expertFeatures.hide();
      simpleStatus.show();
      win.setSize(win_size[0], y, true);
    }
  });

  $('#expert').click(function() {
    win_size = win.getSize();
    if (win_size[1] < 330) {
      simple_tab.css('background-color', '#fff');
      expert_tab.css('background-color', '#ccc');
      let y = win_size[1] + 330;
      expertFeatures.show();
      simpleStatus.hide();
      win.setSize(win_size[0], y, true);
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
  loadButton.bind('click', function (event) {
    loadHex(loadFile()[0]);
  });

  flashButton.bind('click', function (event) {
    handleFlashButton();
  });

  gearMenuButton.bind('click', function (event) {
    ipcRenderer.send('show-menu');
  });

  optionsModal.on('hidden.bs.modal', function (e) {
    loadOptionsState();
  });

  saveOptionsButton.bind('click', function (event) {
    optionsModal.modal('hide');
    ipcRenderer.send('set-settings', {
      focusWindowOnHexChange: bringToFrontCheckbox.is(":checked")
    });
  });

  // Ready to go
  exec(dfu_location + ' --version', function(error, stdout, stderr) {
    if (stderr.indexOf('dfu-programmer') > -1) {
      window.setTimeout(checkForBoard, 10);
      sendStatus("Select a firmware file by clicking 'Choose .hex' or drag and drop a file onto this window.", true);
    } else {
      sendStatus("Could not run dfu-programmer! Please report this as a bug!", true);
      sendStatus("<br>Debugging information:<br>", false);
      sendStatus(error, false);
      sendStatus("stdout:", false);
      writeStatus(stdout);
      sendStatus("stderr:", false);
      writeStatus(stderr);
      sendStatus("dfu location:", false);
      writeStatus(dfu_location);
    }
  });
});

function openAboutDialog() {
  bootbox.alert({
    size: "small",
    title: "About",
    message: `QMK Firmware Flasher version ${app.getVersion()}`
    //TODO: Display information about open source licenses
  });
}

function openOptions() {
  optionsModal.modal('show');
}

function loadOptionsState() {
  bringToFrontCheckbox.prop('checked', ipcRenderer.sendSync('get-setting-focus-window-on-hex-change'));
}

function checkFile(filename = pathField.val()) {
    if (filename.slice(-4).toUpperCase() == '.HEX') {
        return true;
    } else {
        sendStatus("Invalid firmware file: " + filename, true);
        return false;
    }
}

function checkFileSilent(filename = pathField.val()) {
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
      hexChangedFlashButton = hexChangedModal.find("[data-bb-handler='confirm']");
    });
  }
}

function loadHex(filename) {
  if(watcher) watcher.close();
  // Load a file and prepare to flash it.
  if(!checkFile(filename)) {
    return;
  }

  pathField.val(filename);
  clearStatus();


  enableButton(flashButton);

  if (bootloader_ready) {
    setFlashButtonImmediate();
  } else {
    sendStatus("Press RESET on your keyboard's PCB.", true);
    flashButton.text(flashWhenReadyButtonText);
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
  flashButton.text(flashImmediatelyButtonText);
  if(hexChangedFlashButton){
    hexChangedFlashButton.text(flashImmediatelyButtonText);
  }
}

function setFlashButtonWhenReady() {
  flashButton.text(flashWhenReadyButtonText);
  if(hexChangedFlashButton){
    hexChangedFlashButton.text(flashWhenReadyButtonText);
  }
}

function handleFlashButton() {
    if(flashButton.text() == flashImmediatelyButtonText){
        clearStatus();
        flashFirmware();
    } else {
        if(!checkFile()) return;
        flash_when_ready = true;
        clearStatus();
        sendStatus("The firmware will flash as soon as the keyboard is ready to receive it.", false);
        sendStatus("Press the RESET button to prepare the keyboard.", false);
        disableButton(flashButton);
    }
}

function clearStatus() {
  statusBox.text('');
  simpleStatus.text('');
}

function writeStatus(text) {
  statusBox.append(text);
  statusBox.scrollTop(statusBox.scrollHeight);
}

function sendStatus(text, simple) {
  // Write a line to the status window.
  // Always writes to the advanced window. If simple is true it will write
  // to the simple window as well.
  writeStatus('<b>' + text + "</b>\n");
  if (simple) {
    simpleStatus.append('<b>' + text + "</b>\n");
    simpleStatus.scrollTop(simpleStatus.scrollHeight);
  }
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
  disableButton(flashButton);
  sendHex(pathField.val(), function (success) {
      if (success) {
          sendStatus("Flashing complete!", true);
      } else {
          sendStatus("An error occurred - please try again.", true);
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

/*
var escapeShell = function(cmd) {
  return ''+cmd.replace(/(["\s'$`\\\(\)])/g,'\\$1')+'';
};
*/

function eraseChip(callback) {
  sendStatus('dfu-programmer atmega32u4 erase --force', false);
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
  sendStatus('dfu-programmer atmega32u4 flash ' + file, false);
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
  sendStatus('dfu-programmer atmega32u4 reset', false);
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
        if (!bootloader_ready && checkFileSilent()) clearStatus();
        bootloader_ready = true;
        if (checkFileSilent()) {
          enableButton(flashButton);
          setFlashButtonImmediate();
          if(flash_when_ready) {
            flashFirmware();
          }
        }
      } else {
        bootloader_ready = false;
        if(checkFileSilent()) {
          if(!flash_when_ready){
            enableButton(flashButton);
          }
          setFlashButtonWhenReady();
        } else {
          setFlashButtonImmediate();
          disableButton(flashButton);
        }
      }
    });
  }
  window.setTimeout(checkForBoard, 5000);
}
