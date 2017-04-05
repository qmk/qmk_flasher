This directory contains various assets that are packaged at build time.
Particularly of note is the application's icon.

# Icon

The source file for the icon is icon.svg. This is a vector image scaled to
512 pixels wide. From this we generate a windows icon and a mac icon.

## Windows Icon

The windows icon (icon.ico) was created using this tool:

    <https://www.icoconverter.com>

## Mac Icon

The Mac icon (icon.icns) is built from files in Icon.iconset. We need the following
resolutions and filenames, and only these files:

* 128x128: icon.iconset/icon_128x128.png
* 16x16: icon.iconset/icon_16x16.png
* 256x256: icon.iconset/icon_256x256.png
* 32x32: icon.iconset/icon_32x32.png
* 64x64: icon.iconset/icon_32x32@2x.png
* 512x512: icon.iconset/icon_512x512.png
* 1024x1024: icon.iconset/icon_512x512@2x.png

To create these files you can export from Adobe Illustrator. Use these
settings:

[!illustrator-export-settings.png]

Once the files have been exported you can run the `make_icns` scripts. This 
will move the exported files into the location that iconutil expects, and
then generate icon.iconset.
