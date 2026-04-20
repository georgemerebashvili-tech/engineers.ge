# CI setup — GitHub Actions

The full workflow YAML is tracked at [`ci-workflow.yml.template`](./ci-workflow.yml.template).
It's NOT at `.github/workflows/ci.yml` because the local Personal Access Token
lacks the `workflow` scope, and GitHub rejects any push that touches that
directory (including a README.md) without it.

## To enable CI (one-time, 30 seconds)

1. Open GitHub → this repo → **Actions** tab
2. Click **New workflow** → **set up a workflow yourself**
3. Name the file `ci.yml` (default is `main.yml` — change it)
4. Paste the entire contents of [`ci-workflow.yml.template`](./ci-workflow.yml.template)
5. Click **Start commit** → **Commit new file**

The web UI commits with GitHub's own auth, so the `workflow` scope is automatic.

## What CI runs

On every push / PR on `main`:

```
npm ci → typecheck → lint (advisory) → build → next start → smoke (30s ready-loop)
```

See the template file for placeholder env values used during the CI smoke run
(all dummy — no real secrets exposed).

## Alternative: regenerate PAT with workflow scope

Instead of copy-pasting via web UI, you can:
1. GitHub → Settings → Developer settings → Personal access tokens
2. Generate new token with `repo` + `workflow` scopes
3. `git remote set-url origin https://<new-token>@github.com/...`
4. Future pushes handle `.github/workflows/*` directly

The first approach (copy-paste via web UI) is zero-config and safer — PATs with
`workflow` scope can modify CI, a higher-privilege credential.
