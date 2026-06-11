# Advanced Capabilities Acceptance Checklist

This checklist separates source/UI evidence from packaged release evidence for P4/P5 work.

## Contract Fixtures

- [x] Synthetic fixture manifest exists.
- [x] Mock route map exists.
- [x] `pnpm fixtures:check` validates route references and privacy markers.
- [x] Advanced capability fixture families cover success and edge/failure states.

## Browser E2E

- [x] `pnpm e2e` covers core workbench, settings, media/SNS, Developer DB/API/Hook/MCP, AI preview, Graph visualization, privacy, and narrow overflow checks.
- [x] Mock backend binds local-only and fails on occupied `5030` instead of killing unknown listeners.

## Visual Regression

- [x] `pnpm e2e:visual` covers synthetic desktop/narrow visual states.
- [x] Screenshots use synthetic or privacy-masked data only.

## Accessibility

- [x] `pnpm e2e:a11y` covers axe critical/serious checks and keyboard reachability.
- [x] Privacy mode is included in accessible text scanning.

## Privacy Diagnostics

- [x] Diagnostics helpers redact private markers before storage/export.
- [x] Developer diagnostics avoid raw SQL, response bodies, media keys, SNS proxy queries, Hook event content, MCP raw arguments, semantic store paths, and graph evidence text.
- [ ] Release-candidate privacy audit is completed in `docs/release/privacy-audit.md`.

## Sidecar Artifact And Updater

- [x] Sidecar artifact manifest exists at `scripts/release/sidecar-artifacts.json`.
- [x] Check-mode sidecar verification exists.
- [x] Release-mode sidecar verification fails without approved provenance.
- [x] Release-mode sidecar verification can stage HTTPS URL artifacts only after SHA-256 verification.
- [x] Updater manifest/signature checker exists.
- [x] Release workflow verifies updater metadata per matrix platform.
- [x] Concrete Windows x64 candidate has checksum-verified sidecar artifact and pinned CI source ref.
- [ ] Concrete release candidate has generated updater manifest evidence.

## Platform Packaged Smoke

- [x] Historical Windows x64 P2-E packaged smoke passed on 2026-06-01.
- [ ] Windows packaged smoke refreshed after P4/P5 advanced changes.
- [x] Current Step 10 direct release executable smoke launched, closed, reopened, and closed from a temporary profile without sidecar residue.
- [x] macOS Intel smoke completed or recorded as platform caveat.
- [x] macOS Apple Silicon smoke completed or recorded as platform caveat.
- [x] Linux smoke completed or recorded as platform caveat.

## Evidence And Signoff

- [x] Source/UI evidence is recorded in `specs/chatlogui-specs-hidden-for-ci-repro/001-ready-desktop-app/release-evidence.md`.
- [x] P5-C/D governance docs exist under `docs/release/`.
- [ ] Release evidence bundle names app commit, app version, sidecar source/checksum, installer checksums, updater artifact checksums, generated update JSON checksum, packaged smoke result, privacy audit result, and caveats.
- [ ] Release owner signoff completed.
