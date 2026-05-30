# chatlogUI AI Development Workflow

This workflow is optimized for Codex App + opencode.

## The operating model

Do not run the project as a long free-form chat. Run it as a small engineering system:

```text
AGENTS.md
  → Spec Kit constitution/spec/plan/tasks
  → task branch or git worktree
  → implementation with one clear acceptance target
  → spec review
  → code quality review
  → verification commands
  → PR or local merge
```

## Recommended tool split

Use Codex App for:

- parallel worktrees
- visual UI iteration
- Git diff review
- PR-style implementation threads
- larger reasoning and review

Use opencode for:

- local terminal work
- fast debugging
- project commands
- read-only exploration through Plan/Explore agents
- repeatable slash commands in `.opencode/commands`

Use Spec Kit for:

- turning broad productization goals into durable spec/plan/tasks
- preventing Codex/opencode from guessing product intent
- aligning implementation with acceptance criteria

## First-time setup

```bash
git checkout master
git pull
git checkout -b chore/agent-workflow-foundation

# Add .worktrees/ and other local outputs to .gitignore.
cat .gitignore-additions.txt >> .gitignore

# Install dependencies and verify the current baseline.
pnpm install
pnpm verify
cd src-tauri && cargo test
```

If baseline fails, do not immediately patch. Create `docs/agent-workflow/baseline-report.md` with:

- command run
- exact failure
- likely layer
- whether it is pre-existing
- first root-cause hypothesis

## Spec Kit installation

Recommended persistent install:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z
specify version
```

Use the latest release tag from `github/spec-kit`.

Inside `chatlogUI`, initialize or install the Codex integration first:

```bash
specify init . --integration codex --script sh --ignore-agent-tools
```

On Windows PowerShell:

```powershell
specify init . --integration codex --script ps --ignore-agent-tools
```

Why Codex first: Codex integration installs Spec Kit skills into `.agents/skills`, and opencode can also load skills from `.agents/skills`.

If you want native opencode Spec Kit files later, run it in a worktree and inspect diffs first:

```bash
specify integration list
specify integration install opencode --force
```

## Daily loop

1. Pick one task from `specs/000-productization/tasks.md`.
2. Create a branch or worktree.
3. Start with a plan, not edits.
4. Implement only the task scope.
5. Run the task-specific verification.
6. Run review commands or subagents.
7. Finish the branch through PR or local merge.

## Branch naming

```text
chore/agent-workflow-foundation
fix/boot-sidecar-health
feat/dashboard-data-wiring
feat/chat-search-mvp
feat/semantic-qa-panel
feat/graph-mvp
polish/apple-ui-pass
release/package-smoke
```

## Quality gates

Minimum for any code change:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

When sidecar/Tauri changed:

```bash
cd src-tauri && cargo test
pnpm tauri build
```

When UI changed:

- `/`
- `/dashboard`
- `/settings`
- loading state
- empty state
- error state
- success state
- desktop width
- narrow width

## No-go rules

- Do not rewrite `chatlog_alpha` from the UI repo.
- Do not bypass L2 by fetching directly from L1/L3.
- Do not log secrets or private chat content.
- Do not broaden CSP or Tauri permissions casually.
- Do not merge after failing verification.
