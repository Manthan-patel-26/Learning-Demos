# Day 2: Git Advanced Workflows & Collaboration

**Date:** February 12, 2026 | **Learning Time:** 2.5 hours

> ⚠️ **Note:** Git is a tool, not a language — there's no "code" to build here.
> Instead, this README gives you a **hands-on simulation** of a real team workflow,
> exactly as a Senior Developer would do it. Follow every step in your terminal.

---

## 🎯 What You'll Simulate

A real team scenario: you and a "teammate" work on the same feature branch, create
conflicts, resolve them, clean up history with interactive rebase, and write a
professional pull request description.

---

## 🚀 Step-by-Step: Senior Git Workflow

### PHASE 1: Setup (One-Time)

```bash
# 1. Configure your identity (required for commits)
git config --global user.name "Your Name"
git config --global user.email "you@example.com"

# 2. Set default branch name to `main` (modern standard)
git config --global init.defaultBranch main

# 3. Set VS Code as your diff/merge tool (optional but helpful)
git config --global core.editor "code --wait"
git config --global merge.tool vscode
git config --global mergetool.vscode.cmd 'code --wait $MERGED'

# 4. Useful aliases (type these once, use forever)
git config --global alias.lg "log --oneline --graph --all --decorate"
git config --global alias.st "status -s"
git config --global alias.co "checkout"
git config --global alias.unstage "reset HEAD --"
```

---

### PHASE 2: Create a Project (Simulating a Team Repo)

```bash
# Create a fresh project
mkdir git-workflow-demo && cd git-workflow-demo
git init
npm init -y

# Create initial files
echo "# E-Commerce API" > README.md
mkdir -p src
echo 'export const API_VERSION = "v1";' > src/config.ts
echo 'export function getUsers() { return []; }' > src/users.ts

# Create a .gitignore (ALWAYS do this first!)
cat > .gitignore << 'IGNORE'
node_modules/
dist/
.env
.env.local
*.log
.DS_Store
coverage/
IGNORE

# First commit - always on main
git add .
git commit -m "chore: initial project setup"

# Tag this as v1.0.0 (semantic versioning)
git tag -a v1.0.0 -m "Initial release"
```

---

### PHASE 3: Feature Branch Workflow (GitHub Flow)

```bash
# RULE: NEVER commit directly to main
# Always create a feature branch

# Create and switch to a feature branch
git checkout -b feature/user-authentication

# Make changes simulating real work
cat >> src/users.ts << 'CODE'

export type User = { id: string; email: string; role: string; };

export function createUser(data: Omit<User, 'id'>): User {
  return { id: Date.now().toString(), ...data };
}
CODE

# Commit with a CONVENTIONAL COMMIT message
# Format: type(scope): description
# Types: feat, fix, docs, style, refactor, test, chore
git add src/users.ts
git commit -m "feat(auth): add User type and createUser function"

# More changes
echo 'export function hashPassword(pw: string) { return pw; }' >> src/auth.ts
git add src/auth.ts
git commit -m "feat(auth): add password hashing utility"

# Simulate a small fix while on the feature branch
echo '// TODO: use bcrypt' >> src/auth.ts
git add src/auth.ts
git commit -m "chore(auth): add TODO for bcrypt implementation"
```

---

### PHASE 4: Simulating a Teammate's Changes (Creating a Conflict)

```bash
# Your teammate pushed to main while you were working.
# Simulate this by switching to main and making changes.

git checkout main

# Teammate modified the same file
cat >> src/users.ts << 'CODE'

// Added by teammate
export function deleteUser(id: string): boolean {
  console.log(`Deleting user ${id}`);
  return true;
}
CODE

git add src/users.ts
git commit -m "feat(users): add deleteUser function"
```

---

### PHASE 5: Resolving Merge Conflicts (The Right Way)

```bash
# Switch back to your feature branch
git checkout feature/user-authentication

# Option A: Merge main into your branch (creates a merge commit)
# Use when: you want to preserve branch history
git merge main

# If there's a conflict, Git marks it in the file:
# <<<<<<< HEAD (your changes)
# =======  (separator)
# >>>>>>> main (their changes)

# Open the file and manually resolve:
# - Keep both changes
# - Remove the conflict markers (<<<, ===, >>>)
# Then:
git add src/users.ts
git commit -m "merge: resolve conflict with main users.ts"

# Option B: Rebase (PREFERRED for feature branches)
# Use when: you want a clean linear history
# (undo the merge first if you did Option A)
# git rebase main
# Then resolve conflicts the same way, but:
# git add src/users.ts && git rebase --continue
```

---

### PHASE 6: Interactive Rebase - Clean Up Your Commits

```bash
# Before pushing, clean up your 3 messy commits into 1 clean commit.
# Count your commits since branching from main:
git log --oneline main..HEAD

# Start interactive rebase for last 3 commits
git rebase -i HEAD~3

# Your editor opens. You'll see:
# pick abc1234 feat(auth): add User type and createUser function
# pick def5678 feat(auth): add password hashing utility
# pick ghi9012 chore(auth): add TODO for bcrypt implementation

# Change to:
# pick abc1234 feat(auth): add User type and createUser function
# squash def5678 feat(auth): add password hashing utility
# fixup ghi9012 chore(auth): add TODO for bcrypt implementation

# `squash` = merge into previous commit, combine messages
# `fixup`  = merge into previous commit, DISCARD message (for tiny fixes)
# `reword` = keep the commit but change its message
# `drop`   = delete the commit entirely

# Save the file. A new editor opens for the combined commit message.
# Write a clean final message:
# feat(auth): implement user authentication core
#
# - Add User type with id, email, role fields
# - Add createUser factory function
# - Add password hashing utility (TODO: replace with bcrypt)
```

---

### PHASE 7: Git Hooks - Automation for Quality

```bash
# Git hooks run automatically at certain points.
# They live in .git/hooks/

# Create a pre-commit hook that runs TypeScript type checking
cat > .git/hooks/pre-commit << 'HOOK'
#!/bin/sh
echo "Running type check before commit..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
  echo "❌ TypeScript errors found. Fix them before committing."
  exit 1
fi
echo "✅ Type check passed."
HOOK

chmod +x .git/hooks/pre-commit

# Create a commit-msg hook that enforces conventional commits
cat > .git/hooks/commit-msg << 'HOOK'
#!/bin/sh
COMMIT_MSG=$(cat "$1")
PATTERN="^(feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert)(\(.+\))?: .{1,100}$"
if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
  echo "❌ Commit message must follow Conventional Commits format."
  echo "   Example: feat(auth): add login endpoint"
  echo "   Types: feat|fix|docs|style|refactor|test|chore|perf|ci|build|revert"
  exit 1
fi
echo "✅ Commit message format is valid."
HOOK

chmod +x .git/hooks/commit-msg
```

---

### PHASE 8: Write a Professional Pull Request

A great PR description follows this template:

```markdown
## What does this PR do?

Implements the core authentication module for the user system.
Adds User type definitions, a createUser factory, and a password
hashing utility as the foundation for the full auth flow.

## Why is it needed?

Resolves issue #42: Users cannot currently be created or authenticated.
This is a prerequisite for the login endpoint (tracked in #43).

## Changes Made

- `src/users.ts`: Added `User` type and `createUser()` factory function
- `src/auth.ts`: Added `hashPassword()` utility (placeholder for bcrypt)

## How to Test

1. `npm install`
2. `npm run type-check` — should have 0 errors
3. Test createUser: `npx ts-node -e "import {createUser} from './src/users'; console.log(createUser({email:'a@b.com',role:'user'}))"`

## Checklist

- [x] No TypeScript errors (`npm run type-check`)
- [x] Follows conventional commits
- [x] No secrets or `.env` files committed
- [x] PR title follows: `feat(auth): implement user authentication core`

## Screenshots / Output

(paste terminal output here)
```

---

### PHASE 9: Danger Zones & Recovery

```bash
# SCENARIO: You accidentally committed a secret
echo 'DB_PASSWORD=supersecret123' >> .env
git add .env && git commit -m "oops"

# Remove the file from ALL history (nuclear option)
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env" \
  --prune-empty --tag-name-filter cat -- --all

# Modern alternative (faster):
# brew install git-filter-repo
# git filter-repo --path .env --invert-paths

# After removing: force push ALL branches (coordinate with team!)
git push origin --force --all

# Also: immediately rotate/change the exposed secret!
# Then add .env to .gitignore so it never happens again.

# ─────────────────────────────────────────────
# SCENARIO: Detached HEAD recovery
git checkout abc1234   # TypeScript drops you into "detached HEAD"
# You make commits here - they'll be LOST when you checkout another branch!
# Recovery:
git branch recovery-branch  # Save your work to a named branch FIRST
git checkout main
git merge recovery-branch   # Then merge it

# ─────────────────────────────────────────────
# SCENARIO: Fix last commit (before pushing)
git commit --amend -m "fix: corrected commit message"
# Also add forgotten files:
git add forgotten-file.ts
git commit --amend --no-edit

# ─────────────────────────────────────────────
# SCENARIO: Undo last commit but KEEP the changes
git reset HEAD~1         # Unstaged
git reset --soft HEAD~1  # Staged (ready to re-commit)
# NEVER use --hard unless you want to lose changes permanently

# ─────────────────────────────────────────────
# SCENARIO: Force push safely (when needed after rebase)
# NEVER: git push --force (overwrites others' work!)
# ALWAYS: git push --force-with-lease (fails if others pushed)
git push --force-with-lease origin feature/user-authentication
```

---

## ⚠️ Senior-Level Rules to Follow ALWAYS

| Rule                               | Why                                                |
| ---------------------------------- | -------------------------------------------------- |
| Never `git push --force` to `main` | Overwrites teammates' work permanently             |
| Use `--force-with-lease` instead   | Fails safely if remote has new commits             |
| Never commit to `main` directly    | Use PRs so code gets reviewed                      |
| Use `git rebase -i` before PRs     | Keeps history clean and readable                   |
| Always add `.env` to `.gitignore`  | Secrets in git history = security breach           |
| Use conventional commits           | Enables automated changelogs (semantic-release)    |
| Squash WIP commits before merging  | "WIP", "fix typo", "oops" don't belong in history  |
| Sign your commits with GPG         | `git config commit.gpgsign true` — proves it's you |

---

## ✅ Self-Check Questions

1. What's the difference between `git merge` and `git rebase`? When do you use each?
2. What does `--force-with-lease` do that `--force` doesn't?
3. You committed `config/secrets.json` 3 commits ago. How do you remove it from ALL history?
4. What is "Detached HEAD" state and how do you recover from it?
5. Explain why `git rebase -i HEAD~5` can be dangerous if already pushed.
6. What's the difference between `squash` and `fixup` in interactive rebase?
