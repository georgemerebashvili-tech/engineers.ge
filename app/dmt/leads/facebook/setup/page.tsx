'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {
  Copy,
  Check,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ArrowLeft,
  Key,
  Link as LinkIcon,
  Shield,
  Database,
  Eye,
  EyeOff,
  Lock
} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';

type Config = {
  callbackUrl: string;
  verifyTokenMask: string | null;
  verifyTokenSet: boolean;
  appSecretMask: string | null;
  appSecretSet: boolean;
  pageTokenMask: string | null;
  pageTokenSet: boolean;
  ready: boolean;
  leadCount: number;
  latestLeadAt: string | null;
  graphVersion: string;
  error?: string;
};

type Revealed = {
  verifyToken: string | null;
  appSecret: string | null;
  pageToken: string | null;
};

export default function FacebookSetupPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dmt/fb-webhook/config');
      const data = await res.json();
      setCfg(res.ok ? data : {error: data.error || 'load_failed', ...data});
    } catch (e) {
      setCfg({error: e instanceof Error ? e.message : 'network'} as Config);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function copy(label: string, text: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 1500);
  }

  function hide() {
    setRevealed(null);
  }

  return (
    <DmtPageShell
      kicker="FACEBOOK LEAD ADS · INTEGRATION"
      title="Webhook Setup"
      subtitle="Meta Lead Ads → engineers.ge პირდაპირი სადენი. მნიშვნელობები დაცულია — გაიხსნება მხოლოდ ადმინის პაროლით."
      searchPlaceholder=""
      onQueryChange={() => {}}
    >
      <div className="px-6 py-5 md:px-8">
        <Link
          href="/dmt/leads/facebook"
          className="mb-4 inline-flex items-center gap-1 text-[12px] text-text-3 hover:text-blue"
        >
          <ArrowLeft size={12} /> Facebook ლიდებზე დაბრუნება
        </Link>

        {loading && <div className="text-[12px] text-text-3">იტვირთება…</div>}

        {cfg?.error === 'forbidden' && (
          <div className="rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            ეს გვერდი მხოლოდ owner/admin-ისთვის.
          </div>
        )}
        {cfg?.error === 'unauthorized' && (
          <div className="rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            სესია დასრულდა — <Link href="/dmt/login" className="underline">გადი ავტორიზაციაზე</Link>.
          </div>
        )}

        {cfg && !cfg.error && (
          <div className="space-y-5">
            {/* Status banner */}
            <div
              className={`rounded-[10px] border p-4 ${
                cfg.ready
                  ? 'border-grn-bd bg-grn-lt text-grn'
                  : 'border-ora-bd bg-ora-lt text-ora'
              }`}
            >
              <div className="flex items-start gap-2">
                {cfg.ready ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                )}
                <div className="text-[13px]">
                  <div className="font-bold">
                    {cfg.ready
                      ? 'Webhook კონფიგურირებულია · ახალი ლიდი რომ მოვა, ავტომატურად ჩაიწერება'
                      : 'Webhook ჯერ არაა ბოლომდე გამართული'}
                  </div>
                  <div className="mt-1 text-[11.5px] opacity-80">
                    მიღებული: <b>{cfg.leadCount}</b> ლიდი
                    {cfg.latestLeadAt && ` · ბოლო ${new Date(cfg.latestLeadAt).toLocaleString('en-GB')}`}
                  </div>
                </div>
              </div>
            </div>

            {/* Reveal bar */}
            <div
              className={`flex items-center justify-between gap-3 rounded-[10px] border px-4 py-2.5 ${
                revealed
                  ? 'border-grn-bd bg-grn-lt'
                  : 'border-bdr bg-sur'
              }`}
            >
              <div className="flex items-center gap-2 text-[12px]">
                {revealed ? (
                  <>
                    <Eye size={14} className="text-grn" />
                    <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-grn">
                      Secrets unlocked
                    </span>
                    <span className="text-text-3">· კოპირება შესაძლებელია</span>
                  </>
                ) : (
                  <>
                    <Lock size={14} className="text-text-3" />
                    <span className="font-mono text-[10.5px] font-bold uppercase tracking-[0.08em] text-text-2">
                      Secrets hidden
                    </span>
                    <span className="text-text-3">· გახსენი ადმინის პაროლით</span>
                  </>
                )}
              </div>
              {revealed ? (
                <button
                  onClick={hide}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 font-mono text-[11px] font-semibold text-text-2 hover:border-red hover:text-red"
                >
                  <EyeOff size={12} /> hide
                </button>
              ) : (
                <button
                  onClick={() => setRevealOpen(true)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-md border border-blue bg-blue px-3 font-mono text-[11px] font-semibold text-white hover:bg-blue/90"
                >
                  <Key size={12} /> reveal
                </button>
              )}
            </div>

            {/* Fields to paste */}
            <section className="rounded-[10px] border border-bdr bg-sur">
              <header className="border-b border-bdr px-4 py-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  Meta Dashboard-ში ჩასასმელი
                </div>
                <h2 className="mt-0.5 text-[15px] font-bold text-navy">
                  1. Callback URL + Verify Token
                </h2>
              </header>
              <div className="space-y-3 p-4">
                <Copyable
                  icon={LinkIcon}
                  label="Callback URL"
                  value={cfg.callbackUrl}
                  copied={copied === 'cb'}
                  onCopy={() => copy('cb', cfg.callbackUrl)}
                  hint="Meta for Developers → App → Products → Webhooks → Page → Callback URL-ში ჩასვი."
                />
                <Copyable
                  icon={Key}
                  label="Verify Token"
                  value={
                    revealed?.verifyToken ??
                    (cfg.verifyTokenMask ?? '')
                  }
                  copied={copied === 'vt'}
                  onCopy={() =>
                    revealed?.verifyToken && copy('vt', revealed.verifyToken)
                  }
                  missing={!cfg.verifyTokenSet}
                  locked={!revealed?.verifyToken}
                  hint="Verify Token-ის ველში. ეს ერთხელ ხელსასაწე string-ია — მერე Meta ყოველ delivery-ს signed requests-ად გაგიგზავნის."
                />
              </div>
            </section>

            {/* Env status */}
            <section className="rounded-[10px] border border-bdr bg-sur">
              <header className="border-b border-bdr px-4 py-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  Vercel env status
                </div>
                <h2 className="mt-0.5 text-[15px] font-bold text-navy">
                  2. სერვერის მხარეს
                </h2>
              </header>
              <div className="divide-y divide-bdr">
                <EnvRow
                  name="FB_VERIFY_TOKEN"
                  displayValue={
                    revealed?.verifyToken ?? cfg.verifyTokenMask
                  }
                  present={cfg.verifyTokenSet}
                  desc="Meta handshake token"
                />
                <EnvRow
                  name="FB_APP_SECRET"
                  displayValue={revealed?.appSecret ?? cfg.appSecretMask}
                  present={cfg.appSecretSet}
                  desc="HMAC signature verification · Meta → App → Settings → Basic → App Secret"
                />
                <EnvRow
                  name="FB_PAGE_ACCESS_TOKEN"
                  displayValue={revealed?.pageToken ?? cfg.pageTokenMask}
                  present={cfg.pageTokenSet}
                  desc="Graph API lead fetch · Meta → Access Tokens → Page access token (long-lived)"
                  optional
                />
              </div>
            </section>

            {/* Setup steps */}
            <section className="rounded-[10px] border border-bdr bg-sur-2 p-5">
              <h2 className="mb-3 text-[14px] font-bold text-navy">
                Meta Dashboard-ის steps
              </h2>
              <ol className="space-y-2 text-[12.5px] leading-relaxed text-text-2">
                <Step n={1}>
                  გადი <Ext href="https://developers.facebook.com/apps/">developers.facebook.com/apps</Ext> → <b>My Apps</b> → შენი App-ი (თუ არ გაქვს — Create App → Business).
                </Step>
                <Step n={2}>
                  <b>Add Product</b> → <b>Webhooks</b>.
                </Step>
                <Step n={3}>
                  <b>Page</b> → <b>Subscribe to this object</b>:
                  <ul className="mt-1 list-disc space-y-0.5 pl-5 font-mono text-[11.5px] text-text-3">
                    <li>Callback URL → ზემოდან Callback URL (copy)</li>
                    <li>Verify Token → ზემოდან Verify Token (reveal → copy)</li>
                    <li>Verify and Save</li>
                  </ul>
                </Step>
                <Step n={4}>
                  იმავე panel-ში → <b>Subscription Fields</b> → მონიშნე{' '}
                  <code className="rounded bg-sur px-1 py-0.5 font-mono text-[11px]">leadgen</code>.
                </Step>
                <Step n={5}>
                  <b>App → Settings → Basic</b> → <b>App Secret</b> (show) →
                  დააკოპირე → Vercel env <code>FB_APP_SECRET</code>.
                </Step>
                <Step n={6}>
                  <b>Tools → Graph API Explorer</b> → შენი Page-ი → <b>Generate Access Token</b> (scope:{' '}
                  <code>leads_retrieval, pages_read_engagement, pages_show_list</code>) →{' '}
                  <b>Extend → Long-Lived</b> → Vercel env <code>FB_PAGE_ACCESS_TOKEN</code>.
                </Step>
                <Step n={7}>
                  <Ext href="https://business.facebook.com/settings">business.facebook.com/settings</Ext> → Pages → შენი Page → Apps → დაამატე ეს App. შემდეგ Page-ი Subscribe გაუკეთე.
                </Step>
                <Step n={8}>
                  გაუშვი ტესტი: Meta for Developers → Webhooks → Page → <b>Test your server</b>{' '}
                  → ლიდი ამოვა ცოცხლად <Link href="/dmt/leads/facebook" className="text-blue underline">/dmt/leads/facebook</Link>-ზე.
                </Step>
              </ol>
            </section>

            {/* Security */}
            <section className="rounded-[10px] border border-blue-bd bg-blue-lt/50 p-4 text-[12px] leading-relaxed text-text-2">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-blue">
                <Shield size={12} /> Security
              </div>
              ყოველი POST-ი ვამოწმებ <code>X-Hub-Signature-256</code>-ით (HMAC-SHA256 <code>FB_APP_SECRET</code>-ით). Invalid signature → 401. Raw body-ს ვკითხულობ bytes-ად — parse-ის გარეშე — რომ verification სწორად მოხდეს. Leadgen_id-ის mismatch → skip. Graph API enrich fail-open (ძირითადი რაც webhook გამოგვიგზავნა მაინც ჩაიწერება). Secrets-ის გახსნა ამ გვერდზე audit-log-ში ფიქსირდება.
            </section>

            {/* Quick test */}
            <section className="rounded-[10px] border border-bdr bg-sur-2 p-4 text-[12px] leading-relaxed text-text-2">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-text-3">
                <Database size={12} /> Verify manually
              </div>
              <code className="block break-all rounded bg-sur p-2 font-mono text-[10.5px] text-navy">
                curl &quot;{cfg.callbackUrl}?hub.mode=subscribe&amp;hub.challenge=abc&amp;hub.verify_token={revealed?.verifyToken ?? '<TOKEN>'}&quot;
              </code>
              <p className="mt-1.5 text-[11px] text-text-3">
                უნდა დააბრუნოს: <code className="rounded bg-sur px-1">abc</code>.
                სხვანაირად 403.
              </p>
            </section>
          </div>
        )}
      </div>

      {revealOpen && (
        <RevealModal
          onClose={() => setRevealOpen(false)}
          onReveal={(data) => {
            setRevealed(data);
            setRevealOpen(false);
          }}
        />
      )}
    </DmtPageShell>
  );
}

function RevealModal({
  onClose,
  onReveal
}: {
  onClose: () => void;
  onReveal: (data: Revealed) => void;
}) {
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (!password) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/dmt/fb-webhook/config/reveal', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({password})
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(
          data.error === 'wrong_password'
            ? 'პაროლი არასწორია'
            : data.error === 'locked'
              ? 'ბევრი ცდა — სცადე 15 წუთში'
              : data.message || data.error || 'შეცდომა'
        );
        return;
      }
      onReveal(data as Revealed);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'network');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[400px] rounded-[12px] border border-bdr bg-sur shadow-lg"
      >
        <header className="flex items-start gap-2 border-b border-bdr px-5 py-4">
          <Lock size={16} className="mt-0.5 text-blue" />
          <div>
            <div className="text-[14px] font-bold text-navy">Secrets-ის გახსნა</div>
            <div className="mt-0.5 text-[11.5px] text-text-3">
              შეიყვანე შენი ადმინის პაროლი — ტოკენები გამოჩნდება მხოლოდ ამ session-ში.
            </div>
          </div>
        </header>
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              Admin Password
            </label>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
                if (e.key === 'Escape') onClose();
              }}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] text-navy focus:border-blue focus:outline-none"
              placeholder="••••••••"
            />
            {err && (
              <p className="mt-1.5 text-[11.5px] text-red">{err}</p>
            )}
          </div>
        </div>
        <footer className="flex items-center justify-end gap-2 border-t border-bdr px-5 py-3">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-9 rounded-md border border-bdr bg-sur-2 px-3 font-mono text-[11px] font-semibold text-text-2 hover:border-text-3 disabled:opacity-50"
          >
            cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !password}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue bg-blue px-4 font-mono text-[11px] font-semibold text-white hover:bg-blue/90 disabled:opacity-50"
          >
            {busy ? 'მოწმდება…' : 'unlock'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Copyable({
  icon: Icon,
  label,
  value,
  copied,
  onCopy,
  hint,
  missing,
  locked
}: {
  icon: React.ComponentType<{size?: number; className?: string; strokeWidth?: number}>;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  hint?: string;
  missing?: boolean;
  locked?: boolean;
}) {
  const disabled = missing || locked;
  const displayValue = missing
    ? '(env var ჯერ არ არის)'
    : value;
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
        <Icon size={11} /> {label}
        {locked && !missing && (
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-sur-2 px-1.5 py-0.5 font-mono text-[9px] text-text-3">
            <Lock size={9} /> locked
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={displayValue}
          className={`flex-1 rounded-md border bg-sur-2 px-3 py-2 font-mono text-[12px] focus:outline-none ${
            missing
              ? 'border-ora-bd text-ora'
              : locked
                ? 'border-bdr text-text-3'
                : 'border-bdr text-navy focus:border-blue'
          }`}
          onClick={(e) => !disabled && (e.target as HTMLInputElement).select()}
        />
        <button
          disabled={disabled}
          onClick={onCopy}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[11px] font-semibold transition-colors ${
            copied
              ? 'border-grn bg-grn text-white'
              : 'border-bdr bg-sur-2 text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-text-3">{hint}</p>}
    </div>
  );
}

function EnvRow({
  name,
  displayValue,
  present,
  desc,
  optional
}: {
  name: string;
  displayValue: string | null;
  present: boolean;
  desc: string;
  optional?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 px-4 py-3">
      <div className="mt-0.5 shrink-0">
        {present ? (
          <CheckCircle2 size={14} className="text-grn" />
        ) : optional ? (
          <AlertCircle size={14} className="text-text-3" />
        ) : (
          <AlertCircle size={14} className="text-ora" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <code className="font-mono text-[11.5px] font-bold text-navy">{name}</code>
          {optional && (
            <span className="rounded-full bg-sur-2 px-1.5 py-0.5 font-mono text-[9px] text-text-3">
              optional
            </span>
          )}
          <span
            className={`truncate font-mono text-[10.5px] ${
              present ? 'text-grn' : optional ? 'text-text-3' : 'text-ora'
            }`}
          >
            {present ? displayValue : 'not set'}
          </span>
        </div>
        <p className="mt-0.5 text-[11px] text-text-3">{desc}</p>
      </div>
    </div>
  );
}

function Step({n, children}: {n: number; children: React.ReactNode}) {
  return (
    <li className="flex gap-2.5">
      <span className="shrink-0 inline-flex h-5 w-5 items-center justify-center rounded-full bg-navy text-[10.5px] font-bold text-white">
        {n}
      </span>
      <span>{children}</span>
    </li>
  );
}

function Ext({href, children}: {href: string; children: React.ReactNode}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-0.5 font-semibold text-blue hover:underline"
    >
      {children}
      <ExternalLink size={10} />
    </a>
  );
}
