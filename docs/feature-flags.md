# Feature Flags — engineers.ge

Admin-მიერ მართვადი visibility flags ყოველი sidebar item-ისა და მთავარი გვერდებისთვის.

## 3 მდგომარეობა

| Status | ინდიკატორი | ქცევა |
| :-- | :-- | :-- |
| 🟢 `active` | აქტიური | ვიზიტორი ხედავს როგორც ჩვეულებრივ. Default. |
| 🟡 `test` | სატესტო | Sidebar-ში — ყვითელი `test` ნიშანი. Route-ზე — ყვითელი ბანერი: „ეს გვერდი სატესტო რეჟიმშია — შეიძლება შეიცავდეს ხარვეზებს". |
| 🔴 `hidden` | დამალული | Sidebar-დან სრულად ქრება. Route-ი ფიზიკურად ისევ არსებობს (შესაძლოა direct URL-ით გაიხსნას) — UI-დან ხილვა გადაგდებულია. |

## რა შედის რეესტრში

ცენტრალური source of truth: [`lib/feature-flags.ts`](../lib/feature-flags.ts) → `FEATURE_REGISTRY`.

სექციები:

- **Dashboard სიდბარი** — ჩემი პროექტები, რჩეული ხელსაწყოები, მოიწვიე, აქციები, რეკლამა
- **კალკულატორები** — HVAC, AHU, სადარბაზო/ლიფტი/პარკინგი/კორიდორი, wall-thermal, heat-loss, silencer(s), wall-editor, building-composer, physics-docs
- **Admin სიდბარი** — sitemap, todos, hero-ads, banners, users, referrals, stats, claude-sessions, ai, health, ads-preview *(login/password/features-ი locked — ვერ დამალავ, რომ panel-ი არ "გატეხო")*
- **საჯარო გვერდები** — `/ads`, donate modal, share bar, referral floating widget

ახალი ფიჩერი რომ შევიდეს → მხოლოდ `FEATURE_REGISTRY`-ში key-ს დაამატე + sidebar-ის item-ს `flagKey: '<key>'` დააჭერ. ავტომატურად გამოჩნდება `/admin/features`-ში.

## როგორ მუშაობს

1. **DB** — `feature_flags` ცხრილი ([migration 0015](../supabase/migrations/0015_feature_flags.sql))
   ```
   key | status ('active'|'test'|'hidden') | note | updated_at | updated_by
   ```
   ძირითადი მდგომარეობა `active`. DB-ში ინახება მხოლოდ `non-active` ფლაგები (upsert).
2. **API** — [`/api/admin/features`](../app/api/admin/features/route.ts) GET/POST (admin session required).
3. **Admin UI** — [`/admin/features`](../app/admin/(authed)/features/page.tsx) → 3-state toggle + confirmation modal ყოველ ცვლილებაზე.
4. **Layouts** — ორივე layout კითხულობს `getFeatureFlags()` და გადასცემს sidebar-ს + [`TestModeBanner`](../components/test-mode-banner.tsx)-ს.
5. **Sidebars** — `dashboard-sidebar.tsx` + `admin-sidebar.tsx` შეცდოვენ `hidden` items-ს, და ხაზავენ `test` items-ს ყვითელი ნიშნით.

## Pathname header

[`proxy.ts`](../proxy.ts) ამატებს `x-pathname` header-ს — ამით `TestModeBanner` იცნობს რომელ route-ზე ვართ და გადაწყვეტს, გამოჩნდეს თუ არა ბანერი.

## Fail-open behavior

თუ Supabase DB ვერ მიუწვდება, `getFeatureFlags()` ბრუნდება default `active` ყველაფერზე (fail-open). Admin-ი დაინახავს warning-ს `/admin/features` გვერდზე და ცვლილება ვერ შეინახება.

## უსაფრთხოება — ფიჩერის დამალვა ≠ route-ის ამოშლა

`hidden` მხოლოდ **UI**-დან აშორებს item-ს. თუ გინდა რეალურად ფიზიკურად დაბლოკო route, ცალკე ცვლილებაა საჭირო (middleware check + 404). ამ ეტაპზე scope-ში არ შედის.

## Pattern — როგორ გავაკეთო ფიჩერი უსაფრთხოდ

1. ახალ ფიჩერს ჯერ **`test`** მდგომარეობაში გავუშვი → ვიზიტორი ხედავს + ბანერი ერთდროულად აფრთხილებს.
2. ტესტირების შემდეგ → გადავიტანო **`active`**-ზე.
3. თუ რაიმე გატყდა → სწრაფად → **`hidden`** → ფიქსვა → ისევ **`test`** → **`active`**.

ეს pattern ცვლის „commit + deploy + hotfix"-ის ციკლს — feature flag-ით *ოპერატიულად* ვხელმძღვანელობ საიტს ხარვეზის პოვნის შემდეგ.
