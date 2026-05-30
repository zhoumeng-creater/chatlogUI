# chatlogUI Agent Workflow Kit

Copy these files into the root of `chatlogUI`.

Suggested install:

```bash
cd /path/to/chatlogUI
git checkout master
git pull
git checkout -b chore/agent-workflow-foundation

# Unzip this kit into the repo root.
unzip /path/to/chatlogUI-agent-workflow-kit.zip -d .

# Add local worktree ignores.
cat .gitignore-additions.txt >> .gitignore

# Make scripts executable.
chmod +x scripts/verify-local.sh scripts/sidecar-smoke.sh

git add AGENTS.md .gitignore .gitignore-additions.txt opencode.json \
  .agents/skills .opencode docs/agent-workflow specs/000-productization scripts \
  README-WORKFLOW-KIT.md

git commit -m "chore: add AI development workflow foundation"
```

Then initialize Spec Kit:

```bash
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git@vX.Y.Z
specify version
specify init . --integration codex --script sh --ignore-agent-tools
```

Use the latest `github/spec-kit` release tag in place of `vX.Y.Z`.

For Windows PowerShell:

```powershell
specify init . --integration codex --script ps --ignore-agent-tools
```

Recommended first command to Codex/opencode after setup:

```text
Use chatlog-debug, sidecar-integration, and app-productization.
Do not modify files.
Run a baseline audit and produce docs/agent-workflow/baseline-report.md.
```
