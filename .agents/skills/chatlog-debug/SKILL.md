---
name: chatlog-debug
description: Use for any chatlogUI bug, build failure, boot failure, sidecar failure, failing test, or unexpected UI behavior. Requires root-cause evidence before fixes.
---

# chatlog-debug

## Purpose

Debug `chatlogUI` without guessing. Use this before applying fixes.

## Process

1. Reproduce the issue.
2. Capture the exact command, route, or user action.
3. Read the full error output.
4. Classify the failing layer:
   - L1 route/view
   - L2 commander/store/diplomat
   - L3 molecule
   - L4 UI/network/system atom
   - Tauri/Rust
   - chatlog_alpha sidecar
   - build/tooling
   - packaging/release
5. Find a similar working pattern in the repo.
6. State one root-cause hypothesis.
7. Apply the smallest fix that tests the hypothesis.
8. Run the narrow verification.
9. Run broader verification if shared code changed.

## Hard rules

- No fixes without a root-cause hypothesis.
- Do not bundle unrelated improvements.
- Do not change sidecar API contract unless the task explicitly requires it.
- Do not log dataKey, API keys, tokens, secrets, or private chat content.
- If three different fixes fail, stop and reassess architecture instead of patching again.

## Report format

```text
Issue:
Reproduction:
Failing layer:
Evidence:
Root-cause hypothesis:
Fix:
Verification:
Remaining risk:
```
