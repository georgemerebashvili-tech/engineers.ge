# Task 005 — კალკულატორების Auth Gate

## კონტექსტი

`heat-transfer.html` არის გაერთიანებული HVAC suite. ორივე ქარდიდან (`wall-thermal` + `heat-loss`) ერთი და იგივე ფაილი იხსნება.

## მიზანი

1. **უფასო წვდომა** — კალკულატორით სარგებლობა ღია
2. **რეგისტრაციის gate** — PDF/XLS ანგარიშის ჩამოტვირთვა მხოლოდ რეგისტრირებულ მომხმარებელს
3. **Layer limit** (მოგვიანებით განსახილველი) — wall-thermal tab-ში 1 შრე უფასო, 2+ შრე რეგისტრირებულზე

## Acceptance Criteria

- [ ] `printHeatLoadReport()` და `tw_doPrint()` ფუნქციები იძახებენ `hasAuth()` check-ს
- [ ] თუ `hasAuth() === false` → გახსნის registration modal-ს (`RegistrationFlow` component-ი უკვე არის)
- [ ] auth status იკითხება `localStorage.getItem('engineers_ge_user')`-იდან (user-session.ts უკვე ასე მუშაობს)
- [ ] Auth check უნდა მოხდეს iframe-ის შიგნით — ამისთვის parent-child communication (`postMessage`) ან cookies
- [ ] Registration წარმატების შემდეგ → PDF ავტომატურად გენერირდება
- [ ] Tracking: `calcBeacon('pdf')` ისე როგორც ახლა, დამატებით `calcBeacon('gate_blocked')` არაავტორიზებულ მცდელობაზე

## ტექნიკური მიდგომა

**ვარიანტი A: postMessage**
- Calc HTML-ი გზავნის `{type:'requestPdf'}` parent-ს
- Next.js parent ამოწმებს auth-ს, აბრუნებს `{type:'authOk'}` ან ხსნის reg modal-ს
- Calc HTML-ი აგრძელებს PDF გენერაციას

**ვარიანტი B: cookie-based**
- Registration-ს ვწერთ httpOnly cookie-ში
- Calc HTML-ი ამოწმებს `document.cookie`-ს (თუ non-httpOnly მისაწვდომი)
- უფრო მარტივი, მაგრამ cookie-ს გამოყოფა საჭიროა

**რეკომენდაცია:** A — უფრო სუფთა და secure

## Open Questions

- Wall-thermal "1 layer free" logic განვაცალკავოთ თუ იგივე gate გამოვიყენოთ?
- PDF-ის სხვადასხვა ფორმატი standalone vs suite რეჟიმში? (URL param `?mode=wall` ან `?mode=full`)
