#!/usr/bin/env bash
# Repackage Haven (the launcher, app id com.gathin.tvhome) and reinstall only it, after the first full setup with
# ./install.sh. Needs `npm ci` in lumen/ and DEVICE set to your ares-setup-device name; env.sh at the repo root
# (gitignored) is sourced if present. The Home Helper (native/) and its recovery path are not touched.
# Use lumen/inspect.sh separately to check the page live.
set -euo pipefail
here="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$here/../env.sh" ]] && . "$here/../env.sh"
: "${DEVICE:?set DEVICE to your ares-setup-device name}"
cd "$here"
node test.js
node marks.js
cd ..
rm -f dist/com.gathin.tvhome_*_all.ipk
ares-package launcher renewal-service -o dist
ares-install -d "$DEVICE" dist/com.gathin.tvhome_*_all.ipk
ares-launch -d "$DEVICE" com.gathin.tvhome
echo "Installed. (Run lumen/inspect.sh to attach the inspector for checks.)"
