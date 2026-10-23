#!/usr/bin/env bash
# Attach the webOS inspector to Haven on the TV (prints a DevTools URL). Same DEVICE / env.sh as install.sh.
here="$(cd "$(dirname "$0")" && pwd)"
[[ -f "$here/../env.sh" ]] && . "$here/../env.sh"
ares-inspect -d "${DEVICE:?set DEVICE to your ares-setup-device name}" com.gathin.tvhome
