@echo off
setlocal EnableDelayedExpansion

set body={"request":{"branch":"master"}}

curl -s -X POS -H "Content-Type: application/json" -H "Accept: application/json" -H "Travis-API-Version: 3" -H "Authorization: token %TRAVIS_TOKEN%" -d "%body%" https://api.travis-ci.org/repo/NoahAndrews%2Fqmk_firmware_flasher/requests
