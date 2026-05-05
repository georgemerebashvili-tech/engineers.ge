# Task 035 — Contacts: preset tag buttons + lead ID format + badge visual fix

**Delegated to:** Codex
**Created:** 2026-05-05
**Updated:** 2026-05-05 — added Part 2 (lead ID format) + Part 3 (badge visual)
**Parent:** /dmt/contacts UI polish
**Scope:** Frontend (page + component) + small backend (1 API tweak)
**Depends on:** Task 033 ✅ contacts page

## Three parts to this task

1. **Preset tag buttons** (replace text input) — main feature
2. **Lead ID format fix** — converted leads currently get ugly timestamp IDs (`r177797105787031`)
3. **Badge visual improvement** — even with shorter IDs, current converted-badge needs polish

## ⚠️ MUST READ — NO DELETIONS

**არსად არაფერი არ იშლება.**

- ✅ ცხრილი `dmt_contacts` — დარჩება
- ✅ `dmt_contacts.source` column — **დარჩება** (legacy data + future use)
- ✅ ყველა API route — დარჩება
- ❌ არ წაშალო table/column/file

ცვლილება — **მხოლოდ UI**. "წყარო" სვეტი ცხრილიდან წაიშლება (UI hide), მაგრამ DB column-ი რჩება.

## პრობლემა

`/dmt/contacts` გვერდის "თეგები" სვეტი ამჟამად plain text input-ია (`"tag, tag..."`). User-ი ხელით ბეჭდავს — slow, error-prone, არცონსისტენტური. წყარო (Source) ცალკე dropdown-ად არის, რომელიც overlap-ი ფუნქციით (მისი value-ები — Manual, Import, Website, Referral, Event — ბუნებრივი marketing tags-ია).

## გადაწყვეტა

**1. წყარო სვეტი UI-დან წაშალე** ([app/dmt/contacts/page.tsx:34](../../app/dmt/contacts/page.tsx#L34)) — უკვე გაკეთებულია მხოლოდ frontend-ზე. DB column `dmt_contacts.source` დარჩება.

**2. თეგების cell-ი გადააფორმე chip-based UI-ით** ერთად:
- აქტიური თეგები — pill-ებად (× მოშორებაზე)
- "+ თეგი" button → ხსნის popover-ს preset buttons-ით
- Preset buttons: `Manual`, `Import`, `Website`, `Referral`, `Event` — click-ი toggle-ს
- Custom text input — popover-ის ბოლოში free-form

## What to build

### Component: `<TagsCell>` (new, in `components/dmt/tags-cell.tsx` ან inline იმავე page.tsx-ში)

**Props:**
```typescript
type Props = {
  tags: string[];
  onChange: (next: string[]) => void;
};

type PresetTag = {
  label: string;
  color: 'blue' | 'orange' | 'green' | 'purple' | 'gray';
};

const PRESET_TAGS: PresetTag[] = [
  {label: 'Manual',   color: 'gray'},      // ნაცრისფერი — ხელით დამატებული
  {label: 'Import',   color: 'orange'},    // ნარინჯისფერი — bulk იმპორტი
  {label: 'Website',  color: 'blue'},      // ლურჯი — საიტიდან მოვიდა
  {label: 'Referral', color: 'green'},     // მწვანე — რეფერალი
  {label: 'Event',    color: 'purple'},    // იასამნისფერი — event/trade show
];

const COLOR_STYLES: Record<PresetTag['color'], {bg: string; color: string; border: string}> = {
  blue:   {bg: 'var(--blue-lt)',   color: 'var(--blue)',   border: 'var(--blue-bd)'},
  orange: {bg: 'var(--ora-lt)',    color: 'var(--ora)',    border: 'var(--ora-bd)'},
  green:  {bg: 'var(--grn-lt)',    color: 'var(--grn)',    border: 'var(--grn-bd)'},
  purple: {bg: '#ede9fe',          color: '#7c3aed',       border: '#c4b5fd'},
  gray:   {bg: 'var(--sur-2)',     color: 'var(--text-2)', border: 'var(--bdr)'},
};
```

### Visual states (similar to status dropdown style — colored pills inside a panel)

Reference visual: კონტრიბუტორის screenshot-ში manual leads status dropdown — pill-trigger-ი → ღია გვერდით, შინაარსი — colored option pills სიაში. იგივე pattern.

#### State 1 — Empty cell (no tags):
```
┌──────────────────────────────┐
│  ⊕ თეგის დამატება            │   ← faint, dashed border, gray text
└──────────────────────────────┘
   click → opens panel
```

#### State 2 — Has tags (collapsed):
```
┌──────────────────────────────────────────────┐
│ [🔵 Website×] [🟠 Import×]   ⊕               │   ← colored pills + add
└──────────────────────────────────────────────┘
   click on ⊕ or empty area → opens panel
```

#### State 3 — Panel open (click trigger):
```
┌──────────────────────────────────────────────┐
│ [🔵 Website ×] [🟠 Import ×]            [✕]   │   ← active tags + close
├──────────────────────────────────────────────┤
│  PRESET თეგები                               │
│   ┌─────────────┐                            │
│   │ ⚪ Manual    │   ← click toggles          │
│   │ 🟠 Import    │   ← active = checkmark    │
│   │ 🔵 Website  ✓│      visible              │
│   │ 🟢 Referral │                            │
│   │ 🟣 Event    │                            │
│   └─────────────┘                            │
│  ─────────────                               │
│  საკუთარი თეგი                                │
│   ┌──────────────────────┐  [+ დამატება]    │
│   │ ჩაწერე...             │                  │
│   └──────────────────────┘                   │
└──────────────────────────────────────────────┘
```

### Visual specs (detailed)

**Panel container:**
- absolute positioned (z-30) below trigger
- min-width: 240px, max-width: 320px
- rounded-lg, border border-bdr, bg-sur, shadow-xl
- divide-y for sections

**Trigger button (cell collapsed state, no tags):**
```css
inline-flex items-center gap-1
rounded-full border border-dashed border-bdr-2
px-2.5 py-1
text-[11px] font-semibold text-text-3
hover:border-blue hover:bg-blue-lt hover:text-blue
transition-all
```
Icon: `Plus` (lucide), size 12

**Trigger button (cell collapsed state, with tags):**
- Same as above but smaller — only shows ⊕ icon (no text)
- Inline next to existing pills

**Active tag pills (in cell + in panel header):**
```css
inline-flex items-center gap-1
rounded-full border
px-2 py-0.5
text-[11px] font-semibold
hover:shadow-sm
transition-all
```
- Background, color, border = from `COLOR_STYLES[preset.color]`
- × icon: `X` from lucide, size 11
- × hover: bg-red-lt, text-red

**Preset list rows (in panel):**
```css
flex items-center gap-2
rounded-md
px-2.5 py-1.5
text-[12px]
hover:bg-sur-2
cursor-pointer
transition-colors
```
- Color dot: 8x8 rounded-full, bg = preset color
- Tag label
- Active state (in tags array): `Check` icon (lucide, size 13) on right
- Hover: bg-sur-2

**Custom input section:**
- Input: `border-bdr bg-sur-2 px-2 py-1 rounded-md text-[12px]`
- Add button: `bg-blue text-white rounded-md px-2 py-1 text-[11px] font-semibold`
- Press Enter on input also adds

### Panel sections

```html
<div class="popover">
  <!-- Header: active tags + close -->
  <div class="border-b border-bdr px-3 py-2">
    <div class="flex flex-wrap items-center gap-1.5">
      {tags.map(tag => <ActivePill tag={tag} onRemove={...} />)}
      <button onClick={close}><X size={14} /></button>
    </div>
  </div>

  <!-- Preset list -->
  <div class="px-2 py-2">
    <div class="px-2 pb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
      PRESET თეგები
    </div>
    {PRESET_TAGS.map(preset => (
      <PresetRow
        preset={preset}
        active={tags.includes(preset.label)}
        onClick={() => togglePreset(preset.label)}
      />
    ))}
  </div>

  <!-- Custom input -->
  <div class="border-t border-bdr px-3 py-2.5 bg-sur-2/50">
    <div class="mb-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
      საკუთარი თეგი
    </div>
    <div class="flex items-center gap-1.5">
      <input
        type="text"
        placeholder="ჩაწერე..."
        value={customInput}
        onChange={...}
        onKeyDown={(e) => e.key === 'Enter' && addCustom()}
      />
      <button onClick={addCustom}>+ დამატება</button>
    </div>
  </div>
</div>
```

### Panel behaviors

- Open trigger click → toggles open
- Outside click → closes (use `useEffect` ref pattern from [app/dmt/variables/page.tsx:124-132](../../app/dmt/variables/page.tsx#L124-L132))
- Escape key → closes
- Adding/removing tags doesn't close panel — persistent until explicit close
- Custom input clears after Enter or button click

### Visual specs

**Tag pill** (active tag):
- bg: `bg-blue-lt`
- color: `text-blue`
- border: `border-blue-bd`
- rounded-full, px-2 py-0.5
- text-[11px] font-semibold
- × button: opacity-60, hover: opacity-100 + text-red

**+ Add button** (when tags exist):
- inline-flex, rounded-full, border border-dashed border-bdr
- size matches pill height
- icon: `Plus` from lucide, size=12
- hover: border-blue, bg-blue-lt

**Empty state button** (no tags):
- "+ თეგი" — same style as + add button but with text label
- text-text-3, hover: text-blue


### Toggle logic

```typescript
const togglePreset = (tag: string) => {
  if (tags.includes(tag)) {
    onChange(tags.filter(t => t !== tag));
  } else {
    onChange([...tags, tag]);
  }
};

const addCustom = (input: string) => {
  const trimmed = input.trim();
  if (!trimmed || tags.includes(trimmed)) return;
  onChange([...tags, trimmed]);
};

const removeTag = (tag: string) => onChange(tags.filter(t => t !== tag));
```

### Page integration

1. **Remove "წყარო" column** from `COLS` array — already done
2. **Remove source filter** from `filterSlot` — already done
3. **Increase tags column width** to `280` (fits chip cluster) — already done
4. **Replace `EditableText` for tags column** with `<TagsCell>` component:

```diff
- if (col === 'tags') return (
-   <EditableText
-     value={row.tags.join(', ')}
-     placeholder="tag, tag..."
-     onCommit={(value) => onPatch({tags: value.split(',').map((tag) => tag.trim()).filter(Boolean)})}
-   />
- );
+ if (col === 'tags') return (
+   <TagsCell
+     tags={row.tags}
+     onChange={(tags) => onPatch({tags})}
+   />
+ );
```

5. **Migrate existing source values to tags** (one-time on first load):
   - On `useEffect` initial load, for any contact where `tags` doesn't yet contain `source` value (capitalized), add it
   - PATCH each affected contact via existing API
   - Use `localStorage.setItem('dmt_contacts_source_migrated', '1')` flag — run once

   **Migration logic:**
   ```typescript
   useEffect(() => {
     if (localStorage.getItem('dmt_contacts_source_migrated')) return;
     // For each row, if row.source not in row.tags, add it
     // Capitalize source: 'manual' → 'Manual', 'import' → 'Import', etc.
     // Patch contact via updateContact API
     localStorage.setItem('dmt_contacts_source_migrated', '1');
   }, [hydrated]);
   ```

## Acceptance criteria

✅ "წყარო" სვეტი UI-დან წაშლილია (DB column უცვლელი)
✅ თეგების სვეტი ჩანდება chip-based UI-ით — pills + × მოშორება
✅ "+ თეგი" button click → ხსნის popover-ს
✅ Popover-ში 5 preset button: Manual / Import / Website / Referral / Event
✅ Click preset button → toggle-ით ემატება/ცილდება
✅ Custom input-ში Enter → ემატება free-form tag
✅ Active preset visually distinct (blue) vs inactive (gray)
✅ Click outside popover → იხურება
✅ Escape → popover იხურება
✅ Existing source values (manual/import/website/...) auto-migrate to tags array (one-time)
✅ Multi-user: User A adds tag → save → User B refresh → ხედავს
✅ TypeScript: `npm run typecheck` — pass
✅ ESLint: `npm run lint` — pass
✅ UTF-8 encoding-ი დაცული

## Files to create

```
components/dmt/tags-cell.tsx        (NEW component)
```

## Files to modify

```
app/dmt/contacts/page.tsx           — replace tags renderer + add migration useEffect
```

## Out of scope

- **Tag suggestions from DB** (autocomplete from `dmt_contact_tag_suggestions` ცხრილი) — დიდი task, future
- **Marketing tags pre-seed** (28 tags from old task 037) — future
- **Tag color customization** — fixed blue palette ახლა
- **Tag rename / merge** admin UI — future
- **Bulk tag assign** — future
- **დროპ `dmt_contacts.source`** column — DON'T (NO DELETIONS)

## Notes

- **UTF-8** — Codex-მა ფაილებს UTF-8 encoding-ში წეროს. Task 032-ის double-encoding bug არ გაიმეოროს. **გადაამოწმე**: ქართული strings (`"+ თეგი"`, `"საკუთარი თეგი..."`) source-ში ნორმალურად ჩანდება (არა `áƒ` patterns).
- **Width**: tags column width გაიზარდა 180→280px რომ pill-ების cluster და "+ თეგი" ერთად მოეთავსოს. თუ rich UI-სთვის მეტი ჭირდება, გაზარდე 320-მდე.
- **State management**: `<TagsCell>` self-contained. Popover state local-ი (useState). Outside-click handler — useEffect ref-ით.
- **Performance**: ცხრილი ბევრ row-ს აქვს. ყოველი TagsCell renders own popover state — ეს OK.

## Test plan (Part 1 — tag presets)

1. `npm run dev` → http://localhost:3000/dmt/contacts
2. Login admin
3. Add new contact → tags cell ცარიელი → "+ თეგი" button visible
4. Click + → popover ხსნის
5. Click "Website" preset → იცვლის "Website" pill-ად, წყარო remains in DB-ში
6. Click "Manual" preset → ორი pill ჩანდება
7. Click × on Manual pill → მოცილდება
8. Custom input: "VIP" + Enter → ემატება pill
9. Click outside → popover იხურება
10. Refresh → tags persist (DB-ში ჩაიწერა)
11. Migration: existing contact-ი source='website' → tags-ში "Website" auto-added (one-time)

---

## Part 2 — Lead ID format fix

### პრობლემა

ახალი convert API ([app/api/dmt/contacts/[id]/convert/route.ts:18-20](../../app/api/dmt/contacts/[id]/convert/route.ts#L18-L20)) ლიდის ID-ს ქმნის როგორც:

```typescript
function nextManualLeadId() {
  return 'r' + Date.now() + Math.floor(Math.random() * 100);
}
```

შედეგი: `r177797105787031` (16 სიმბოლო) — ცხრილში badge-ში ცუდად ჩანს, ტრუნკდება, არ არის რეპრეზენტატიული.

### გადაწყვეტა

**Sequential prefix-ზე გადასვლა:** `M-1001`, `M-1002`, ... (`M` = Manual lead).

**ალგორითმი** (server-side, /api/dmt/contacts/[id]/convert/route.ts):

```typescript
async function nextManualLeadId(db: SupabaseClient): Promise<string> {
  const {data} = await db
    .from('dmt_manual_leads')
    .select('id')
    .like('id', 'M-%');
  let max = 1000;
  for (const row of (data ?? [])) {
    const m = /^M-(\d+)$/.exec(String(row.id));
    if (m) max = Math.max(max, Number(m[1]));
  }
  return 'M-' + (max + 1);
}
```

შემდეგ convert route-ში: `const leadId = await nextManualLeadId(db);`.

### Migration of existing rows

`dmt_manual_leads`-ში არსებული timestamp IDs (`r1777898748351`, etc.) — **არ ეხება**. დარჩება როგორც არის. **NO DELETIONS.**

ახალი convert-ით შექმნილი ლიდები ხდება `M-1001`, `M-1002`...

ცარიელ ბაზაზე — Codex-ის migration apply-ის შემდეგ პირველი convert → `M-1001`.

---

## Part 3 — Badge visual improvement

### პრობლემა

[app/dmt/contacts/page.tsx](../../app/dmt/contacts/page.tsx) — converted-state-ის badge ვიზუალი არ ვარგა:
- გრძელი ID-ი ცუდად ჩანდება (overflow, truncation არ არის)
- pill-ი არ არის sufficient padding/spacing
- × button styling ცუდია (ძალიან დიდი ან ვერ ჩანს)

### Visual spec

**Converted badge (with M-NNNN format ID):**

```
┌──────────────────────────┐
│ ✓ M-1001            ×     │   ← clean, balanced spacing
└──────────────────────────┘
```

```css
/* Outer container */
inline-flex items-stretch overflow-hidden rounded-full
border border-grn-bd bg-grn-lt
shadow-sm transition-all
hover:border-grn hover:shadow

/* Lead ID link (clickable) */
flex items-center gap-1.5 px-2.5 py-1
text-[11px] font-semibold text-grn font-mono
hover:bg-grn hover:text-white transition-colors

/* Delete button (×) */
flex items-center px-1.5
border-l border-grn-bd
text-grn opacity-50 transition-all
hover:bg-red hover:text-white hover:opacity-100
```

**For LONG IDs (legacy `r17779...` rows):**
- Apply max-width: `max-w-[100px]` to ID span + `truncate`
- Tooltip on hover shows full ID

**Lock state (no company):**
```
┌────────────┐
│ 🔒 ლიდად    │   ← gray, dashed border, tooltip
└────────────┘
```

```css
inline-flex items-center gap-1.5 rounded-full
border border-dashed border-bdr bg-sur-2
px-2.5 py-1 text-[11px] font-semibold text-text-3
opacity-70 cursor-not-allowed
```

**Active button (ready to convert):**
Already implemented in current code — keep as is:
```css
/* Blue gradient pill with hover scale */
inline-flex items-center gap-1.5 rounded-full
border border-blue-bd
bg-gradient-to-r from-blue-lt to-sur
px-2.5 py-1 text-[11px] font-semibold text-blue
shadow-sm transition-all
hover:border-blue hover:from-blue hover:to-navy-2 hover:text-white hover:shadow-md hover:scale-[1.03]
active:scale-[0.98]
```

### Truncation logic

```tsx
function formatLeadId(id: string): string {
  if (id.length <= 10) return id;          // M-1001, L-1234, etc.
  return id.slice(0, 4) + '…' + id.slice(-4);  // r17779105...87031 → r177…7031
}

// In badge:
<span className="font-mono max-w-[110px] truncate" title={leadId}>
  {formatLeadId(leadId)}
</span>
```

This handles both new clean IDs and legacy timestamp IDs gracefully.

---

## Acceptance criteria (combined)

### Part 1 — Tag presets
✅ "წყარო" სვეტი UI-დან წაშლილია (DB column უცვლელი)
✅ თეგების სვეტი ჩანდება chip-based UI-ით — colored pills + × მოშორება
✅ Panel-ში 5 preset (Manual/Import/Website/Referral/Event) ფერადი სიაში
✅ Custom input + Enter / ღილაკი → ახალი tag
✅ Outside click + Escape → panel იხურება
✅ Migration: existing source values → tags array (one-time)

### Part 2 — Lead ID format
✅ ახალი conversion → ID format `M-NNNN` (M-1001, M-1002...)
✅ არსებული timestamp IDs (`r177...`) — დარჩება, არ შეცვლილა
✅ ID generator-ი sequential (max+1 from existing M-prefix rows)
✅ ID format-ის ცვლილება არ ტეხს არსებულ მონაცემს

### Part 3 — Badge visual
✅ Converted badge visually clean, balanced spacing, hover effects
✅ Long legacy IDs truncated with `…` + tooltip
✅ × button — subtle by default, prominent red on hover
✅ Lock state (no company) — dashed border + gray + 🔒
✅ Active button (with company) — gradient blue with hover scale (already existing)
✅ All states test in browser — looks good on long/short IDs, hover transitions smooth

### Universal
✅ TypeScript: `npm run typecheck` — pass
✅ ESLint: `npm run lint` — pass
✅ UTF-8 encoding-ი დაცული (task 032 corruption არ გაიმეოროს)
✅ Multi-user: changes propagate via DB
