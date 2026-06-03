# Privacy Audit Checklist

Use this checklist for each P4/P5 release candidate before publishing release artifacts.

## Candidate

- Date:
- App version:
- App commit:
- Sidecar version/source:
- Release candidate tag:
- Operator:
- Reviewer:

## Required Checks

- [ ] Fixtures are synthetic and `pnpm fixtures:check` passed.
- [ ] Browser screenshots are synthetic or privacy-masked.
- [ ] Diagnostics export is user-triggered.
- [ ] Logs do not contain raw `dataKey`, API keys, updater private keys, signing keys, tokens, local DB paths, or private chat content.
- [ ] Updater failures and sidecar failures are recorded as redacted diagnostics.
- [ ] Generated updater metadata contains signatures but no signing private key material.
- [ ] Tauri CSP and capabilities stayed minimal; any change is documented in release evidence.
- [ ] No telemetry or automatic diagnostic upload was added.
- [ ] Release notes do not contain private local paths, endpoint payloads, screenshots with real data, or real message snippets.
- [ ] Packaged diagnostics artifact was reviewed after the current build.

## Result

- Status: `release-blocked`
- Notes: P5-C/D guardrails are implemented, but release publish is blocked until sidecar provenance, updater manifest evidence, packaged smoke refresh, and this checklist are completed for a concrete release candidate.
