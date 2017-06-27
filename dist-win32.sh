#!/bin/sh
# Build a distributable windows package on a Linux or OS X host
#
# Once you have built this copy the zip file to a windows host with NSIS
# installed and use qmk_flasher.win32.nsi to build a .exe installer.

plat=win32
arch=ia32
if [ -f ./dist-common.sh ]; then
        . ./dist-common.sh
else
        echo '*** This must be run from the top-level qmk_flasher directory!'
        exit 1
fi

if [ "$(uname)" = "Darwin" ]; then
	if ! which wine 2>&1 > /dev/null; then
		if ! brew --version 2>&1 > /dev/null; then
			echo '*** Homebrew not detected!'
			echo 'Please install homebrew so we can install wine.'
			echo 'You may also install wine yourself.'
			exit 1
		fi

		if ! brew ls --versions wine 2>&1 > /dev/null; then
			brew install wine || exit
		fi
	fi
fi

# Build the package
electron-packager ./ --platform=$plat --arch=$arch \
	--asar.unpackDir='**/{dfu,node_modules/fsevents}' \
	--icon=build/windows.ico \
	--out "$output_dir" \
	--overwrite=true \
	--prune \
	--ignore 'dist/win32'
cp build/windows.ico qmk_flasher.win32.nsi "${output_dir}/${package_dir}"

# Zip up the package
( 
	cp LICENSE.md "$output_dir"/"$package_dir"
	cd "$output_dir"
	mv "$package_dir/LICENSE $package_dir/LICENSE.electron.txt"
	zip -y -r "$zip_file" "$package_dir"
)
check_zip
