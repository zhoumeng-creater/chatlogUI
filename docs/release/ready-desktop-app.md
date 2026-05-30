# Ready Desktop App Release Notes And Evidence

Date: 2026-05-30
Branch/worktree: `codex/p2-b-comprehensive-remediation`

## Status

P2-B comprehensive remediation verification passed on this branch/worktree. This is still not a final release-ready claim for the whole product because P2-C/P2-D/P2-E and installer smoke on a clean Windows profile remain follow-up gates.

## Required Release Gate

- `pnpm verify`: PASS, including 133 tests across 21 files.
- `cd src-tauri && cargo test`: PASS, 16 Rust tests.
- `pnpm tauri build`: PASS, produced MSI and NSIS bundles.
- Manual Windows x64 clean-profile install/quit/reopen smoke from `specs/001-ready-desktop-app/quickstart.md`: still required before final release-ready signoff.

## Current Evidence To Recheck

- Privacy: conversation rows and stats top senders now mask visible text, `aria-label`, and avatar `alt` text when privacy mode is enabled.
- Long history: transcript rendering uses virtual rows through `@tanstack/react-virtual`.
- Search: invalid, cancelled, empty, error, loading, ready, and navigation-notice states are represented in L2 state and UI.
- Setup/settings credentials: password fields are form-scoped.
- Dev server: canonical frontend URL is `http://localhost:5173`; HMR websocket is `5174`; sidecar stays on `5030`.
- Asset polish: `public/favicon.svg` is linked from `index.html`.
- Browser smoke: `/`, `/workbench`, and `/settings` had no horizontal overflow at 1440, 1180, 900, 768, and 390 px. Password inputs were form-scoped at all tested widths.
- Synthetic long-history smoke: 10,000 messages produced 18 virtual rows / 17 message rows in a constrained transcript container.

## Caveats

- `GraphModule` may still exceed Vite's default 500 kB chunk warning. It is lazy-loaded, but P2-D must either reduce or explicitly accept the measured lazy chunk.
- P2-C must finish settings/diagnostics polish and redaction consistency beyond the P2-B core workbench path.
- P2-E must produce repeatable browser screenshot and accessibility evidence before release.
- macOS packaging remains a follow-up unless explicitly verified; Windows x64 is the first delivery target.
- The ignored sidecar binary must exist locally before Rust/Tauri verification; this worktree used the local `src-tauri/binaries/chatlog_alpha-x86_64-pc-windows-msvc.exe` for tests and build, without adding it to git.
