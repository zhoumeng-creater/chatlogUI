# Privacy Audit Checklist

Use this checklist for each P4/P5 release candidate before publishing release artifacts.

## Candidate

- Date: 2026-06-12
- App version: `0.1.0`
- App commit: `8b2970afc366c551e95166612a7ca95f61f8f697`
- Sidecar version/source: `github.com/zhoumeng-creater/chatlog_alpha@5b979cc666418c41467b1f9959cfdc6b3abbb86b`; Windows artifact SHA-256 `c48551dc4a93f8387260ae826ddb5498aaf88e80f34d2b39355660f3585ed9af`
- Release candidate tag: not created
- Operator: Codex
- Reviewer: not completed

## Required Checks

- [x] Fixtures are synthetic and `pnpm fixtures:check` passed.
- [x] Browser screenshots are synthetic or privacy-masked.
- [x] Diagnostics export is user-triggered in the source/Rust/UI contract.
- [x] Logs and fixtures scanned by current automated gates did not expose raw `dataKey`, API keys, updater private keys, signing keys, tokens, local DB paths, or private chat content.
- [x] Updater failures and sidecar failures are represented through redacted release/diagnostic states in current tests and docs.
- [ ] Generated updater metadata contains signatures but no signing private key material. Blocked because current local updater artifact generation failed without `TAURI_SIGNING_PRIVATE_KEY`.
- [x] Tauri CSP and capabilities stayed minimal; no Step 10 CSP/capability change was made.
- [x] No telemetry or automatic diagnostic upload was added.
- [x] Release notes and evidence added in Step 10/Step 11 do not contain private local paths, endpoint payloads, screenshots with real data, or real message snippets.
- [x] Step 11 added `pnpm release:scan:diagnostics -- <file>` so packaged diagnostics artifacts can be scanned without echoing sensitive matched text.
- [ ] Packaged diagnostics artifact was reviewed after the current build. Source/browser/Rust privacy evidence passed and the scanner exists, but current packaged diagnostics export was not rerun.

## Result

- Status: `release-blocked`
- Notes: Step 11 completed current source/Rust/package gates, Windows sidecar checksum verification, installer artifact inventory, and diagnostics scan tooling. Release publish remains blocked until signed updater metadata, installer-level smoke, packaged conflict smoke, packaged diagnostics export review, and owner signoff are completed for a concrete release candidate.
