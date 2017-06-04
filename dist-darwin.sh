#!/bin/sh

plat=darwin
arch=x64
if [ -f ./dist-common.sh ]; then
	. ./dist-common.sh
else
	echo '*** This must be run from the top-level qmk_firmware_flasher directory!'
	exit 1
fi

# Build the macOS package
echo '*** Building macOS package'
electron-packager ./ --platform=$plat --arch=$arch \
	--asar.unpackDir='**/{dfu,node_modules/fsevents}' \
	--osx-sign=false \
	--icon=build/icon.iconset \
	--out="$output_dir" \
	--overwrite=true \
	--prune

# Zip up the OSX package
echo '*** Creating package archive.'
(
	cp LICENSE.md "$output_dir"/"$package_dir"
	cd "$output_dir"/"$package_dir"
	mv LICENSE LICENSE.electron.txt
	zip -y -r "../$zip_file" 'QMK Flasher.app' \
		LICENSE.md LICENSE.electron.txt LICENSES.chromium.html
)
check_zip
