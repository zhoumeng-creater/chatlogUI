#!/usr/bin/env bash
set -euo pipefail

target="${1:?target triple is required}"
mode="${2:-check}"

out_dir="src-tauri/binaries"
mkdir -p "$out_dir"

binary_name="chatlog_alpha-${target}"
goos=""
goarch=""

case "$target" in
  x86_64-pc-windows-msvc)
    binary_name="${binary_name}.exe"
    goos="windows"
    goarch="amd64"
    ;;
  x86_64-apple-darwin)
    goos="darwin"
    goarch="amd64"
    ;;
  aarch64-apple-darwin)
    goos="darwin"
    goarch="arm64"
    ;;
  x86_64-unknown-linux-gnu)
    goos="linux"
    goarch="amd64"
    ;;
  aarch64-unknown-linux-gnu)
    goos="linux"
    goarch="arm64"
    ;;
  *)
    echo "::error::Unsupported sidecar target: ${target}"
    exit 1
    ;;
esac

binary_path="${out_dir}/${binary_name}"

if [[ -d "cmd/chatlog" ]]; then
  echo "Building sidecar ${binary_name}"
  GOOS="$goos" GOARCH="$goarch" go build -trimpath -ldflags="-s -w" -o "$binary_path" ./cmd/chatlog
elif [[ -s "$binary_path" ]]; then
  echo "Using existing sidecar ${binary_path}"
elif [[ "$mode" == "check" ]]; then
  echo "::warning::cmd/chatlog is missing and ${binary_path} was not found; creating CI-only placeholder"
  printf 'CI placeholder for %s\n' "$target" > "$binary_path"
else
  echo "::error::Missing sidecar source cmd/chatlog and non-empty ${binary_path}; refusing to publish an empty sidecar"
  exit 1
fi

if [[ "$target" != *windows* ]]; then
  chmod +x "$binary_path"
fi
