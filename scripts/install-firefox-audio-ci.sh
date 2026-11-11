#!/usr/bin/env bash
set -euo pipefail

# Use Ubuntu's signed HTTPS archive for this runner's audio dependencies.
sources="${RUNNER_TEMP:?}/firefox-audio.sources"
sed -E \
  -e 's|https?://(azure\.)?archive\.ubuntu\.com/ubuntu/?|https://archive.ubuntu.com/ubuntu/|g' \
  -e 's|https?://security\.ubuntu\.com/ubuntu/?|https://security.ubuntu.com/ubuntu/|g' \
  /etc/apt/sources.list.d/ubuntu.sources > "$sources"

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
