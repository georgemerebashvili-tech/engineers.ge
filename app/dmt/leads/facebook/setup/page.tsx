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
  Lock,
  Pencil,
  Sparkles,
  X,
  Save
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
  settingsUpdatedAt: string | null;
  error?: string;
};

type Revealed = {
  verifyToken: string | null;
  appSecret: string | null;
  pageToken: string | null;
};

type FieldKey = 'verifyToken' | 'appSecret' | 'pageToken';

export default function FacebookSetupPage() {
  const [cfg, setCfg] = useState<Config | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Revealed | null>(null);
  const [revealOpen, setRevealOpen] = useState(false);
  const [editField, setEditField] = useState<FieldKey | null>(null);
  const [generateField, setGenerateField] = useState<FieldKey | null>(null);

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

  async function onEditSaved(
    field: FieldKey,
    newVal: string | null,
    generated?: string
  ) {
    setEditField(null);
    setGenerateField(null);
    await load();
    // If user just set a value, surface it in revealed view so they can copy.
    const value = generated ?? newVal;
    if (value != null) {
      setRevealed((prev) => ({
        verifyToken: field === 'verifyToken' ? value : prev?.verifyToken ?? null,
        appSecret: field === 'appSecret' ? value : prev?.appSecret ?? null,
        pageToken: field === 'pageToken' ? value : prev?.pageToken ?? null
      }));
    }
  }

  return (
    <DmtPageShell
      kicker="FACEBOOK LEAD ADS · INTEGRATION"
      title="Webhook Setup"
      subtitle="Meta Lead Ads → engineers.ge პირდაპირი სადენი. Secrets DB-ში ინახება — შეგიძლია UI-დან შეცვლა ადმინის პაროლით."
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
                    <span className="text-text-3">· კოპირება + ჩასწორება შესაძლებელია</span>
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
                <EditableSecret
                  icon={Key}
                  label="Verify Token"
                  fieldKey="verifyToken"
                  mask={cfg.verifyTokenMask}
                  isSet={cfg.verifyTokenSet}
                  revealedValue={revealed?.verifyToken ?? null}
                  copied={copied === 'vt'}
                  onCopy={() =>
                    revealed?.verifyToken && copy('vt', revealed.verifyToken)
                  }
                  onEdit={() => setEditField('verifyToken')}
                  onGenerate={() => setGenerateField('verifyToken')}
                  hint="Verify Token-ის ველში. Meta ამ string-ით verification-ს აკეთებს. Generate → შემთხვევით უსაფრთხო string."
                />
              </div>
            </section>

            {/* Env status / DB values */}
            <section className="rounded-[10px] border border-bdr bg-sur">
              <header className="border-b border-bdr px-4 py-3">
                <div className="font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
                  Secrets (DB)
                </div>
                <h2 className="mt-0.5 text-[15px] font-bold text-navy">
                  2. სერვერის მხარეს
                </h2>
                {cfg.settingsUpdatedAt && (
                  <div className="mt-0.5 text-[11px] text-text-3">
                    ბოლო ცვლილება: {new Date(cfg.settingsUpdatedAt).toLocaleString('en-GB')}
                  </div>
                )}
              </header>
              <div className="divide-y divide-bdr">
                <SecretRow
                  name="Verify Token"
                  displayValue={
                    revealed?.verifyToken ?? cfg.verifyTokenMask
                  }
                  present={cfg.verifyTokenSet}
                  desc="Meta handshake token"
                  onEdit={() => setEditField('verifyToken')}
                />
                <SecretRow
                  name="App Secret"
                  displayValue={revealed?.appSecret ?? cfg.appSecretMask}
                  present={cfg.appSecretSet}
                  desc="HMAC signature verification · Meta → App → Settings → Basic → App Secret"
                  onEdit={() => setEditField('appSecret')}
                />
                <SecretRow
                  name="Page Access Token"
                  displayValue={revealed?.pageToken ?? cfg.pageTokenMask}
                  present={cfg.pageTokenSet}
                  desc="Graph API lead fetch · Meta → Access Tokens → Page access token (long-lived)"
                  optional
                  onEdit={() => setEditField('pageToken')}
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
                  გადი <Ext href="https://developers.facebook.com/apps/">developers.facebook.com/apps</Ext> → შენი App.
                </Step>
                <Step n={2}>
                  <b>Add Product</b> → <b>Webhooks</b>.
                </Step>
                <Step n={3}>
                  <b>Page</b> → <b>Subscribe to this object</b>: Callback URL + Verify Token (ზევით copy).
                </Step>
                <Step n={4}>
                  <b>Subscription Fields</b> → მონიშნე <code className="rounded bg-sur px-1 py-0.5 font-mono text-[11px]">leadgen</code>.
                </Step>
                <Step n={5}>
                  <b>App → Settings → Basic</b> → <b>App Secret</b> (show) → ამ გვერდზე ჩაწერე App Secret-ის ველში.
                </Step>
                <Step n={6}>
                  <b>Tools → Graph API Explorer</b> → Page Access Token (long-lived, scope:{' '}
                  <code>leads_retrieval, pages_read_engagement, pages_show_list</code>) → ამ გვერდზე ჩაწერე Page Access Token-ის ველში.
                </Step>
                <Step n={7}>
                  <Ext href="https://business.facebook.com/settings">business.facebook.com/settings</Ext> → Pages → Apps → დაამატე App. Subscribe Page.
                </Step>
                <Step n={8}>
                  Meta → Webhooks → <b>Test your server</b> → ლიდი ამოვა <Link href="/dmt/leads/facebook" className="text-blue underline">/dmt/leads/facebook</Link>-ზე.
                </Step>
              </ol>
            </section>

            {/* Security */}
            <section className="rounded-[10px] border border-blue-bd bg-blue-lt/50 p-4 text-[12px] leading-relaxed text-text-2">
              <div className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.06em] text-blue">
                <Shield size={12} /> Security
              </div>
              Secrets ინახება DB-ში (<code>dmt_fb_webhook_settings</code>, service-role only). POST-ს ვამოწმებ <code>X-Hub-Signature-256</code>-ით (HMAC-SHA256 App Secret-ით) — raw bytes. Invalid → 401. Graph API enrich fail-open. ნებისმიერი reveal/update/failed attempt audit_log-ში იწერება.
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

      {editField && (
        <EditModal
          field={editField}
          generate={generateField === editField}
          onClose={() => {
            setEditField(null);
            setGenerateField(null);
          }}
          onSaved={(val, generated) => onEditSaved(editField, val, generated)}
        />
      )}
    </DmtPageShell>
  );
}

/* ------------------------------------------------------------------ */
/* Reveal modal                                                       */
/* ------------------------------------------------------------------ */

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
    <ModalShell title="Secrets-ის გახსნა" subtitle="შეიყვანე შენი ადმინის პაროლი." onClose={onClose}>
      <PasswordBody
        password={password}
        setPassword={setPassword}
        err={err}
        busy={busy}
        onSubmit={submit}
        onClose={onClose}
        submitLabel="unlock"
      />
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Edit modal                                                         */
/* ------------------------------------------------------------------ */

const FIELD_META: Record<
  FieldKey,
  {label: string; hint: string; canGenerate: boolean}
> = {
  verifyToken: {
    label: 'Verify Token',
    hint: 'string რომლის გასაცვლელად Meta-ს შევესაბამებით handshake-ისას. შენ თვითონ ირჩევ. Generate → 32-bytes secure random.',
    canGenerate: true
  },
  appSecret: {
    label: 'App Secret',
    hint: 'Meta → App → Settings → Basic → App Secret (Show). HMAC-ის ხელს აწერს ყოველ POST-ზე.',
    canGenerate: false
  },
  pageToken: {
    label: 'Page Access Token',
    hint: 'Meta → Tools → Graph API Explorer → long-lived Page token (scope: leads_retrieval, pages_read_engagement, pages_show_list).',
    canGenerate: false
  }
};

function EditModal({
  field,
  generate,
  onClose,
  onSaved
}: {
  field: FieldKey;
  generate: boolean;
  onClose: () => void;
  onSaved: (val: string | null, generated?: string) => void;
}) {
  const meta = FIELD_META[field];
  const [value, setValue] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [doGenerate, setDoGenerate] = useState(generate);

  async function submit() {
    if (!password) {
      setErr('პაროლი აუცილებელია');
      return;
    }
    if (!doGenerate && value.length === 0) {
      setErr('ცარიელი — ველი წაიშლება. Clear-ისთვის ცალკე ღილაკი გამოიყენე.');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const body: Record<string, unknown> = {password};
      if (doGenerate) {
        body.generateVerifyToken = true;
      } else {
        body[field] = value;
      }
      const res = await fetch('/api/dmt/fb-webhook/config/update', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(
          data.error === 'wrong_password'
            ? 'პაროლი არასწორია'
            : data.message || data.error || 'შეცდომა'
        );
        return;
      }
      onSaved(doGenerate ? null : value, data.generatedVerifyToken);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'network');
    } finally {
      setBusy(false);
    }
  }

  async function clear() {
    if (!password) {
      setErr('წასაშლელად პაროლი შეიყვანე');
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch('/api/dmt/fb-webhook/config/update', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({password, [field]: ''})
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.message || data.error || 'შეცდომა');
        return;
      }
      onSaved(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'network');
    } finally {
      setBusy(false);
    }
  }

  return (
    <ModalShell
      title={`${meta.label}-ის შეცვლა`}
      subtitle={meta.hint}
      onClose={onClose}
    >
      <div className="space-y-3 p-5">
        {meta.canGenerate && (
          <label className="flex items-start gap-2 rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[12px] text-text-2">
            <input
              type="checkbox"
              checked={doGenerate}
              onChange={(e) => setDoGenerate(e.target.checked)}
              className="mt-0.5"
            />
            <div>
              <div className="font-semibold text-navy">ავტომატურად დააგენერირე</div>
              <div className="mt-0.5 text-[11px] text-text-3">
                crypto.randomBytes(32) → base64url · Meta-სთვის სრულიად safe
              </div>
            </div>
          </label>
        )}

        {!doGenerate && (
          <div>
            <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
              ახალი მნიშვნელობა
            </label>
            <textarea
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              rows={field === 'pageToken' ? 4 : 2}
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 font-mono text-[12px] text-navy focus:border-blue focus:outline-none"
              placeholder="Meta-დან copy-paste…"
            />
          </div>
        )}

        <div>
          <label className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
            Admin Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') submit();
              if (e.key === 'Escape') onClose();
            }}
            className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] text-navy focus:border-blue focus:outline-none"
            placeholder="••••••••"
          />
          {err && <p className="mt-1.5 text-[11.5px] text-red">{err}</p>}
        </div>
      </div>
      <footer className="flex items-center justify-between gap-2 border-t border-bdr px-5 py-3">
        <button
          onClick={clear}
          disabled={busy || !password}
          className="h-9 rounded-md border border-red-bd bg-red-lt px-3 font-mono text-[11px] font-semibold text-red hover:bg-red-lt/80 disabled:opacity-40"
          title="ველის წაშლა (clear)"
        >
          clear
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            disabled={busy}
            className="h-9 rounded-md border border-bdr bg-sur-2 px-3 font-mono text-[11px] font-semibold text-text-2 hover:border-text-3 disabled:opacity-50"
          >
            cancel
          </button>
          <button
            onClick={submit}
            disabled={busy || !password || (!doGenerate && !value)}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue bg-blue px-4 font-mono text-[11px] font-semibold text-white hover:bg-blue/90 disabled:opacity-50"
          >
            <Save size={12} />
            {busy ? 'ინახება…' : doGenerate ? 'generate & save' : 'save'}
          </button>
        </div>
      </footer>
    </ModalShell>
  );
}

/* ------------------------------------------------------------------ */
/* Shared modal + password body                                       */
/* ------------------------------------------------------------------ */

function ModalShell({
  title,
  subtitle,
  onClose,
  children
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[460px] rounded-[12px] border border-bdr bg-sur shadow-lg"
      >
        <header className="flex items-start gap-2 border-b border-bdr px-5 py-4">
          <Lock size={16} className="mt-0.5 text-blue" />
          <div className="min-w-0 flex-1">
            <div className="text-[14px] font-bold text-navy">{title}</div>
            {subtitle && (
              <div className="mt-0.5 text-[11.5px] text-text-3">{subtitle}</div>
            )}
          </div>
          <button
            onClick={onClose}
            className="shrink-0 text-text-3 hover:text-text"
          >
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

function PasswordBody({
  password,
  setPassword,
  err,
  busy,
  onSubmit,
  onClose,
  submitLabel
}: {
  password: string;
  setPassword: (s: string) => void;
  err: string | null;
  busy: boolean;
  onSubmit: () => void;
  onClose: () => void;
  submitLabel: string;
}) {
  return (
    <>
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
              if (e.key === 'Enter') onSubmit();
              if (e.key === 'Escape') onClose();
            }}
            className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] text-navy focus:border-blue focus:outline-none"
            placeholder="••••••••"
          />
          {err && <p className="mt-1.5 text-[11.5px] text-red">{err}</p>}
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
          onClick={onSubmit}
          disabled={busy || !password}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue bg-blue px-4 font-mono text-[11px] font-semibold text-white hover:bg-blue/90 disabled:opacity-50"
        >
          {busy ? 'მოწმდება…' : submitLabel}
        </button>
      </footer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Atoms                                                              */
/* ------------------------------------------------------------------ */

function Copyable({
  icon: Icon,
  label,
  value,
  copied,
  onCopy,
  hint
}: {
  icon: React.ComponentType<{size?: number; className?: string; strokeWidth?: number}>;
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
  hint?: string;
}) {
  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
        <Icon size={11} /> {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={value}
          className="flex-1 rounded-md border border-bdr bg-sur-2 px-3 py-2 font-mono text-[12px] text-navy focus:border-blue focus:outline-none"
          onClick={(e) => (e.target as HTMLInputElement).select()}
        />
        <button
          onClick={onCopy}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[11px] font-semibold transition-colors ${
            copied
              ? 'border-grn bg-grn text-white'
              : 'border-bdr bg-sur-2 text-text-2 hover:border-blue hover:text-blue'
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

function EditableSecret({
  icon: Icon,
  label,
  mask,
  isSet,
  revealedValue,
  copied,
  onCopy,
  onEdit,
  onGenerate,
  hint
}: {
  icon: React.ComponentType<{size?: number; className?: string; strokeWidth?: number}>;
  label: string;
  fieldKey: FieldKey;
  mask: string | null;
  isSet: boolean;
  revealedValue: string | null;
  copied: boolean;
  onCopy: () => void;
  onEdit: () => void;
  onGenerate?: () => void;
  hint?: string;
}) {
  const locked = isSet && !revealedValue;
  const missing = !isSet;
  const display = missing
    ? '(არ არის დაყენებული)'
    : revealedValue ?? mask ?? '';

  return (
    <div>
      <label className="mb-1 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.08em] text-text-3">
        <Icon size={11} /> {label}
        {locked && (
          <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-sur-2 px-1.5 py-0.5 font-mono text-[9px] text-text-3">
            <Lock size={9} /> locked
          </span>
        )}
      </label>
      <div className="flex items-center gap-2">
        <input
          readOnly
          value={display}
          className={`flex-1 rounded-md border bg-sur-2 px-3 py-2 font-mono text-[12px] focus:outline-none ${
            missing
              ? 'border-ora-bd text-ora'
              : locked
                ? 'border-bdr text-text-3'
                : 'border-bdr text-navy focus:border-blue'
          }`}
          onClick={(e) =>
            !missing && !locked && (e.target as HTMLInputElement).select()
          }
        />
        <button
          disabled={missing || locked}
          onClick={onCopy}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-3 font-mono text-[11px] font-semibold transition-colors ${
            copied
              ? 'border-grn bg-grn text-white'
              : 'border-bdr bg-sur-2 text-text-2 hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-40'
          }`}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'copied' : 'copy'}
        </button>
        {onGenerate && (
          <button
            onClick={onGenerate}
            className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-bd bg-blue-lt px-3 font-mono text-[11px] font-semibold text-blue hover:border-blue"
            title="ავტომატურად შექმნა"
          >
            <Sparkles size={12} /> generate
          </button>
        )}
        <button
          onClick={onEdit}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 font-mono text-[11px] font-semibold text-text-2 hover:border-blue hover:text-blue"
          title="ჩასწორება"
        >
          <Pencil size={12} /> edit
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-text-3">{hint}</p>}
    </div>
  );
}

function SecretRow({
  name,
  displayValue,
  present,
  desc,
  optional,
  onEdit
}: {
  name: string;
  displayValue: string | null;
  present: boolean;
  desc: string;
  optional?: boolean;
  onEdit: () => void;
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
          <span className="font-mono text-[11.5px] font-bold text-navy">{name}</span>
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
      <button
        onClick={onEdit}
        className="shrink-0 inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 font-mono text-[10.5px] font-semibold text-text-2 hover:border-blue hover:text-blue"
      >
        <Pencil size={11} /> edit
      </button>
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
