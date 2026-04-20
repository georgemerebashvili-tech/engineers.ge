'use client';

import {useEffect, useState} from 'react';
import {Cookie, X, Check, Settings as SettingsIcon, ChevronDown} from 'lucide-react';

/**
 * Cookie consent banner with 3 levels:
 *   - essential  — always on (session, language, admin auth). Cannot opt out.
 *   - analytics  — page_views, calc_events. Respected by tracking hooks.
 *   - marketing  — referral attribution, ad impressions. Respected by ads pipeline.
 *
 * Choice is stored in `eng_cookie_consent` cookie (1 year) so it survives
 * across visits and can be read server-side (future gating of analytics
 * beacons). Server code that reads it should fail-open (treat missing as
 * "essential-only" until user makes an explicit choice).
 */

type Level = 'essential' | 'analytics' | 'marketing';

type Consent = {
  essential: true;
  analytics: boolean;
  marketing: boolean;
  decided_at: string;
};

const COOKIE_NAME = 'eng_cookie_consent';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readConsent(): Consent | null {
  if (typeof document === 'undefined') return null;
  const raw = document.cookie
    .split('; ')
    .find((c) => c.startsWith(`${COOKIE_NAME}=`))
    ?.split('=')[1];
  if (!raw) return null;
  try {
    const parsed = JSON.parse(decodeURIComponent(raw));
    if (typeof parsed !== 'object' || parsed === null) return null;
    return {
      essential: true,
      analytics: parsed.analytics === true,
      marketing: parsed.marketing === true,
      decided_at: parsed.decided_at ?? new Date().toISOString()
    };
  } catch {
    return null;
  }
}

function writeConsent(c: Omit<Consent, 'decided_at'>): void {
  const value: Consent = {...c, decided_at: new Date().toISOString()};
  const encoded = encodeURIComponent(JSON.stringify(value));
  document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax${
    window.location.protocol === 'https:' ? '; secure' : ''
  }`;
}

const OPEN_EVENT = 'eng:open-cookie-consent';

/** Trigger used by footer "Manage cookies" link to re-open the banner. */
export function openCookieConsent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

export function CookieConsent() {
  const [hydrated, setHydrated] = useState(false);
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);

  useEffect(() => {
    setHydrated(true);
    const existing = readConsent();
    if (!existing) setVisible(true);
    else {
      setAnalytics(existing.analytics);
      setMarketing(existing.marketing);
    }
  }, []);

  useEffect(() => {
    const open = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);

  function decide(levels: Partial<Record<Level, boolean>>, action: 'decide' | 'reopen' = 'decide') {
    const resolved = {
      essential: true as const,
      analytics: levels.analytics ?? analytics,
      marketing: levels.marketing ?? marketing
    };
    writeConsent(resolved);
    setVisible(false);
    try {
      const payload = JSON.stringify({
        analytics: resolved.analytics,
        marketing: resolved.marketing,
        action,
        pathname: window.location.pathname
      });
      const blob = new Blob([payload], {type: 'application/json'});
      if (navigator.sendBeacon?.('/api/consent', blob)) return;
      void fetch('/api/consent', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: payload,
        keepalive: true
      });
    } catch {
      // swallow — banner already dismissed
    }
  }

  if (!hydrated || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-[100] p-3 md:p-4"
    >
      <div className="mx-auto max-w-3xl rounded-card border border-bdr bg-sur shadow-xl">
        <div className="flex items-start gap-3 p-4">
          <span className="hidden sm:inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
            <Cookie size={18} />
          </span>
          <div className="flex-1 min-w-0">
            <h2 className="text-[14px] font-semibold text-navy">ქუქიების გამოყენება</h2>
            <p className="mt-0.5 text-[12px] leading-relaxed text-text-2">
              engineers.ge იყენებს აუცილებელ ქუქიებს (სესია, ენა) — ისინი აუცილებელია საიტის
              ფუნქციონირებისთვის. ანალიტიკა და marketing — არჩევითი.
            </p>

            {/* Granular controls */}
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="mt-2 inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3 hover:text-navy"
            >
              <SettingsIcon size={11} />
              დეტალურად
              <ChevronDown
                size={11}
                strokeWidth={2.2}
                className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
              />
            </button>

            {expanded && (
              <div className="mt-3 space-y-2 rounded-md border border-bdr bg-sur-2 p-3">
                <ConsentRow
                  label="აუცილებელი"
                  hint="სესია, ენა, admin auth — ყოველთვის ჩართულია."
                  checked
                  disabled
                  onChange={() => {}}
                />
                <ConsentRow
                  label="ანალიტიკა"
                  hint="page_views, calc_events, device breakdown — admin-ისთვის საიტის გაუმჯობესების მიზნით."
                  checked={analytics}
                  onChange={setAnalytics}
                />
                <ConsentRow
                  label="Marketing"
                  hint="Referral attribution, reklamis ჩვენების ეფექტიანობა. Default: off."
                  checked={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => decide({analytics: false, marketing: false})}
            className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:bg-sur-2 hover:text-navy"
            aria-label="მხოლოდ აუცილებელი"
            title="მხოლოდ აუცილებელი"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-bdr bg-sur-2 p-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={() => decide({analytics: false, marketing: false})}
            className="h-9 rounded-md border border-bdr bg-sur px-4 text-[12px] font-semibold text-text-2 hover:bg-sur-2"
          >
            მხოლოდ აუცილებელი
          </button>
          {expanded ? (
            <button
              type="button"
              onClick={() => decide({analytics, marketing})}
              className="h-9 rounded-md border border-blue bg-blue px-4 text-[12px] font-semibold text-white hover:bg-blue/90 inline-flex items-center gap-1"
            >
              <Check size={14} />
              შენახე არჩევანი
            </button>
          ) : (
            <button
              type="button"
              onClick={() => decide({analytics: true, marketing: true})}
              className="h-9 rounded-md border border-emerald-600 bg-emerald-600 px-4 text-[12px] font-semibold text-white hover:bg-emerald-700 inline-flex items-center gap-1"
            >
              <Check size={14} />
              ყველა მიღება
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function ConsentRow({
  label,
  hint,
  checked,
  disabled,
  onChange
}: {
  label: string;
  hint: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className={`flex items-start gap-3 ${disabled ? 'opacity-70' : 'cursor-pointer'}`}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 shrink-0 rounded border-bdr"
      />
      <div className="min-w-0 flex-1">
        <span className="block text-[12px] font-semibold text-navy">{label}</span>
        <span className="block text-[11px] text-text-2">{hint}</span>
      </div>
    </label>
  );
}

/**
 * Server-callable helper: reads the consent cookie from headers. Returns null
 * if the user hasn't made a choice yet (treat as essential-only). Use in
 * analytics-gating server code.
 */
export type ConsentReader = () => {
  analytics: boolean;
  marketing: boolean;
} | null;
