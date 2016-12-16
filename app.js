global.$ = $;

var fs = require('fs');
var process = require('process');
var app = require('electron').remote.app;
var dialog = require('electron').remote.dialog;
var execFile = require('child_process').execFile;
var path = require('path');

// Allow the app to control the window
const {BrowserWindow} = require('electron').remote
var win = BrowserWindow.getFocusedWindow();

// State variables
var bootloader_ready = false;
var flash_in_progress = false;
var flash_when_ready = false;
var ui_mode = 'simple';

//HTML entities
let flashButton = $('#flash-hex');
let fwrButton = $('#flash-when-ready');
let loadButton = $('#load-file');
let pathField = $('#file-path');
let statusBox = $('#status');
let simple_tab = $('#simple');
let expert_tab = $('#expert');
let expertFeatures = $('#expert-features');
let simpleStatus = $('#simple-status');

// Figure out the path to dfu-programmer
var dfu_location = path.normalize('dfu/dfu-programmer');

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
    if(!checkFile()) return;
    flash_when_ready = true;
    disableButton(fwrButton);
  });

  // Ready to go
  execFile(dfu_location, ['--version'], function(error, stdout, stderr) {
    if (stderr.indexOf('dfu-programmer') > -1) {
      window.setTimeout(checkForBoard, 10);
      msg = "Select a firmware file by clicking 'Choose .hex' or drag and drop a file onto this window.";
      sendStatus(msg);
      sendSimpleStatus(msg);
    } else {
      sendStatus("Could not run dfu-programmer! Please report this as a bug!");
      sendSimpleStatus("Could not run dfu-programmer! Please report this as a bug!");
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
        sendSimpleStatus("Invalid firmware file: " + filename);
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
  // Load a file and prepare to flash it.
  if(!checkFile(filename)) {
    return;
  }

  pathField.val(filename);
  clearStatus();

    if (bootloader_ready) {
      enableButton(flashButton);
    } else {
      sendStatus("Press RESET on your keyboard's PCB.");
      sendSimpleStatus("Press RESET on your keyboard's PCB.");
      showFwrButton();
    }
}

function disableButton(button) {
    button.attr('disabled', 'disabled');
    button.removeClass('btn-success');
    button.addClass('btn-secondary');
}


function enableButton(button) {
    button.removeAttr('disabled');
    button.removeClass('btn-secondary');
    button.addClass('btn-success');
}

function showFwrButton() {
  fwrButton.removeClass('invisible');
}

function hideFwrButton() {
  fwrButton.addClass('invisible');
  enableButton(fwrButton);
}

function clearStatus() {
  statusBox.text('');
  simpleStatus.text('');
}

function writeStatus(text) {
  statusBox.append(text);
  statusBox.scrollTop(statusBox.scrollHeight);
}

function sendStatus(text) {
  writeStatus('<b>' + text + "</b>\n");
}

function sendSimpleStatus(text) {
  simpleStatus.append('<b>' + text + "</b>\n");
  simpleStatus.scrollTop(simpleStatus.scrollHeight);
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
  hideFwrButton();
  sendHex(pathField.val(), function (success) {
      if (success) {
          sendStatus("Flashing complete!");
          sendSimpleStatus("Flashing complete!");
      } else {
          sendStatus("An error occurred - please try again.");
          sendSimpleStatus("An error occurred - please try again.");
      }
  });
}

function sendHex(file, callback) {
  sendSimpleStatus("Flash in progress, please wait...");
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

// This function has some logic that might be redundant. It should be examined more closely and simplified if possible.
function checkForBoard() {
  if (!flash_in_progress) {
    execFile(dfu_location, ['atmega32u4', 'get', 'bootloader-version'], function(error, stdout, stderr) {
      if (stdout.indexOf("Bootloader Version:") > -1) {
        if (!bootloader_ready && checkFileSilent()) clearStatus();
        bootloader_ready = true;
        if (checkFileSilent()) {
          enableButton(flashButton);
          hideFwrButton();
          if(flash_when_ready) {
            flashFirmware();
          }
        }
      } else {
        bootloader_ready = false;
        disableButton(flashButton);
        if(checkFileSilent()) showFwrButton();
      }
    });
  }
  window.setTimeout(checkForBoard, 5000);
}
