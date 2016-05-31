#!/bin/sh
# Build a distributable windows package on a Linux or OS X host
#
# Once you have built this copy the zip file to a windows host with NSIS
# installed and use firmware_flasher.win32.nsi to build a .exe installer.
set -x

plat=win32
arch=ia32
output_dir=~/"QMK Firmware Flasher"
package_dir="QMK Firmware Flasher-$plat-$arch"
zip_file="${package_dir}.zip"

rm -r "$output_dir/$package_dir" "$zip_file"
electron-packager . --platform=$plat --arch=$arch --out "$output_dir" --prune
cp firmware_flasher.win32.nsi "${output_dir}/${package_dir}"
( cd "$output_dir" && zip -r "$zip_file" "$package_dir" )
