---
description: Evidence-driven bugfix workflow for chatlogUI
agent: build
---

Current git status:

!`git status --short`

Use AGENTS.md and the chatlog-debug skill.

Bug or failing command:

$ARGUMENTS

Required:
1. reproduce or identify exact failure
2. classify failing layer
3. find a similar working pattern
4. state one root-cause hypothesis
5. make the smallest fix
6. run the narrow verification
7. report changed files and results

Do not bundle unrelated fixes.
