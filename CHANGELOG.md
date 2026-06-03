# Changelog

## Unreleased

### Added

- P5-A/B source/UI gates: synthetic fixture validation, local mock backend, browser E2E, visual regression, and accessibility scripts.
- P5-C/D release guardrails: sidecar artifact provenance manifest, sidecar verifier, updater manifest checker, CI gate ordering, and release governance docs.

### Changed

- Release workflow now creates draft releases by default and requires source/UI gates before target packaging.
- Release-mode sidecar preparation now fails before packaging unless provenance is approved in `scripts/release/sidecar-artifacts.json`.

### Release Status

- Source/UI gates are implemented.
- Packaged release readiness remains blocked until sidecar provenance, generated updater metadata, packaged smoke refresh, and release privacy audit are completed for a concrete release candidate.
