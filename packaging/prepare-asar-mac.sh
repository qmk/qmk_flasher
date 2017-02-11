#!/bin/bash

PARENTDIR=`dirname "$0"`

cd ${PARENTDIR}/../dist/mac
cp QMK Firmware Flasher.app/Contents/Resources/app.asar mac-${npm_package_version}.asar