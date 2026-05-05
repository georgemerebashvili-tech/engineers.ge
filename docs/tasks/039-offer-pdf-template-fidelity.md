# Task 039 — Offer PDF: match original template fidelity

**Delegated to:** Codex
**Created:** 2026-05-05
**Parent:** Task 038 (PDF generation) — fixes layout discrepancies
**Scope:** Backend (template renderer in `lib/dmt/pdf/offer-template.ts`) + static assets (logo, sakpatenti emblem)
**Depends on:** Task 038 ✅ basic PDF generation working

## ⚠️ MUST READ — SCOPE & NO DELETIONS

- ✅ Work ONLY on `/dmt` PDF generation (`lib/dmt/pdf/`, `public/dmt/`)
- ❌ NO DELETIONS — only modify the existing template renderer
- ❌ DO NOT touch other pages or APIs

## პრობლემა

User-მა შეადარა:
- **`test.pdf`** — ორიგინალი template (DMT-ის რეალური კომერციული წინადადება)
- **`DMT-O-1002-220.pdf`** — Codex-ის გენერირებული PDF

დიდი ვიზუალური სხვაობებია. გენერაცია ნაკლებად professional ჩანს და client-ს ვერ ესახება როგორც ოფიციალური დოკუმენტი.

## Specific differences to fix

### 1. Logo და header layout (Page 1)

**ორიგინალი:**
- DMT ლოგო **ცენტრში** ზედა ნაწილი (~30% page height)
- Logo size: ~200pt wide
- ლოგოს ქვემოთ: გრძელი table-ი 3 row-ით (left-aligned narrow column 35% width):
  - დოკუმენტი:
  - ფაილის შინაარსი:
  - დოკუმენტის ვერსია:
- დოკუმენტის ნომრის ნაწილი — **ყვითელი highlight** (პრიატეტული)

**ახლა გენერაცია:**
- Logo overlapping მეტადატას (`SOP.8.2.5.COFR.220` ლოგოს თავზე)
- Header-ში table-ი არ არის, plain text რიგად
- ფონტი ტრანსპარენტ logo-ს ქვეშ ცუდად ჩანს

**ფიქსი:**
```typescript
// In offer-template.ts header section:
// 1. Logo MUST be drawn FIRST (on top of nothing)
const logoY = pageHeight - 60;  // top
drawImageCentered(page, logoImage, logoY, {width: 220, height: 80});

// 2. Then metadata table BELOW logo (start ~150pt down from top)
const metaTableY = pageHeight - 200;
drawMetadataTable(page, metaTableY, [
  ['დოკუმენტი:', `პროცედურების მართვის ფაილი SOP.8.2.5.COFR.${docNumber}`],
  ['ფაილის შინაარსი:', `SOP-8.2.5-COFR-${docNumber} კომერციული წინადადება .pdf`],
  ['დოკუმენტის ვერსია:', 'V.1-25/2026'],
]);

// 3. Title centered, large
drawTextCentered(page, 'კომერციული წინადადება', titleY, {fontSize: 24, font: regularFont});
drawTextCentered(page, `დოკუმენტის N SOP.8.2.5.COFR.${docNumber}.${formatDate(docDate)}`, subtitleY, {fontSize: 11});
```

### 2. Service provider/recipient blocks (Page 1)

**ორიგინალი:**
- ორი ცალკე **bordered box** (table style)
- Header: "მომსახურების გამწევი:" / "მომსახურების მიმღები"
- Bordered გრძელი row-ებით

**ახლა გენერაცია:**
- შეიცავს გენერაციას სწორად, მაგრამ ცარცის ცალკე "Offer ID: O-1002" line-ი დაამატა (არ არის ორიგინალში)

**ფიქსი:**
- Remove "Offer ID:" line from recipient block — keeps only ბრძოლა, საიდენტიფიკაციო კოდი (and optionally საკონტაქტო, ტელეფონი which are extras)
- "Offer ID" can move to header subtitle if needed: `დოკუმენტის N SOP.8.2.5.COFR.220.2026-05-05 · O-1002`

### 3. Items table (Page 2)

**ორიგინალი:**
```
N | დასახელება (with sub-row) | განზ. | რაოდ. | ფასი | ჯამი | ხელობა | ჯამი
1 | კონტროლერი-მასტერი        | ცალი  | 1     | 137  | 137  | 35     | 35
2 | კონტროლერი-თერმომეტრი    | ცალი  | 3     | 60   | 180  | 20     | 60
...
                                                 1187            355
```
- 8 columns: N, name+desc combined cell, unit, qty, **price (subtotal)**, **product total**, **labor per unit**, **labor total**
- Yellow highlights on certain rows
- Bottom totals table with: "პროდუქციის ღირებულება" / "ხელობა" / "ჯამი" / "კომერციული მოგება 15%" / "სულ ჯამი"

**ახლა გენერაცია:**
- 6 columns: N, name+desc, unit, qty, price, total
- **ხელობა (labor) column missing** even when items have labor_per_unit
- Totals table: includes "დღგ ინფორმაციულად 18%" — different label from original "ხელობა (გადასახდების ჩათვლით)"

**ფიქსი:**
- Add 2 more columns: "ხელობა" (labor per unit) and "ჯამი" (labor total = qty × labor_per_unit)
- Hide labor columns ONLY if NO item has labor_per_unit > 0
- Totals table:
  - "პროდუქციის ღირებულება (დღგ-ს ჩათვლით)"
  - "ხელობა (გადასახდების ჩათვლით)" — sum of all line_labors
  - "ჯამი" = subtotal + labor_total
  - "კომერციული მოგება {N}%" = sum × margin/100
  - "სულ ჯამი" = sum + margin
- VAT only as informational note IF vat_rate set, NOT a separate calculation row

### 4. Money-back guarantee paragraph (Page 2)

**ორიგინალი:**
- Yellow background highlight (entire paragraph)
- Text: "შენიშვნა: იმ შემთხვევაში, თუ სისტემით სარგებლობის შემთხვევაში დამკვეთის დანაზოგები არ იქნება მინიმუმ 3 ჯერ მეტი ვიდრე ყოველთვიური სააბონენტო გადასახადი, შემსრულებელი იღებს ვალდებულებას, რომ დამკვეთს დაუბრუნებს სისტემის ინტეგრაციაში გადახდილ თანხებს 100% ით. საცდელი პერიოდი შეადგენს სამ თვეს."

**ახლა გენერაცია:**
- Plain text, no highlight

**ფიქსი:**
```typescript
if (includeMoneyBackGuarantee) {
  drawHighlightedParagraph(page, x, y, paragraphText, {
    backgroundColor: rgb(1.0, 0.95, 0.6),  // light yellow
    padding: 8,
    width: 530,
    fontSize: 10,
  });
}
```

### 5. "შემოთავაზება მოიცავს" feature list (Page 2-3)

**ორიგინალი (HVAC focused, 11 + 2 = 13 points):**
1. ქართული მენიუ პროგრამულ უზრუნველყოფაზე.
2. მობილური აპლიკაციით სარგებლობა.
3. მონტაჟისთვის საჭირო მასალებს, როგორიცაა სადენები და სხვა სახარჯი მასალები
4. პროგრამული უზრუნველყოფის მოხმარების ტრენინგს.
5. უფასო ტექნიკურ მხარდაჭერას სისტემის გამართვაზე ინტენსიურად პირველი სამი თვის განმავლობაში.
6. მუდმივ მხარდაჭერას სისტემის გამოყენებაზე - მხარდაჭერის გუნდთან მუდმივ წვდომას და პირად მენეჯერს.
7. მოწყობილობების ავტომატიზაციას ონლაინ.
8. მოწყობილობების დაჯგუფებას.
9. ავარიების ჩანაწერების ნახვას.
10. ავტომატიზაციის ჩანაწერების ნახვას.
11. უფასო სმს და ელ.ფოსტის შეტყობინებებს ავტომატიზაციაზე, ავარიაზე ან ამორჩეულ ქმედებაზე.
12. თანამშრომლების როლების გაწერას.
13. შესრულებული სამუშაოების მონიტორინგს.

ბოლო წერია:
"ამასთან, მომავალში დამატებული ფუნქციონალისა და განახლებების გამოყენებას სრულიად უფასოდ."

**ახლა გენერაცია:**
ეფერია generic 13 points ("მომხმარებლების დამატება და უფლებების მართვა", "სისტემის დისტანციური მონიტორინგი" etc.) რაც HVAC-ის სიტუაციას არ ხარჯავს.

**ფიქსი:**
Hardcode the EXACT 13 points from original (HVAC focused):

```typescript
const FEATURE_LIST: string[] = [
  'ქართული მენიუ პროგრამულ უზრუნველყოფაზე.',
  'მობილური აპლიკაციით სარგებლობა.',
  'მონტაჟისთვის საჭირო მასალებს, როგორიცაა სადენები და სხვა სახარჯი მასალები.',
  'პროგრამული უზრუნველყოფის მოხმარების ტრენინგს.',
  'უფასო ტექნიკურ მხარდაჭერას სისტემის გამართვაზე ინტენსიურად პირველი სამი თვის განმავლობაში.',
  'მუდმივ მხარდაჭერას სისტემის გამოყენებაზე — მხარდაჭერის გუნდთან მუდმივ წვდომას და პირად მენეჯერს.',
  'მოწყობილობების ავტომატიზაციას ონლაინ.',
  'მოწყობილობების დაჯგუფებას.',
  'ავარიების ჩანაწერების ნახვას.',
  'ავტომატიზაციის ჩანაწერების ნახვას.',
  'უფასო სმს და ელ.ფოსტის შეტყობინებებს ავტომატიზაციაზე, ავარიაზე ან ამორჩეულ ქმედებაზე.',
  'თანამშრომლების როლების გაწერას.',
  'შესრულებული სამუშაოების მონიტორინგს.',
];

const FEATURE_LIST_FOOTER = 'ამასთან, მომავალში დამატებული ფუნქციონალისა და განახლებების გამოყენებას სრულიად უფასოდ.';
```

### 6. Sakpatenti emblem in page footer (every page)

**ორიგინალი:**
- Red/gold საქპატენტი emblem image embedded in bottom-right of every page
- Caption text:
  ```
  საავტორო უფლებები საქპატენტი:
  დეპონირების რეგისტრაციის #8973 (ჰაერის გათბობის, ვენტილაციის და კონდიცირების (HVAC) მოწყობილობები
   დისტანციური მართვისა და ავტომატიზაციის სქემა, სისტემა და მეთოდი) 13.05.2023
  დეპონირების რეგისტრაციის #8993 (საყოფაცხოვრებო და სამრეწველო ელექტრო მექანიკური საინჟინრო სისტემებისა
   და მოწყობილობების დისტანციური მართვის და ავტომატიზაციის კომპიუტერულიპროგრამა) 06.06.2023
  ```

**ახლა გენერაცია:**
- მცირე text-ი ბოლოში "საავტორო უფლებები საქპატენტი: დეპონირების რეგისტრაციის #8973 / #8993"
- emblem image არ არის

**ფიქსი:**
- Add `public/dmt/sakpatenti.png` asset (Codex-ი იყენებს placeholder image თუ ფაილი არ არსებობს, ფლაგით მონიშნე user-სთვის რომ რეალური emblem უნდა ჩაიდოს)
- Render emblem at bottom-right of every page
- Full footer text on page 2 (where it's most visible)
- Short version on other pages: "საავტორო უფლებები საქპატენტი: #8973 / #8993"

### 7. Signature page (Page 3)

**ორიგინალი:**
- Title: "მხარეთა ხელმოწერები:" (centered)
- "მომსახურების გამწევი" — bold heading
- "შპს ციფრული მართვის ტექნოლოგიები"
- "დირექტორი: გ. მერებაშვილი" + ხელმოწერის ხაზი
- (gap)
- "მომსახურების მიმღები" — bold heading
- "{client_company}"
- "ს/კ: {client_tax_id}"
- "დირექტორი:" + ხელმოწერის ხაზი

**ახლა გენერაცია:**
- სწორი layout, მხოლოდ "ს/კ: -" თუ tax_id არ არის — ცარცის ცარცის ცარცის. Maybe omit "ს/კ:" line entirely if missing.

**ფიქსი:**
- If `client_tax_id` empty → don't render "ს/კ:" line at all
- Signature line should be longer (~250pt wide)

### 8. Page header on continuation pages

**ორიგინალი:**
- Top of page 2/3: "გვერდი 2 of 3 / გვერდი 3 of 3"
- "დოკუმენტი: SOP-8.2.5-COFR-217 კომერციული წინადადება .docx"
- "შინაარსი: კომერციული წინადადება"

**ახლა გენერაცია:**
- "DMT" / "კომერციული წინადადება" — generic header

**ფიქსი:**
- Continuation pages header:
  ```
  გვერდი {N} of {Total}                                          [logo small]
  დოკუმენტი: SOP-8.2.5-COFR-{docNumber} კომერციული წინადადება .pdf
  შინაარსი: კომერციული წინადადება
  ──────────────────────────────────
  ```

## Static assets needed

```
public/dmt/logo.png            — DMT brand logo (200×80pt typical)
public/dmt/sakpatenti.png      — Sakpatenti emblem (~80×80pt)
public/fonts/sylfaen.ttf       — Georgian font (or noto-sans-georgian)
```

If files don't exist:
- Logo: search for any existing DMT logo in `public/`, copy to `public/dmt/logo.png`
- Sakpatenti: render placeholder rectangle with "საქპატენტი" text, mark TODO for real image
- Font: Codex must check if `pdf-lib` font embedding works with system Sylfaen or if download needed

## Acceptance criteria

✅ Page 1 logo centered, no overlap with metadata
✅ Metadata table left-aligned narrow style matching original
✅ Title "კომერციული წინადადება" centered, large
✅ Provider/recipient boxes bordered, matching original
✅ "Offer ID:" removed from recipient block (or moved to subtitle)
✅ Items table has 8 columns when items have labor (N/desc/unit/qty/price/subtotal/labor-unit/labor-total)
✅ Items table reverts to 6 columns when no item has labor (auto-hide)
✅ Totals table format matches: ღირებულება / ხელობა / ჯამი / მოგება% / სულ ჯამი
✅ Money-back guarantee paragraph in yellow highlight (when toggle on)
✅ "შემოთავაზება მოიცავს" exact 13-point HVAC list (hardcoded)
✅ Footer text "ამასთან, მომავალში..." after list
✅ Sakpatenti emblem visible on every page footer
✅ Signature page matches original layout
✅ Continuation pages have proper header with page numbers
✅ TypeScript pass, ESLint pass
✅ UTF-8 encoding-ი დაცული — ქართული source-ში normal

## Files to modify

```
lib/dmt/pdf/offer-template.ts  — main template renderer (header, table, totals, signature)
lib/dmt/pdf/colors.ts          — add yellow highlight color if missing
lib/dmt/pdf/fonts.ts           — verify Georgian font loading
```

## Files to create

```
public/dmt/logo.png            — if not present, copy from existing
public/dmt/sakpatenti.png      — placeholder if needed
```

## Out of scope

- Real Sakpatenti image (placeholder OK for now)
- Multi-language version (Georgian only)
- Custom branding per company (fixed DMT)
- E-signature integration

## Test plan

1. `npm run dev` → http://localhost:3000/dmt/invoices
2. Login admin
3. Open existing offer or create new with 5 items including some with `labor_per_unit > 0`
4. Click "PDF გენერაცია"
5. Compare side-by-side with `test.pdf` (original)
6. Verify: logo, header, items table, totals, money-back highlight, feature list, sakpatenti footer, signature page
7. Verify continuation pages have proper headers
8. Generate offer with 0 labor items → labor columns should auto-hide
9. Toggle money-back off → yellow paragraph hidden
