#!/usr/bin/env bash
set -euo pipefail

pnpm lint
pnpm typecheck
pnpm test
pnpm build

if [ -d src-tauri ]; then
  (cd src-tauri && cargo test)
fi
