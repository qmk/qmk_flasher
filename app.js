global.$ = $;

var remote = require('remote');
var Menu = remote.require('menu');
var dialog = remote.require('dialog');
var sys = remote.require('sys');
var exec = remote.require('child_process').exec;

$(document).ready(function() {  
  $('#flash-hex').attr('disabled','disabled');
  sendStatus("Ready to work!\n");
  $('#close-window-button').bind('click', function (event) {
    window.close();
  });
  $('#load-file').bind('click', function (event) {
    $("#file-path").val(loadFile());
    enableButtons();
  });
  $('#flash-hex').bind('click', function (event) {
    disableButtons();
    sendHex($("#file-path").val(), function(success) {
      enableButtons();
      if (success) {
        sendStatus("Flashing complete!\n");
      } else {
        sendStatus("An error occured - please try again.\n");
      }
    });
  });
  $('#reset').bind('click', function (event) {
    disableButtons();
    resetChip(function(success) {
      enableButtons();
      if (success) {
        sendStatus("Reset complete!\n");
      } else {
        sendStatus("An error occured - please try again.\n");
      }
    });
  });
});

function disableButtons() {
  $('#flash-hex').attr('disabled','disabled');
  $('#reset').attr('disabled','disabled');
}

function enableButtons() {
  if ($('#file-path').val() != "")
    $('#flash-hex').removeAttr('disabled');
  $('#reset').removeAttr('disabled');
}

function sendStatus(text) {
  $('#status').append(text);
  $('#status').scrollTop($('#status')[0].scrollHeight);
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
};

function dfu_folder() {
 if (process.platform == "win32") {
  return escapeShell(__dirname);
 } else {
  return escapeShell(__dirname + "/usr/local/bin/");
 }
};

function dfu_location() {
 if (process.platform == "win32") {
  return "./dfu-programmer.exe";
 } else {
  return "./dfu-programmer";
 }
};

var escapeShell = function(cmd) {
  return ''+cmd.replace(/(["\s'$`\\\(\)])/g,'\\$1')+'';
};

function eraseChip(callback) {
  var command = dfu_location() + " atmega32u4 erase --force";
  sendStatus(command + "\n");
  exec(command, {cwd: dfu_folder()},
    function(error, stdout, stderr) {
    sendStatus(stdout);
    sendStatus(stderr);
    if (stderr.indexOf("no device present") > -1) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

function flashChip(file, callback) {
  var command = dfu_location() + " atmega32u4 flash " + file;
  sendStatus(command + "\n");
  exec(command, {cwd: dfu_folder()},
    function(error, stdout, stderr) {
    sendStatus(stdout);
    sendStatus(stderr);
    if (stderr.indexOf("no device present") > -1) {
      callback(false);
    } else {
      callback(true);
    }
  });
}

function resetChip(callback) {
  var command = dfu_location() + " atmega32u4 reset";
  sendStatus(command + "\n");
  exec(command, {cwd: dfu_folder()},
    function(error, stdout, stderr) {
    sendStatus(stdout);
    sendStatus(stderr);
    if (stderr.indexOf("no device present") > -1) {
      callback(false);
    } else {
      callback(true);
    }
  });
}