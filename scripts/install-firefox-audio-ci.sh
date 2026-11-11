#!/usr/bin/env bash
set -euo pipefail

# Use Ubuntu's signed HTTPS archive for this runner's audio dependencies.
sources="${RUNNER_TEMP:?}/firefox-audio.sources"
. /etc/os-release
test "$VERSION_CODENAME" = noble
cat > "$sources" <<'EOF'
Types: deb
URIs: https://archive.ubuntu.com/ubuntu/
Suites: noble noble-updates noble-backports
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg

Types: deb
URIs: https://security.ubuntu.com/ubuntu/
Suites: noble-security
Components: main restricted universe multiverse
Signed-By: /usr/share/keyrings/ubuntu-archive-keyring.gpg
EOF

apt_options=(
  -o "Dir::Etc::sourcelist=$sources"
  -o Dir::Etc::sourceparts=-
  -o Acquire::Retries=1
  -o Acquire::https::Timeout=12
)
packages=(pulseaudio pulseaudio-utils libavcodec60)

sudo timeout --kill-after=10s 120s apt-get "${apt_options[@]}" -o APT::Update::Error-Mode=any update
sudo timeout --kill-after=10s 120s apt-get "${apt_options[@]}" --download-only -y install "${packages[@]}"
sudo apt-get "${apt_options[@]}" --no-download -y install "${packages[@]}"
