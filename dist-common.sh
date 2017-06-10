#!/bin/sh

output_dir=dist/$plat
package_dir="QMK Flasher-$plat-$arch"
version_number=$(awk '/"version":/ {print $2}' package.json | cut -f 2 -d '"')
zip_file="${package_dir}-${version_number}.zip"
CSC_IDENTITY_AUTO_DISCOVERY=false

export CSC_IDENTITY_AUTO_DISCOVERY

check_zip() {
	if [ -f "$output_dir/$zip_file" ]; then
		echo '*** Package creation successful!'
	else
		echo '*** Package creation failed! No such file:'
		echo -e "\t$output_dir/$zip_file"
	fi
}

# Make sure our environment is setup properly
if [ -d "$output_dir" -o -d "dist" ]; then
	echo '*** About to wipe out the '"$output_dir"' and "dist" directory.'
	echo '*** You have 10 seconds to press Ctrl-C!'
	for i in 10 9 8 7 6 5 4 3 2 1; do
		echo "*** $i"
		sleep 1
	done
	rm -r "$output_dir" "dist"
fi

if ! [ -d dfu -a -d src ]; then
	echo '*** This must be run from the top-level qmk_firmware_flasher directory!'
	exit 1
fi

if [ $(($(date +%s) - $(stat -f %c node_modules))) -gt 3600 ]; then
	npm uninstall -g electron-packager
fi
echo '*** About to wipe out the "node_modules" directory.'
echo '*** You have 5 seconds to press Ctrl-C!'
for i in 5 4 3 2 1; do
	echo "*** $i"
	sleep 1
done
rm -r node_modules

if ! npm list -g electron-packager 2>&1 > /dev/null; then
	echo '*** Installing prerequisite electron-packager globally.'
	npm install -g electron-packager || exit
fi

echo '*** Installing all node dependencies locally.'
npm install
