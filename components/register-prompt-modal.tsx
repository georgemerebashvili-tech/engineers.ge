'use client';

import {useEffect, useMemo, useRef, useState, useTransition} from 'react';
import {
  X,
  UserPlus,
  Sparkles,
  ChevronDown,
  Check,
  Search,
  Plus
} from 'lucide-react';
import {OAuthButtons} from './oauth-buttons';

type Props = {
  open: boolean;
  onClose: () => void;
};

type Country = {
  id: number;
  code: string | null;
  name_ka: string;
  name_en: string;
  flag_emoji: string | null;
};

const LANGS: {value: string; label: string; flag: string}[] = [
  {value: 'ka', label: 'ქართული', flag: '🇬🇪'},
  {value: 'en', label: 'English', flag: '🇬🇧'},
  {value: 'ru', label: 'Русский', flag: '🇷🇺'},
  {value: 'tr', label: 'Türkçe', flag: '🇹🇷'},
  {value: 'az', label: 'Azərbaycanca', flag: '🇦🇿'},
  {value: 'hy', label: 'Հայերեն', flag: '🇦🇲'}
];

const INTEREST_SUGGESTIONS: {value: string; label: string}[] = [
  {value: 'hvac', label: 'HVAC'},
  {value: 'ventilation', label: 'ვენტილაცია'},
  {value: 'electrical', label: 'ელექტრო'},
  {value: 'low-voltage', label: 'სუსტი დენები'},
  {value: 'fire-safety', label: 'სახანძრო'},
  {value: 'plumbing', label: 'წყალკანალი'},
  {value: 'heat-load', label: 'თბოდანაკარგი'},
  {value: 'cad', label: 'CAD'},
  {value: 'bms', label: 'BMS'},
  {value: 'energy', label: 'ენერგოეფექტურობა'}
];

export function RegisterPromptModal({open, onClose}: Props) {
  const [step, setStep] = useState<'intro' | 'form' | 'done'>('intro');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [language, setLanguage] = useState('ka');
  const [profession, setProfession] = useState('');
  const [interests, setInterests] = useState<string[]>([]);
  const [country, setCountry] = useState<Country | null>(null);
  const [countryQuery, setCountryQuery] = useState('');
  const [countryOpen, setCountryOpen] = useState(false);
  const [countries, setCountries] = useState<Country[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    fetch('/api/countries')
      .then((r) => r.json())
      .then((d) => setCountries(d.countries ?? []))
      .catch(() => {});
  }, [open]);

  const filteredCountries = useMemo(() => {
    const q = countryQuery.trim().toLowerCase();
    if (!q) return countries.slice(0, 40);
    return countries
      .filter(
        (c) =>
          c.name_ka.toLowerCase().includes(q) ||
          c.name_en.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [countries, countryQuery]);

  const canSubmit =
    name.trim().length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) &&
    password.length >= 8 &&
    !!language;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);

    start(async () => {
      const payload: {
        email: string;
        name: string;
        password: string;
        language: string;
        profession: string | null;
        interests?: string[];
        country_id?: number | null;
        country_name?: string;
      } = {
        email,
        name,
        password,
        language,
        profession: profession.trim() || null
      };

      if (interests.length > 0) payload.interests = interests;

      if (country) {
        payload.country_id = country.id;
      } else if (countryQuery.trim()) {
        payload.country_name = countryQuery.trim();
      }

      const res = await fetch('/api/register', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msgMap: Record<string, string> = {
          email_taken: data.message || 'ეს email უკვე დარეგისტრირებულია',
          disposable_email:
            data.message ||
            'ერთჯერადი email-ებით რეგისტრაცია არ არის ნებადართული.',
          bad_request: 'შეამოწმე შევსებული ველები'
        };
        setError(msgMap[data.error ?? ''] ?? 'რეგისტრაცია ვერ შესრულდა');
        return;
      }
      setStep('done');
    });
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-navy/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-10 flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-[var(--radius-card)] border bg-sur shadow-[var(--shadow-modal)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-sur-2 hover:text-navy"
          aria-label="დახურვა"
        >
          <X size={16} />
        </button>

        <div className="flex-1 overflow-y-auto p-7 md:p-8">
          {step === 'intro' && (
            <Intro onStart={() => setStep('form')} onLater={onClose} />
          )}
          {step === 'form' && (
            <form onSubmit={submit} className="space-y-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
                  <Sparkles size={12} />
                  რეგისტრაცია
                </span>
                <h2 className="mt-4 text-[20px] font-bold leading-snug text-navy">
                  შექმენი უფასო ანგარიში
                </h2>
                <p className="mt-1 text-[12px] text-text-3">
                  ყველა ველი ქართულად ან ინგლისურად. 8+ სიმბოლო პაროლი.
                </p>
              </div>

              <Field label="სახელი და გვარი">
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  className="input"
                />
              </Field>

              <Field label="ელ-ფოსტა">
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="input"
                />
              </Field>

              <Field label="პაროლი (8+)">
                <input
                  required
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="input"
                />
              </Field>

              <Field label="პროფესია (არასავალდებულო)">
                <input
                  value={profession}
                  onChange={(e) => setProfession(e.target.value)}
                  placeholder="მაგ. HVAC ინჟინერი, სტუდენტი, არქიტექტორი"
                  className="input"
                />
              </Field>

              <InterestsField value={interests} onChange={setInterests} />

              <div className="grid grid-cols-2 gap-3">
                <Field label="ენა">
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input"
                  >
                    {LANGS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.flag} {l.label}
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="ქვეყანა">
                  <CountrySelect
                    value={country}
                    query={countryQuery}
                    onQuery={setCountryQuery}
                    options={filteredCountries}
                    open={countryOpen}
                    onOpen={setCountryOpen}
                    onSelect={(c) => {
                      setCountry(c);
                      setCountryQuery(c ? c.name_ka : '');
                      setCountryOpen(false);
                    }}
                  />
                </Field>
              </div>

              {error && (
                <p className="rounded-md border border-red-bd bg-red-lt px-3 py-2 text-[12px] text-red">
                  {error}
                </p>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="submit"
                  disabled={!canSubmit || pending}
                  className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <UserPlus size={14} />
                  {pending ? 'იქმნება…' : 'რეგისტრაცია'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('intro')}
                  className="inline-flex h-10 items-center justify-center rounded-md border bg-sur px-4 text-[12.5px] font-semibold text-text-2 hover:bg-sur-2"
                >
                  უკან
                </button>
              </div>
            </form>
          )}
          {step === 'done' && (
            <Done
              name={name}
              onClose={() => {
                onClose();
                setStep('intro');
              }}
            />
          )}
        </div>
      </div>

      <style jsx>{`
        :global(.input) {
          width: 100%;
          height: 40px;
          border-radius: 6px;
          border: 1px solid var(--bdr);
          background: var(--sur);
          padding: 0 12px;
          font-size: 13px;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.input:focus) {
          border-color: var(--blue);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--blue) 20%, transparent);
        }
      `}</style>
    </div>
  );
}

function Intro({onStart, onLater}: {onStart: () => void; onLater: () => void}) {
  return (
    <>
      <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
        <Sparkles size={12} />
        FREE · უფასო
      </span>

      <h2 className="mt-4 text-[20px] font-bold leading-snug text-navy md:text-[22px]">
        რჩეული ხელსაწყოებისთვის გაიარე რეგისტრაცია
      </h2>
      <p className="mt-3 text-[13.5px] leading-relaxed text-text-2">
        რეგისტრაცია <strong>სრულიად უფასოა</strong>. მისი მიზანია დავადგინოთ, რომ
        ჩვენი მომხმარებელი არის <strong>ინჟინერი</strong>, ინჟინერიის მოყვარული
        ან დაინტერესებული ადამიანი — რომ უკეთ მოვარგოთ კონტენტი, სტანდარტები და
        ხელსაწყოები.
      </p>

      <ul className="mt-4 space-y-2 text-[13px] text-text-2">
        <li className="flex items-start gap-2.5">
          <span className="mt-[2px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-grn-lt text-grn">
            ✓
          </span>
          რჩეული ხელსაწყოების შენახვა
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-[2px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-grn-lt text-grn">
            ✓
          </span>
          პროექტების online არქივი (მალე)
        </li>
        <li className="flex items-start gap-2.5">
          <span className="mt-[2px] inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-grn-lt text-grn">
            ✓
          </span>
          კალკულაციის ისტორია და PDF ექსპორტი
        </li>
      </ul>

      <div className="mt-6">
        <OAuthButtons next="/" />
        <div className="my-4 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-text-3">
          <span className="h-px flex-1 bg-bdr" />
          ან email-ით
          <span className="h-px flex-1 bg-bdr" />
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition hover:opacity-90"
          >
            <UserPlus size={14} />
            Email + პაროლი
          </button>
          <button
            type="button"
            onClick={onLater}
            className="inline-flex h-10 items-center justify-center rounded-md border bg-sur px-4 text-[12.5px] font-semibold text-text-2 hover:bg-sur-2"
          >
            მოგვიანებით
          </button>
        </div>
      </div>
    </>
  );
}

function Done({name, onClose}: {name: string; onClose: () => void}) {
  return (
    <div className="py-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-14 w-14 items-center justify-center rounded-full bg-grn-lt text-grn">
        <Check size={28} strokeWidth={2.5} />
      </div>
      <h2 className="text-[20px] font-bold text-navy">
        გმადლობთ, {name.split(' ')[0]}!
      </h2>
      <p className="mt-2 text-[13px] text-text-2">
        რეგისტრაცია წარმატებით შესრულდა. Email verification გამოცხადდება მალე.
      </p>
      <button
        type="button"
        onClick={onClose}
        className="mt-5 inline-flex h-10 items-center justify-center rounded-md bg-blue px-5 text-[13px] font-semibold text-white transition hover:opacity-90"
      >
        დახურვა
      </button>
    </div>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
        {label}
      </span>
      {children}
    </label>
  );
}

function InterestsField({
  value,
  onChange
}: {
  value: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v));
    else if (value.length < 12) onChange([...value, v]);
  };
  return (
    <div className="block space-y-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
        ინტერესები (არასავალდებულო)
      </span>
      <div className="flex flex-wrap gap-1.5">
        {INTEREST_SUGGESTIONS.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggle(opt.value)}
              aria-pressed={active}
              className={`inline-flex h-7 items-center gap-1 rounded-full border px-2.5 text-[11.5px] font-semibold transition-colors ${
                active
                  ? 'border-blue bg-blue text-white'
                  : 'border-bdr bg-sur text-text-2 hover:border-blue-bd hover:text-blue'
              }`}
            >
              {active && <Check size={11} />}
              {opt.label}
            </button>
          );
        })}
      </div>
      {value.length > 0 && (
        <p className="font-mono text-[10px] text-text-3">
          არჩეულია {value.length}/12
        </p>
      )}
    </div>
  );
}

function CountrySelect({
  value,
  query,
  onQuery,
  options,
  open,
  onOpen,
  onSelect
}: {
  value: Country | null;
  query: string;
  onQuery: (q: string) => void;
  options: Country[];
  open: boolean;
  onOpen: (b: boolean) => void;
  onSelect: (c: Country | null) => void;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) onOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open, onOpen]);

  const showAddNew =
    query.trim().length >= 2 &&
    !options.some(
      (c) =>
        c.name_ka.toLowerCase() === query.trim().toLowerCase() ||
        c.name_en.toLowerCase() === query.trim().toLowerCase()
    );

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => onOpen(!open)}
        aria-label={value ? `აირჩეული ქვეყანა: ${value.name_ka}. ცვლილებისთვის დააჭირე` : 'აირჩიე ქვეყანა'}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex w-full items-center justify-between text-left"
      >
        <span className="truncate text-[13px]">
          {value ? (
            <>
              {value.flag_emoji} {value.name_ka}
            </>
          ) : query ? (
            query
          ) : (
            <span className="text-text-3">აირჩიე</span>
          )}
        </span>
        <ChevronDown size={14} className="text-text-3" aria-hidden="true" />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-hidden rounded-md border border-bdr bg-sur shadow-lg">
          <div className="flex items-center gap-1.5 border-b border-bdr px-2 py-1.5">
            <Search size={14} className="text-text-3" aria-hidden="true" />
            <input
              type="text"
              value={query}
              onChange={(e) => onQuery(e.target.value)}
              placeholder="მოძებნე ან დაამატე"
              aria-label="ქვეყნის ძებნა"
              className="flex-1 bg-transparent text-[12px] outline-none"
              autoFocus
            />
          </div>
          <ul role="listbox" aria-label="ქვეყნების სია" className="max-h-52 overflow-y-auto py-1">
            {options.map((c) => (
              <li key={c.id} role="option" aria-selected={value?.id === c.id}>
                <button
                  type="button"
                  onClick={() => onSelect(c)}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-[12px] hover:bg-sur-2 focus:bg-sur-2 focus:outline-none ${
                    value?.id === c.id ? 'bg-blue-lt text-blue' : ''
                  }`}
                >
                  <span aria-hidden="true">{c.flag_emoji ?? '🏳️'}</span>
                  <span className="flex-1 truncate">{c.name_ka}</span>
                  <span className="font-mono text-[10px] text-text-3">
                    {c.code ?? ''}
                  </span>
                </button>
              </li>
            ))}
            {showAddNew && (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(null);
                    onOpen(false);
                  }}
                  className="flex w-full items-center gap-2 border-t border-bdr px-3 py-2 text-left text-[12px] text-blue hover:bg-blue-lt"
                >
                  <Plus size={14} />
                  <span className="flex-1">
                    დაამატე: <strong>&ldquo;{query.trim()}&rdquo;</strong>
                  </span>
                </button>
              </li>
            )}
            {options.length === 0 && !showAddNew && (
              <li className="px-3 py-3 text-center text-[11px] text-text-3">
                ჩანაწერი ვერ მოიძებნა
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
