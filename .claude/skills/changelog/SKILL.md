---
name: changelog
description: Write the CHANGELOG.md section for the next release from the commits
  on the current branch that are not yet in main. Use when preparing a release,
  when the user asks to update or generate the changelog, or when the 🚀 Release
  workflow rejects a version because its CHANGELOG section is missing.
---

# changelog

The `🚀 Release` workflow refuses to publish a version whose `## X.Y.Z` section
is missing from `CHANGELOG.md` (`scripts/changelog-section.js` exits non-zero).
This skill writes that section.

The changelog is **prose written for users of the published `@lafken/*`
packages**, not a commit log. Most commits never appear in it.

## 1. Collect the commits

The base is **the last released version tag**, not a branch:

```bash
BASE=$(git tag --sort=-v:refname | grep -E '^[0-9]+\.[0-9]+\.[0-9]+$' | head -1)
git log --no-merges --pretty=format:'%h %s' "$BASE"..HEAD
```

Two details make the obvious alternatives wrong here:

- **Keep the `^[0-9]+\.[0-9]+\.[0-9]+$` filter.** The repo used to carry 82
  leftover tags from an older scheme — per-package (`@lafken/api@0.1.1`) and
  branch-shaped (`push`, `s3-file`) — which made a bare
  `git tag --sort=-v:refname | head -1` return `s3-file`. They were deleted in
  September 2026, but the filter also rejects a future pre-release tag
  (`0.16.0-beta.0`), which is not a base for the next changelog.
- **`main` can lag behind what is published.** At the time of writing, `0.14.4`
  was tagged and live on npm while `origin/main` sat four commits behind local
  `main`. A tag records what actually shipped; a branch records what someone
  remembered to push.

Cross-check and warn the user if the two disagree:

```bash
git rev-list --count "$BASE"..main   # 0 means main is at the last release
```

Merge commits are always excluded — this repo merges feature branches, so
`--no-merges` matters.

## 2. Decide the version

Release branches are named after the version (`feat/0.15.0`, `release/0.14.1`),
so read it from the branch name:

```bash
git branch --show-current
```

If the branch name has no version in it, ask the user. Never invent one, and
never reuse a version that already has a tag (`git tag | grep X.Y.Z`).

## 3. Keep only what users see

Map by conventional-commit type:

| Type | Section |
|---|---|
| `feat` | `### Minor Changes` |
| `fix`, `perf` | `### Patch Changes` |
| `chore`, `docs`, `ci`, `test`, `refactor`, `style` | **excluded** |
| any type with `!` or a `BREAKING CHANGE:` footer | `### Major Changes` |

Type is necessary but not sufficient. **A change that does not reach a published
package is excluded even when typed `feat` or `fix`.** Check what a commit
actually touched when the scope does not name a package:

```bash
git show --stat --oneline <sha> | head -20
```

Excluded regardless of type: `.github/`, `scripts/`, `.claude/`, `apps/example/`,
root config files, and anything under a package's `*.spec.ts`. Real examples that
were correctly left out of `0.14.1`: `feat: add graph` (repo tooling) and
`fix: add permissions in test.yaml` (CI).

`### Major Changes` has never been used — the project is pre-1.0. If a breaking
change shows up, flag it to the user rather than quietly filing it under Minor.

## 4. Rewrite each commit as an entry

Do not paste commit subjects. Rewrite them:

- Imperative mood, capitalized first letter, **no trailing period**.
- Drop the `type(scope):` prefix.
- Weave the scope into the sentence when the change would otherwise be
  ambiguous: `feat(state-machine): add state name support` →
  `Add state name support in state machines`.
- Expand terse subjects into something a user can act on:
  `fix(api): openapi docs version` → `Fix OpenAPI docs version`.
- One entry per user-visible change. Squash follow-up commits ("fix typo",
  "address review") into the entry for the change they belong to.
- Read the diff when a subject is too vague to rewrite honestly.

## 5. Write it

Insert at the very top of `CHANGELOG.md`, above the previous version. Minor
before Patch. One blank line between every block:

```markdown
## 0.15.0

### Minor Changes

- Add items constraints for array params and fields
- Allow injecting a custom client per repository in DynamoDB and buckets

### Patch Changes

- Infer the decorated property key in QueryParam and PathParam props
```

Omit a section entirely when it has no entries — never leave an empty heading.

## 6. Verify

```bash
node scripts/changelog-section.js X.Y.Z
```

This is the exact command the release workflow runs. If it prints your section,
the release will not be blocked. Then show the user the section and let them
edit the prose before committing — the wording is theirs, not yours.
