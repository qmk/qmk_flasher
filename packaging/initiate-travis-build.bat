@echo off
setlocal EnableDelayedExpansion
curl -X POST -H "Content-Type: application/x-www-form-urlencoded" -H "Accept: application/json" -H "Travis-API-Version: 3" -H "Authorization: token %TRAVIS_TOKEN%" -d '{"request"={"branch":"master"}}' "https://api.travis-ci.org/repo/NoahAndrews%%2Fqmk_firmware_flasher/requests"
