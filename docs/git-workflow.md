# Git Workflow

## Branch Strategy

```
main
  └── develop
        └── sprint-XX        ← one per sprint
              └── feat/...   ← optional task-level branches within a sprint
```

### Branch Roles

| Branch | Purpose | Who merges into it |
|---|---|---|
| `main` | Production-ready, released code | Merge from `develop` at sprint end via PR |
| `develop` | Integration branch — always stable, always deployable | Merge from `sprint-XX` via PR |
| `sprint-XX` | All sprint work lands here | Direct commits or `feat/` sub-branches |
| `feat/task-name` | Optional — isolate a large task within a sprint | Merge into `sprint-XX` |

---

## Sprint Lifecycle

### Starting a new sprint

> **Rule: always branch from `develop`, never from `main` or a previous sprint branch.**

```bash
# 1. Switch to develop and pull the latest merged work
git checkout develop
git pull origin develop

# 2. Create and push the new sprint branch
git checkout -b sprint-05        # replace XX with the sprint number
git push -u origin sprint-05
```

The sprint branch is now ready. All work for the sprint goes on this branch.

### During the sprint
Work directly on the sprint branch for most tasks:
```bash
git checkout sprint-04
# ... make changes ...
git add <files>
git commit -m "feat(invoices): add PI to CI conversion endpoint"
git push
```

For large or risky tasks, use a feature sub-branch:
```bash
git checkout -b feat/shipping-bill-status-machine
# ... work ...
git push -u origin feat/shipping-bill-status-machine
# Open PR into sprint-04 when done
```

### End of sprint — merge into develop
1. Open a PR: `sprint-04` → `develop`
2. PR title: `Sprint 4: Export Documentation`
3. PR description: link to `docs/product/sprints/sprint-04.md`
4. Squash-merge or regular merge (team preference)
5. Delete the sprint branch after merge

### Release to production
1. Open a PR: `develop` → `main`
2. PR title: `Release vX.Y — Sprint N complete`
3. Tag the commit: `git tag v0.3.0`

---

## Commit Message Convention

Format: `type(scope): short description`

| Type | When to use |
|---|---|
| `feat` | New feature or endpoint |
| `fix` | Bug fix |
| `chore` | Config, dependencies, tooling |
| `docs` | Documentation only |
| `refactor` | Code change, no behaviour change |
| `test` | Adding or updating tests |
| `style` | Formatting, linting (no logic change) |

**Examples:**
```
feat(proforma): add PI version control and revision endpoint
fix(exchange-rate): replace upsert with findFirst to handle null tenantId
chore(deps): upgrade prisma to 6.2
docs(sprint-03): add packing list task detail
test(auth): add unit tests for JWT refresh token rotation
```

---

## PR Checklist

Before opening a PR, verify:

- [ ] Branch is up to date with target (`develop` or `sprint-XX`)
- [ ] `pnpm build` passes with no TypeScript errors
- [ ] No `.env` files or secrets committed
- [ ] Meaningful commit messages (see convention above)
- [ ] Sprint doc updated if new tasks were added or scope changed
- [ ] Backlog updated if issues were deferred

---

## Branch Naming

| Pattern | Example |
|---|---|
| Sprint branch | `sprint-03`, `sprint-04` |
| Feature sub-branch | `feat/doc-number-service` |
| Bug fix branch | `fix/exchange-rate-null-upsert` |
| Chore / infra | `chore/prisma-migration-sprint3` |

---

## Current Branch State

| Branch | Status | Notes |
|---|---|---|
| `main` | ✅ Sprints 1 + 2 complete | Initial commit |
| `develop` | ✅ Sprints 1–4 complete | Sprint 4 PR merged 2026-02-20 |
| `sprint-03` | ✅ Merged into sprint-04 | Superseded — safe to delete |
| `sprint-04` | ✅ Merged into develop | PDF generation, admin panel |
| `sprint-05` | 🔄 In progress | Unit test infrastructure + coverage |