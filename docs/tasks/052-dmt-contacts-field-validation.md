# Task 052 — DMT contacts: per-field validation (phone, email, tax id, name)

**Delegated to:** Codex
**Created:** 2026-05-07
**Parent:** Task 033 (DMT contacts) — UX hardening
**Scope:** [`app/dmt/contacts/page.tsx`](../../app/dmt/contacts/page.tsx) only (UI-side validation; server already accepts whatever)

## ⚠️ MUST READ — NO DELETIONS

- ✅ Existing rows + tags + convert flow stay untouched
- ✅ STRICTLY `/dmt/contacts` scope — leads / invoices / inventory not affected
- ✅ Server still accepts the value if user insists; UI **WARNS** and visually flags invalid, but does not hard-block save (lossless data entry)

## პრობლემა (User-asked 2026-05-07)

User: "შედი კონტაქტების გვერდზე და ვალიდაციები დაადო ტელეფონის ნომერზე რომ ასოები არ ჩაიწეროს, ასევე სხვა თუ რაიმე მსგავსი იქნება ეგენიც დავალება გაუწერე კოდექსს."

ე.ი. user-ი წერს ტელეფონის ნომერს, შემთხვევით ჩაწერს ასოს, და მას არ უნდა შეწუხდეს. ვინც ცდის ნამდვილ ტელეფონის ნომერს — ვალიდაცია დაუსახელოს და visual flag ცოცხალი იყოს.

## Spec

### Field validators

`app/dmt/contacts/page.tsx` ცოცხალია 7 editable column-ი: `name`, `company`, `position`, `phone`, `email`, `tags` (custom UI), `notes`.

Add inline validators:

| Column | Constraint | Notes |
|---|---|---|
| `phone` | `/^[+\d\s\-()]+$/` | digits, +, hyphen, space, parentheses only. Empty allowed. |
| `email` | `/^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/` (or simpler `.includes('@')` minimum) | Basic shape check. Empty allowed. |
| `name` | `length <= 200`, no trailing newlines | Empty allowed (existing behavior) |
| `company` | `length <= 200` | Empty allowed |
| `position` | `length <= 120` | Empty allowed |
| `notes` | `length <= 2000` | Multiline allowed |
| `tags` | already constrained via TagsCell | no change |

Optional bonus — if a contact has a `taxId` field somewhere (check `Contact` type — Task 049 may have added one), add:
| `taxId` | `/^\d{9}$/` (Georgian tax ID is 9 digits) | Empty allowed |

### EditableText behavior

Extend `<EditableText>` (currently in [page.tsx](../../app/dmt/contacts/page.tsx) ~line 394) to accept `validate?: (value: string) => string | null` prop. Returns null when valid, error message string when invalid.

```tsx
function EditableText({
  value,
  onCommit,
  placeholder,
  multiline,
  validate,
}: {
  value: string;
  onCommit: (value: string) => void;
  placeholder: string;
  multiline?: boolean;
  validate?: (value: string) => string | null;
}) {
  const [local, setLocal] = useState(value);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setLocal(value); setError(null); }, [value]);

  const handleChange = (v: string) => {
    setLocal(v);
    if (validate) setError(validate(v));
  };

  const commit = () => {
    if (local !== value) onCommit(local);
  };

  const className = `h-7 w-full border-0 bg-transparent text-[12px] outline-none placeholder:text-text-3 focus:bg-sur ${
    error ? 'text-red bg-red-lt' : 'text-text'
  }`;

  return (
    <div className={`border-r border-bdr px-2 py-1.5 ${error ? 'bg-red-lt/30' : ''}`} title={error ?? ''}>
      <input
        value={local}
        onChange={(e) => handleChange(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') (e.currentTarget as HTMLInputElement).blur();
        }}
        placeholder={placeholder}
        className={className}
      />
    </div>
  );
}
```

For `multiline`, mirror the same wrapper; just swap `<input>` for `<textarea>`.

### Validator definitions

Top of file:

```tsx
const phoneRe = /^[+\d\s\-()]+$/;
const emailRe = /^[A-Za-z0-9._+-]+@[A-Za-z0-9-]+\.[A-Za-z]{2,}$/;

const VALIDATORS: Partial<Record<EditableKey, (v: string) => string | null>> = {
  phone: (v) => {
    const t = v.trim();
    if (!t) return null;
    if (!phoneRe.test(t)) return 'მხოლოდ ციფრები / + / - / () დაშვებულია';
    if (t.replace(/\D/g, '').length < 5) return 'ცოტა მოკლეა — მინიმუმ 5 ციფრი';
    return null;
  },
  email: (v) => {
    const t = v.trim();
    if (!t) return null;
    if (!emailRe.test(t)) return 'არასწორი email ფორმატი';
    return null;
  },
  name: (v) => v.length > 200 ? 'მაქს. 200 სიმბოლო' : null,
  company: (v) => v.length > 200 ? 'მაქს. 200 სიმბოლო' : null,
  position: (v) => v.length > 120 ? 'მაქს. 120 სიმბოლო' : null,
  notes: (v) => v.length > 2000 ? 'მაქს. 2000 სიმბოლო' : null,
};
```

### Cell wiring

In `Cell()` (line 384):

```tsx
return (
  <EditableText
    value={String(row[col as EditableKey] ?? '')}
    placeholder="—"
    onCommit={(value) => onPatch({[col]: value} as Partial<Contact>)}
    multiline={col === 'notes'}
    validate={VALIDATORS[col as EditableKey]}
  />
);
```

### Visual indication

- Red text + light-red background fill on invalid cell
- `title` attribute = error message (browser tooltip on hover)
- Soft-block: cell still commits onBlur; **server accepts**, UI keeps the red flag until user fixes

### Strip / sanitize on commit (optional but recommended)

For `phone`: silently strip any character outside `[+\d\s\-()]` before commit. So if a user pastes `tel: +995 555 12 34`, commit stores `+995 555 12 34`.

```tsx
const sanitizePhone = (v: string) => v.replace(/[^+\d\s\-()]/g, '').trim();

// In commit:
if (col === 'phone') value = sanitizePhone(value);
```

Implement only if it doesn't surprise the user — better leave raw value and just flag.

## Acceptance criteria

✅ Type letter into phone cell — cell turns red + tooltip "მხოლოდ ციფრები..." appears
✅ Type valid `+995 555 12 34` → cell renders normally, no flag
✅ Bad email "not-an-email" → red flag + tooltip
✅ Long name (>200 chars) → red flag + truncation warning
✅ Empty fields stay valid (no false positives)
✅ Save still works in all cases (soft-block — invalid value persists with red flag)
✅ TypeScript pass + lint
✅ Existing tags / convert / unlink flows unchanged

## Files to modify

```
app/dmt/contacts/page.tsx    — add VALIDATORS map + extend EditableText with validate prop + wire in Cell()
```

## Files NOT to touch

- ❌ `lib/dmt/shared-state-server.ts` (server-side persistence stays as-is)
- ❌ Other DMT pages
- ❌ `app/api/dmt/contacts/**` routes
- ❌ Database schema / migrations

## Out of scope

- Hard-block save on invalid (keep soft-flag)
- E.164 international phone normalization
- DNS-based email verification
- Async checks (e.g., uniqueness)
- Custom keyboard layouts

## Test plan

1. `/dmt/contacts` open
2. Click cell phone column, type "abc123" → cell red, tooltip visible ✓
3. Replace with "+995 555 12 34" → cell black, no flag ✓
4. Click email cell, type "not-email" → red ✓
5. Replace with "user@example.com" → black ✓
6. Click name, type 250-char string → red flag with "მაქს. 200 სიმბოლო" ✓
7. All cells empty → all valid ✓
8. Refresh page → red flags clear, values persisted ✓
9. Run `npm run typecheck && npm run lint`
10. Update TODO.md → mark Task 052 done

## Notes for Codex

- Soft-validation philosophy: never block the user, just inform. Server side is already permissive.
- `phoneRe` allows international formats (`+995 555 12 34`, `(555) 12-34`). If user wants stricter format, expand later.
- Tooltip via `title` attribute is browser-native — no library needed. Sufficient for power users; can upgrade to Tippy later if non-technical users miss it.
- DESIGN_RULES tokens: red border via `border-red`, red bg via `bg-red-lt` — already used elsewhere (offer-editor.tsx).
