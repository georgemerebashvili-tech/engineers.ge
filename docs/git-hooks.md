# Git hooks — engineers.ge

## რას აკეთებს

`git push`-ამდე ავტომატურად გადის `.githooks/pre-push` სკრიპტი, რომელიც:

1. **typecheck** — `npx tsc --noEmit`. ამოწმებს ყველა .ts/.tsx ფაილს. დაჭრა → push abort.
2. **smoke** — თუ dev server-ი მუშაობს `SMOKE_URL` (default `localhost:3001`)-ზე, ცდის 48 HTTP check-ს. დაჭრა → push abort. სერვერი არ მუშაობს → smoke skip (warning), typecheck კი ინარჩუნებს.

შედეგი: იმ კოდს რომ push-ს არ სცემ, რომელიც CI-ზე ისედაც დაინგრევა.

## როგორ ირთვება

ავტომატურად `npm install`-ის დროს — [`scripts/install-git-hooks.mjs`](../scripts/install-git-hooks.mjs) გაუშვებს `git config core.hooksPath .githooks`-ს, რაც გულისხმობს რომ git-ი .git/hooks-ის მაგიერ .githooks/-დან კითხულობს hook-ებს.

ხელითაც შეგიძლია:
```bash
git config core.hooksPath .githooks
```

შემოწმება:
```bash
git config --get core.hooksPath
# → .githooks
```

## Bypass

ნამდვილი emergency-ზე:
```bash
git push --no-verify
```

ან env var-ით (permanent per-session skip):
```bash
SKIP_GIT_HOOKS=1 git push
```

CI-ში hook-ი თავისით ითიშება (`$CI` env var detection-ი — GitHub Actions, Vercel, ყველგან ჩვეულებრივ set-ია).

## რატომ .githooks/ და არა husky

- **Zero deps** — husky/lint-staged `node_modules/`-ში დაახლოებით 30 MB-ს ითხოვს.
- **Native git feature** — `core.hooksPath` git 2.9+-ის ფუნქციაა. Git-ის core.
- **Tracked in repo** — ყოველი team member-ი იგივე hook-ს ხედავს. Installer `prepare`-ში ავტომატურად რთავს.
- **Bypass-ფრენდლი** — husky-ს აქვს საკუთარი `HUSKY=0` env. ჩვენი `SKIP_GIT_HOOKS=1` უფრო intuitive-ი.

## რა არ ამოწმებს

- **Lint** — `npm run lint` advisory-ია (legacy debt, იხილე eslint.config.mjs override). Hook-ს არ უშვებს lint-ს, რომ არა-blocking დარჩეს.
- **Unit tests** — ჯერ არ გვაქვს `*.test.ts`-ები. როცა გაჩნდება → hook-ში დავამატო.
- **Build** — `next build` 30s+ დრო და მეხსიერებას ჭამს. CI-ზე run-ი საკმარისია.

## ახალი hook-ის დამატება

1. `.githooks/pre-commit` (ან სხვა git hook name) ფაილი.
2. `chmod +x .githooks/<hook-name>`.
3. Ready — `core.hooksPath` უკვე მიგვითითებს აქ.

## Troubleshooting

- **"hook not running"** — `git config --get core.hooksPath` → უნდა აჩვენოს `.githooks`. თუ არა: `git config core.hooksPath .githooks`.
- **"Permission denied"** — `chmod +x .githooks/pre-push`.
- **"command not found: npm"** — IDE-ს გარე terminal-ში git command-ი გირჩევნია. ან IDE-ს env-ში NODE PATH.
- **Hook-ი ნელია** — typecheck 20-30 წამში ეშვება. Trade-off: სწრაფი push vs CI red. თუ ხშირია, push batch-ად.
