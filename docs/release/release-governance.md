# Release Governance Runbook

This runbook governs P5-C/D release candidates. It extends `docs/release/ready-desktop-app.md`; it does not replace the Windows packaged smoke evidence already recorded for P2-E.

## Evidence States

| State | Meaning |
| --- | --- |
| `source-ui-verified` | Source, fixture, browser, visual, a11y, unit, and build gates passed against synthetic data. |
| `packaged-smoke-verified` | An installed or launched package passed app-managed sidecar lifecycle smoke. |
| `release-artifact-verified` | Sidecar provenance, installer artifacts, updater metadata, signatures, and checksums were verified. |
| `platform-caveat` | A platform build exists but lacks smoke, signing, notarization, or runtime evidence. |
| `release-blocked` | A required gate failed or has not been supplied. |

## Release Candidate Preparation

1. Confirm the working tree contains no real private fixtures, local DB files, logs, binaries, or secrets intended for commit.
2. Run source/UI gates:

   ```powershell
   pnpm fixtures:check
   pnpm e2e
   pnpm e2e:visual
   pnpm e2e:a11y
   pnpm verify
   ```

3. Run Rust/Tauri gates:

   ```powershell
   Push-Location src-tauri
   cargo test
   Pop-Location
   pnpm tauri build
   ```

4. Run release artifact gates:

   ```powershell
   pnpm release:check:sidecar:release
   pnpm release:check:updater
   ```

5. Complete the privacy audit in `docs/release/privacy-audit.md`.
6. Update `CHANGELOG.md` before creating the GitHub draft release.

## CI Verification

`build-check.yml` separates source/UI gates from cross-platform package compile checks:

- `source-ui-quality`: fixture validation, browser E2E, visual, a11y, and `pnpm verify`.
- `check`: target matrix package compile checks using check-mode sidecar preparation.

`release.yml` is gated by the same source/UI job. Each release target must pass release-mode sidecar provenance before packaging. The workflow creates draft releases by default so artifact evidence and packaged smoke can be reviewed before publish.

## Updater Manifest Gate

The updater manifest checker expects generated Tauri updater metadata, not hand-written JSON.

Required evidence:

- app version and release tag
- updater public key source
- manifest URL
- platform entries
- artifact names
- embedded signature content
- checksum for generated `latest.json`

The release is blocked if a required platform is missing, a signature is empty, a signature points to a `.sig` file instead of embedded content, or a platform URL has no matching artifact in the evidence directory.

The checker can discover generated `latest.json` files under `src-tauri/target` and the release workflow verifies each matrix target with its own Tauri platform key. It records SHA-256 evidence for both `latest.json` and the matched local artifact.

The release workflow pins `tauri-apps/tauri-action` to `action-v0.6.2` instead of the moving `v0` tag.

## Platform Smoke

Windows x64 remains the required local packaged smoke for the current release gate:

- install generated package
- launch without terminal
- confirm app-managed `/health`
- quit and confirm sidecar cleanup
- reopen and confirm restored readiness state
- occupy `127.0.0.1:5030` with an unknown listener and confirm recoverable conflict
- export diagnostics and confirm redaction

macOS and Linux must be recorded as `platform-caveat` until signing/notarization/runtime smoke is actually completed.

## Rollback And Update Disabling

- Keep updater enablement gated by `VITE_ENABLE_UPDATER=true` in release builds.
- If updater metadata is wrong or signatures cannot be verified, keep the release as draft or mark the release non-updatable in evidence.
- Do not publish a replacement `latest.json` by hand. Regenerate and verify it.
- If a bad release is already published, draft a rollback note in `CHANGELOG.md`, remove or replace the broken update metadata, and record the incident in release evidence.

## Ownership

- Sidecar provenance owner: release operator for the current candidate.
- Updater signing owner: project owner or designated signer with access to signing secrets.
- Privacy audit owner: release reviewer who did not supply the sidecar artifact.
- Evidence owner: release operator.
