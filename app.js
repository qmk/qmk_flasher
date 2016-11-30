global.$ = $;

var fs = require('fs');
var process = require('process');
var app = require('electron').remote.app;
var dialog = require('electron').remote.dialog;
var execFile = require('child_process').execFile;

var dfu_location = 'dfu/dfu-programmer';

// State variables
var bootloader_ready = false;
var flash_in_progress = false;
var flash_when_ready = false;


//HTML entities
let flashButton = $('#flash-hex');
let fwrButton = $('#flash-when-ready');
let loadButton = $('#load-file');
let pathField = $('#file-path');
let statusBox = $('#status');

if (process.platform == "win32") {
  dfu_location = dfu_location + '.exe'
}

fs.access(dfu_location, fs.F_OK, function(err) {
  if (err) {
    // Running in deployed mode, use the app copy
    var dfu_location = app.getAppPath() + '/' + dfu_location;
  }
});

$(document).ready(function() {
  // Handle drag-n-drop events
  $(document).on('dragenter dragover', function(event) {
    event.preventDefault();
    event.stopPropagation();
  });

  $(document).on('drop', function(event) {
    event.preventDefault();
    event.stopPropagation();

    var file = event.originalEvent.dataTransfer.files[0];
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
      flashFirmware();
  });
  fwrButton.bind('click', function (event) {
    flash_when_ready = true;
    disableFwrButton();
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
    }
  });
});

function loadHex(filename) {
  // Load a file and prepare to flash it.
  if (filename.slice(-4) != '.hex') {
    sendStatus("Invalid firmware file: " + filename);
    return;
  }

  pathField.val(filename);
  clearStatus();

    if (bootloader_ready) {
      enableFlashButton();
    } else {
      sendStatus("Press RESET on your keyboard's PCB.");
      showFwrButton();
    }
}

function disableFlashButton() {
    flashButton.attr('disabled','disabled');
}

function enableFlashButton() {
  if (bootloader_ready && pathField.val() != "" && !flash_in_progress) {
      flashButton.removeAttr('disabled');
  }
}

function showFwrButton() {
  fwrButton.removeClass('invisible');
  fwrButton.removeAttr('disabled');
}

function disableFwrButton() {
  fwrButton.attr('disabled', 'disabled');
}

function hideFwrButton() {
  fwrButton.addClass('invisible');
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
    disableFlashButton();
    hideFwrButton();
    sendHex(pathField.val(), function (success) {
        if (success) {
            sendStatus("Flashing complete!");
        } else {
            sendStatus("An error occured - please try again.");
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
};

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
    var regex = /.*Success.*\r?\n|\rChecking memory from .* Empty.*/;
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
        if (!bootloader_ready && pathField.val() != "") clearStatus();
        bootloader_ready = true;
        if (pathField.val() != "") {
          if(flash_when_ready) {
            flashFirmware();
          }
        } enableFlashButton();
      } else {
        bootloader_ready = false;
        disableFlashButton();
      }
    });
  }
  window.setTimeout(checkForBoard, 5000);
}
