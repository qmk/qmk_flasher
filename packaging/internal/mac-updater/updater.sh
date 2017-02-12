#!/bin/bash

PARENTDIR=`dirname "$0"`

echo Waiting for the firmware flasher to exit.

while pgrep -x "QMK Firmware Flasher" > /dev/null; do
    sleep 1
done

#cd $PARENTDIR/resou
# Figure out where this script will be located.