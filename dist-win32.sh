#!/bin/sh
# Build a distributable windows package
set -x

plat=win32
arch=x64
output_dir=~/"QMK Firmware Flasher"
package_dir="QMK Firmware Flasher-$plat-$arch"
zip_file="${package_dir}.zip"

rm -r "$output_dir/$package_dir" "$zip_file"
electron-packager . --platform=$plat --arch=$arch --out "$output_dir" --prune
( cd "$output_dir" && zip -r "$zip_file" "$package_dir" )
