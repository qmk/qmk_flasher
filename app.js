window.$ = window.jQuery = require('jquery');

const fs = require('fs');
const app = require('electron').remote.app;
const dialog = require('electron').remote.dialog;
const execFile = require('child_process').execFile;
const path = require('path');
const chokidar = require('chokidar');
const bootstrap = require('bootstrap');
const bootbox = require('bootbox');

let dfu_location = path.normalize('dfu/dfu-programmer');
let watcher;

// State variables
let bootloader_ready = false;
let flash_in_progress = false;
let flash_when_ready = false;

//HTML entities
let flashButton = $('#flash-hex');
let loadButton = $('#load-file');
let pathField = $('#file-path');
let statusBox = $('#status');
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
    dfu_location = path.resolve(app.getAppPath(), dfu_location);
}

$(document).ready(function() {
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
    if(flashButton.text() == flashImmediatelyButtonText){
        flashFirmware();
    } else {
        if(!checkFile()) return;
        flash_when_ready = true;
        disableButton(flashButton);
    }
  });

  // Ready to go
  execFile(dfu_location, ['--version'], function(error, stdout, stderr) {
    if (stderr.indexOf('dfu-programmer') > -1) {
      window.setTimeout(checkForBoard, 10);
      sendStatus("Select a firmware file by clicking 'Choose .hex' or drag and drop a file onto this window.");
    } else {
      sendStatus("Could not run dfu-programmer! Please report this as a bug!");
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


function checkFile(filename = pathField.val()) {
    if (filename.slice(-4).toUpperCase() == '.HEX') {
        return true;
    } else {
        sendStatus("Invalid firmware file: " + filename);
        return false;
    }
}

function checkFileSilent(filename = pathField.val()) {
    if (filename.slice(-4).toUpperCase() == '.HEX') {
        return true;
    } else {
        return false;
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
    sendStatus("Press RESET on your keyboard's PCB.");
    flashButton.text(flashWhenReadyButtonText);
  }

  watcher = chokidar.watch(filename, {});
  watcher.on('change', path => {
    var confirmButtonText;
    if(bootloader_ready) confirmButtonText = "Flash";
    else confirmButtonText = "Flash When Ready";

    const hexChangedModal = bootbox.confirm({
      message: "The hex file has changed. Would you like to flash the new version?",
      buttons: {
        confirm: {
          label: confirmButtonText,
          className: 'btn-success'
        },
        cancel: {
          label: 'OK'
        }
      },
      callback: function(result) {
        if(result) {
        }
      }
    });

    hexChangedModal.init(function() {
        hexChangedFlashButton = hexChangedModal.find("[data-bb-handler='confirm']");
    });
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
}

function setFlashButtonWhenReady() {
    flashButton.text(flashWhenReadyButtonText);
}

function clearStatus() {
  statusBox.text('');
}

function writeStatus(text) {
  statusBox.append(text);
  statusBox.scrollTop(statusBox.scrollHeight);
}

function sendStatus(text) {
  writeStatus('<b>' + text + "</b>\n");
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
          sendStatus("Flashing complete!");
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

/*
var escapeShell = function(cmd) {
  return ''+cmd.replace(/(["\s'$`\\\(\)])/g,'\\$1')+'';
};
*/

function eraseChip(callback) {
  sendStatus('dfu-programmer atmega32u4 erase --force');
  execFile(dfu_location, ['atmega32u4', 'erase', '--force'], function(error, stdout, stderr) {
    sendStatus(error);
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
  execFile(dfu_location, ['atmega32u4', 'flash', file], function(error, stdout, stderr) {
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
  execFile(dfu_location, ['atmega32u4', 'reset'], function(error, stdout, stderr) {
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
    execFile(dfu_location, ['atmega32u4', 'get', 'bootloader-version'], function(error, stdout, stderr) {
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
