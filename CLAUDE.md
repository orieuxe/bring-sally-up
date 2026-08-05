# Working rules

## Attribution

Never sign anything as Claude. The repository owner is the author of every
commit — no `Co-Authored-By: Claude`, no `Claude-Session` trailer, no
"Generated with Claude Code" in pull request bodies, no mention of Claude in
commit messages, PR titles or descriptions, code or comments.

`.claude/settings.json` enforces this via `attribution` (empty strings) and the
deprecated `includeCoAuthoredBy` for older CLI versions; do not remove either.
If a commit slips through with a trailer, amend it before pushing.

Commits are authored as `orieuxe <orieux.etienne@gmail.com>`. When the sandbox
git identity says otherwise, pass it explicitly:

```bash
git -c user.name='orieuxe' -c user.email='orieux.etienne@gmail.com' commit …
```

## Branches and pull requests

Remote sessions (Claude Code on the web, a scheduled run, anything not driven
from a local terminal) never commit to `main`. Work on a branch, push it, open
a pull request, and let the PR carry the change.

`main` is never force-pushed and never rewritten.

## Merging

Always **squash merge**. One pull request, one commit on `main`. The squash
commit message is written by hand — not the concatenation of the branch's
commits — and follows the convention below.

## Commit messages

[Conventional Commits](https://www.conventionalcommits.org): `type(scope): subject`.

- Types in use: `feat`, `fix`, `refactor`, `style`, `perf`, `test`, `docs`,
  `chore`, `build`.
- Scope is optional and matches the area touched: `home`, `history`, `player`,
  `storage`, `android`, `assets`.
- Subject in the imperative, lower case, no trailing period, under ~72 chars.
- The body explains why the change was needed, not what the diff already shows.

PR titles follow the same convention.

## Checks before pushing

```bash
npx tsc --noEmit
npm run lint
```

Both must pass. `npm run format` applies the auto-fixable lint rules.
