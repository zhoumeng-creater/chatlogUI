# Ready Desktop App Test Data Policy

## Purpose

This policy closes the ready-desktop-app fixture gap and anchors all current and future tests in synthetic data. The desktop app handles local private WeChat data, so tests, screenshots, diagnostics, release notes, and fixtures must never be cut from a user's real chat database.

## Policy

- Test data must be synthetic, deterministic, and safe to commit.
- Test data must use explicit labels such as `synthetic: true`, `fixturePurpose`, and `privacyNotes` when stored as a fixture file.
- Tests may include secret-like strings only when the test purpose is redaction, and those values must be clearly named as synthetic redaction cases.
- Fixtures must not contain real message bodies, real contact names, real group names, real avatars, real local paths, real media files, real database files, raw `dataKey`, API keys, tokens, or provider credentials.
- Diagnostics and screenshots may show aggregate counts, readiness states, endpoint families, and redaction status, but not private content.
- Any generated package or export that cannot prove redaction must fail closed.

## Relationship To Advanced Capabilities

P4/P5 advanced capability fixtures extend this policy in `specs/002-advanced-capabilities/test-data-policy.md`. The ready desktop policy remains the baseline for setup, service lifecycle, core workbench states, diagnostics, and release evidence.

## Required Checks

Before committing fixture changes, run scans targeted at real-looking secrets and paths. Redaction fixtures may intentionally contain synthetic markers, so scans should distinguish synthetic test cases from real user material.

Recommended checks:

```powershell
rg -n "sk-live|sk-proj|Bearer [A-Za-z0-9]{20,}" specs e2e
rg --pcre2 -n "C:\\Users\\(?!Synthetic)|WeChat Files\\(?!wxid_synthetic|Synthetic)" specs e2e
rg --pcre2 -n "dataKey\\s*[:=]\\s*(?!synthetic|\\*+)" specs e2e
```
