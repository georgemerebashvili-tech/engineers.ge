# Smoke tests — engineers.ge

**Zero-dependency HTTP suite** რომელიც ამოწმებს ყველა ცრიტიკულ path-ს: public გვერდები, admin auth redirects, API contracts, asset serving, proxy behavior.

## Usage

```bash
# dev server-ზე (default http://localhost:3001)
npm run smoke

# production/staging-ზე
SMOKE_URL=https://engineers.ge npm run smoke
```

Exit code `0` = ყველა გაიარა · `1` = ერთი მაინც ჩაიჭრა. CI-სთვის მოსახერხებელია.

## რას ამოწმებს

1. **Public გვერდები** — `/`, `/dashboard/referrals`, `/ads`, ყველა `/calc/*` გვერდი (SSR), sitemap/robots
2. **Static assets** — `public/calc/*.html` + shared `.js` ფაილები
3. **404** — non-existent route → 404 (not crash)
4. **Admin auth** — ყველა `/admin/*` route redirect-ი logged-out user-ისთვის
5. **API contracts** — 
   - `POST /api/bug-reports` validates (bad input → 400)
   - admin endpoints require auth (401)
6. **Proxy** — `eng_vid` cookie დაყენდება

## როცა ახალი ფიჩერი ემატება

**ყოველ ახალ route-ს / API-ს თან უნდა გაჰყვეს smoke line** — `scripts/smoke.mjs`-ში. ეს არის „zero to CI" მინიმუმი. Pattern:

```js
// ახალი public გვერდი
await check('GET /new-feature', () => expectStatus('/new-feature', 200));

// ახალი admin გვერდი
await check('GET /admin/new-thing without auth → 307', () =>
  expectStatus('/admin/new-thing', 307)
);

// ახალი API
await check('POST /api/new-thing validates', () =>
  expectJson('/api/new-thing', {method: 'POST', ...}, (res) =>
    res.status === 400 ? null : `wanted 400, got ${res.status}`
  )
);
```

## რას არ ამოწმებს (ჯერ)

- **Browser-interactive flows** — clicking, typing, მოდალები. ამისთვის მომავალში Playwright-ი დაემატება (`tests/e2e/` + `@playwright/test`).
- **Visual regression** — screenshot diffing.
- **Authenticated admin flows** — login + toggle feature + verify. მოითხოვს ADMIN_USER/ADMIN_PASS_HASH dev-specific env-ში.

## შემდეგი ნაბიჯი (როცა სჭირდება)

Playwright dependency დაემატება, `playwright.config.ts` + `tests/e2e/*.spec.ts`. ამჟამინდელი smoke-ი არ უქმდება — ისინი დამატებით ფენად იმუშავებენ.
