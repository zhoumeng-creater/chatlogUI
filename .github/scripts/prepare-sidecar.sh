#!/usr/bin/env bash
set -euo pipefail

target="${1:?target triple is required}"
mode="${2:-check}"

out_dir="src-tauri/binaries"
mkdir -p "$out_dir"

node_bin="${NODE_BIN:-}"
if [[ -z "$node_bin" ]]; then
  if command -v node >/dev/null 2>&1; then
    node_bin="node"
  elif command -v node.exe >/dev/null 2>&1; then
    node_bin="node.exe"
  else
    echo "::error::Node.js is required to verify sidecar artifact provenance"
    exit 1
  fi
fi

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

if [[ "$mode" == "release" ]]; then
  "$node_bin" scripts/verify-sidecar-artifacts.mjs --target "$target" --mode "$mode" --stage-dir "$out_dir"
else
  "$node_bin" scripts/verify-sidecar-artifacts.mjs --target "$target" --mode "$mode"
fi

if [[ -d "cmd/chatlog" ]]; then
  echo "Building sidecar target=${target} mode=${mode} source=cmd/chatlog destination=${binary_path}"
  GOOS="$goos" GOARCH="$goarch" go build -trimpath -ldflags="-s -w" -o "$binary_path" ./cmd/chatlog
elif [[ -s "$binary_path" ]]; then
  echo "Using existing sidecar target=${target} mode=${mode} destination=${binary_path}"
elif [[ "$mode" == "check" ]]; then
  echo "::warning::cmd/chatlog is missing and ${binary_path} was not found; creating CI-only check-mode placeholder"
  printf 'CI placeholder for %s\n' "$target" > "$binary_path"
else
  echo "::error::Missing approved sidecar source or checksum-verified artifact for ${target}; refusing release packaging"
  exit 1
fi

if [[ "$target" != *windows* ]]; then
  chmod +x "$binary_path"
fi

if command -v sha256sum >/dev/null 2>&1; then
  checksum="$(sha256sum "$binary_path" | awk '{print $1}')"
else
  checksum="$(shasum -a 256 "$binary_path" | awk '{print $1}')"
fi
echo "Sidecar prepared target=${target} mode=${mode} destination=${binary_path} sha256=${checksum}"

if [[ "$mode" == "release" ]]; then
  "$node_bin" scripts/verify-sidecar-artifacts.mjs --target "$target" --mode "$mode" --stage-dir "$out_dir"
else
  "$node_bin" scripts/verify-sidecar-artifacts.mjs --target "$target" --mode "$mode"
fi
