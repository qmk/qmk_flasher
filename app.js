global.$ = $;

var fs = require('fs');
var process = require('process');
var app = require('electron').remote.app;
var dialog = require('electron').remote.dialog;
var execFile = require('child_process').execFile;

var bootloader_ready = false;
var flash_in_progress = false;
var dfu_location = 'dfu/dfu-programmer';

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
  $('#flash-hex').attr('disabled','disabled');
  $('#close-window-button').bind('click', function (event) {
    window.close();
  });
  $('#load-file').bind('click', function (event) {
    loadHex(loadFile()[0]);
  });
  $('#flash-hex').bind('click', function (event) {
    disableButtons();
    sendHex($("#file-path").val(), function(success) {
      if (success) {
        sendStatus("Flashing complete!");
      } else {
        sendStatus("An error occured - please try again.");
      }
    });
  });
  $('#reset').bind('click', function (event) {
    disableButtons();
    resetChip(function(success) {
      enableButtons();
      if (success) {
        sendStatus("Reset complete!");
      } else {
        sendStatus("An error occured - please try again.");
      }
    });
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

  $("#file-path").val(filename);
  enableButtons();
  clearStatus();

  if (!bootloader_ready) sendStatus("Press RESET on your keyboard's PCB.");
}

function disableButtons() {
  $('#flash-hex').attr('disabled','disabled');
  $('#flash-hex').css('background-color', 'red');
  $('#flash-hex').css('color', 'black');
}

function enableButtons() {
  if (bootloader_ready && $('#file-path').val() != "") {
    $('#flash-hex').removeAttr('disabled');
    $('#flash-hex').css('background-color', 'green');
    $('#flash-hex').css('color', 'white');
  }
}

function clearStatus() {
  $('#status').text('');
}

function writeStatus(text) {
  $('#status').append(text);
  $('#status').scrollTop($('#status')[0].scrollHeight);
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

function sendHex(file, callback) {
  flash_in_progress = true;
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
    if (stderr.indexOf("no device present") > -1) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

function flashChip(file, callback) {
  sendStatus('dfu-programmer atmega32u4 flash ' + file);
  execFile(dfu_location, ['atmega32u4', 'flash', file], function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
    if (stderr.indexOf("no device present") > -1) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

function resetChip(callback) {
  sendStatus('dfu-programmer atmega32u4 reset');
  execFile(dfu_location, ['atmega32u4', 'reset'], function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
	if (stderr.indexOf("Validating...  Success") == -1) {
	  callback(false);
    } else {
      callback(true);
    }
  });
}

function checkForBoard() {
  if (!flash_in_progress) {
    execFile(dfu_location, ['atmega32u4', 'get', 'bootloader-version'], function(error, stdout, stderr) {
      if (stdout.indexOf("Bootloader Version:") > -1) {
        if (!bootloader_ready && $('#file-path').val() != "") clearStatus();
        bootloader_ready = true;
        if ($('#file-path').val() != "") enableButtons();
      } else {
        bootloader_ready = false;
        disableButtons();
      }
    });
  }
  window.setTimeout(checkForBoard, 10000);
}
