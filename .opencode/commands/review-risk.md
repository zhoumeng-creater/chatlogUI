---
description: Read-only risk review before merge
agent: plan
---

Use AGENTS.md.

Review the current branch for:

1. spec/acceptance gaps
2. architecture violations
3. sidecar contract changes
4. secret/privacy risks
5. UI state gaps
6. test gaps
7. release/package risks

Do not modify files.

Current status:

!`git status --short`

Return findings by severity:
- Blocker
- Important
- Nice-to-have
