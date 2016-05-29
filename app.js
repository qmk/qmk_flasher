global.$ = $;

var remote = require('remote');
var Menu = remote.require('menu');
var dialog = remote.require('dialog');
var sys = remote.require('sys');
var exec = remote.require('child_process').exec;
var bootloader_ready = false;
var flash_in_progress = false;

$(document).ready(function() {
  /* Handle drag-n-drop events
   */
  $(document).on('dragenter dragover', function(e) {
    e.preventDefault();
    e.stopPropagation();
  });

  $(document).on('drop', function(e) {
    e.preventDefault();
    e.stopPropagation();

    var file = e.originalEvent.dataTransfer.files[0];
    loadHex(file.path);
  });

  /* Bind actions to our buttons
   */
  $('#flash-hex').attr('disabled','disabled');
  $('#close-window-button').bind('click', function (event) {
    window.close();
  });
  $('#load-file').bind('click', function (event) {
    loadHex(loadFile());
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

  /* Ready to go
   */
  window.setTimeout(checkForBoard, 10);
  sendStatus("Select a firmware file by clicking 'Choose .hex' or drag and drog a file onto this window.");
});

function loadHex(filename) {
  /* Load a file and prepare to flash it.
   */
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
  writeStatus(text + "\n");
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

function dfu_folder() {
  return escapeShell(__dirname + "/dfu/");
};

function dfu_location() {
 if (process.platform == "win32") {
  return "dfu-programmer.exe";
 } else {
  return "./dfu-programmer";
 }
};

var escapeShell = function(cmd) {
  return ''+cmd.replace(/(["\s'$`\\\(\)])/g,'\\$1')+'';
};

function eraseChip(callback) {
  var command = dfu_location() + " atmega32u4 erase --force";
  sendStatus("<b>" +command + "</b>");
  exec(command, {cwd: dfu_folder()},
    function(error, stdout, stderr) {
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
  var command = dfu_location() + " atmega32u4 flash " + file;
  sendStatus("<b>" +command + "</b>");
  exec(command, {cwd: dfu_folder()},
    function(error, stdout, stderr) {
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
  var command = dfu_location() + " atmega32u4 reset";
  sendStatus("<b>" +command + "</b>");
  exec(command, {cwd: dfu_folder()},
    function(error, stdout, stderr) {
    writeStatus(stdout);
    writeStatus(stderr);
    if (stderr.indexOf("no device present") > -1) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

function checkForBoard() {
  if (flash_in_progress) {
    window.setTimeout(checkForBoard, 10000);
  } else {
    var command = dfu_location() + " atmega32u4 get bootloader-version";
    exec(command, {cwd: dfu_folder()}, function(error, stdout, stderr) {
      if (stdout.indexOf("Bootloader Version:") > -1) {
        if (!bootloader_ready && $('#file-path').val() != "") clearStatus();
        bootloader_ready = true;
        if ($('#file-path').val() != "") enableButtons();
        window.setTimeout(checkForBoard, 10000);
      } else {
        bootloader_ready = false;
        disableButtons();
        window.setTimeout(checkForBoard, 1000);
      }
    });
  }
}
