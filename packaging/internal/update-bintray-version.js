const fs = require('fs');
const path = require('path');

const bintrayJsonPath = path.resolve(__dirname, "bintray-travis.json");

let bintrayJson = fs.readFileSync(bintrayJsonPath, "utf8");

let bintrayObj = JSON.parse(bintrayJson);

bintrayObj.version.name = process.env.npm_package_version;

fs.writeFileSync(bintrayJsonPath, JSON.stringify(bintrayObj, null, 2));