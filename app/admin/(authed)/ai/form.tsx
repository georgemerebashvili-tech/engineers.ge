'use client';

import {useState, useTransition} from 'react';
import {Sparkles, KeyRound, Zap, Trash2, Check, X} from 'lucide-react';

type Initial = {
  has_key: boolean;
  masked_key: string | null;
  default_model: string;
  enabled: boolean;
  updated_at: string;
};

const MODELS = [
  {value: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5 (fast, cheap)'},
  {value: 'claude-sonnet-4-6', label: 'Sonnet 4.6 (balanced)'},
  {value: 'claude-opus-4-7', label: 'Opus 4.7 (smartest)'}
];

export function AiForm({initial}: {initial: Initial}) {
  const [newKey, setNewKey] = useState('');
  const [model, setModel] = useState(initial.default_model);
  const [enabled, setEnabled] = useState(initial.enabled);
  const [hasKey, setHasKey] = useState(initial.has_key);
  const [maskedKey, setMaskedKey] = useState(initial.masked_key);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(
    null
  );
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);
  const [pending, start] = useTransition();
  const [testing, startTest] = useTransition();

  async function save(patch: {
    anthropic_api_key?: string;
    default_model?: string;
    enabled?: boolean;
    clear_key?: boolean;
  }) {
    setMsg(null);
    const res = await fetch('/api/admin/ai', {
      method: 'POST',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(patch)
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMsg({
        kind: 'err',
        text: data.message ?? 'შენახვა ვერ შესრულდა'
      });
      return null;
    }
    return data.settings as {
      has_key: boolean;
      anthropic_api_key: string | null;
      default_model: string;
      enabled: boolean;
    };
  }

  function onSaveKey() {
    if (newKey.trim().length < 10) {
      setMsg({kind: 'err', text: 'API key ძალიან მოკლეა'});
      return;
    }
    start(async () => {
      const s = await save({anthropic_api_key: newKey.trim()});
      if (s) {
        setHasKey(s.has_key);
        setMaskedKey(s.anthropic_api_key);
        setNewKey('');
        setMsg({kind: 'ok', text: 'API key შენახულია'});
      }
    });
  }

  function onClearKey() {
    if (!confirm('API key წავშალო?')) return;
    start(async () => {
      const s = await save({clear_key: true});
      if (s) {
        setHasKey(false);
        setMaskedKey(null);
        setMsg({kind: 'ok', text: 'API key წაშლილია'});
      }
    });
  }

  function onSaveModel() {
    start(async () => {
      const s = await save({default_model: model});
      if (s) setMsg({kind: 'ok', text: 'მოდელი შენახულია'});
    });
  }

  function onToggleEnabled() {
    const next = !enabled;
    setEnabled(next);
    start(async () => {
      const s = await save({enabled: next});
      if (s) setMsg({kind: 'ok', text: next ? 'AI ჩართულია' : 'AI გათიშულია'});
    });
  }

  function onTest() {
    setTestResult(null);
    startTest(async () => {
      const res = await fetch('/api/admin/ai/test', {method: 'POST'});
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) {
        setTestResult({
          ok: false,
          text: data.message ?? 'ტესტი ვერ შესრულდა'
        });
        return;
      }
      setTestResult({
        ok: true,
        text: `${data.model}: "${data.response}"`
      });
    });
  }

  return (
    <div className="grid max-w-2xl grid-cols-1 gap-5">
      {msg && (
        <div
          className={`rounded-md border px-3 py-2 text-[12.5px] ${
            msg.kind === 'ok'
              ? 'border-grn-bd bg-grn-lt text-grn'
              : 'border-red-bd bg-red-lt text-red'
          }`}
        >
          {msg.text}
        </div>
      )}

      {/* API KEY */}
      <div className="rounded-card border border-bdr bg-sur p-5">
        <div className="mb-3 flex items-center gap-2">
          <KeyRound size={16} className="text-blue" />
          <h2 className="text-[14px] font-bold text-navy">API Key</h2>
        </div>
        {hasKey && maskedKey && (
          <div className="mb-3 flex items-center gap-2 rounded-md border border-grn-bd bg-grn-lt px-3 py-2 text-[12.5px] text-grn">
            <Check size={14} />
            <span className="font-mono">{maskedKey}</span>
            <button
              type="button"
              onClick={onClearKey}
              disabled={pending}
              className="ml-auto inline-flex items-center gap-1 rounded-md border border-red-bd bg-red-lt px-2 py-1 text-[11px] font-semibold text-red hover:bg-red hover:text-white disabled:opacity-50"
            >
              <Trash2 size={12} />
              წაშლა
            </button>
          </div>
        )}
        <label className="space-y-1 block">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-text-3">
            {hasKey ? 'შეცვალე' : 'დაამატე'} Anthropic API Key
          </span>
          <input
            type="password"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            autoComplete="off"
            className="h-10 w-full rounded-md border border-bdr bg-sur px-3 font-mono text-[12px] outline-none focus:border-blue"
          />
        </label>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={onSaveKey}
            disabled={pending || newKey.length < 10}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? '…' : hasKey ? 'განახლება' : 'შენახვა'}
          </button>
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noreferrer noopener"
            className="text-[11px] text-text-2 underline hover:text-blue"
          >
            console.anthropic.com → keys
          </a>
        </div>
      </div>

      {/* MODEL */}
      <div className="rounded-card border border-bdr bg-sur p-5">
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-blue" />
          <h2 className="text-[14px] font-bold text-navy">Default Model</h2>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="h-10 flex-1 rounded-md border border-bdr bg-sur px-3 text-[13px]"
          >
            {MODELS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onSaveModel}
            disabled={pending || model === initial.default_model}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[12.5px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            შენახვა
          </button>
        </div>
        <p className="mt-2 text-[11px] text-text-3">
          მოდელი გამოიყენება ყველა AI endpoint-ში (translate და მომავალი
          სერვისები). ნებისმიერ მომენტში შეცვალე — cache არ არის.
        </p>
      </div>

      {/* ENABLED TOGGLE */}
      <div className="rounded-card border border-bdr bg-sur p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap size={16} className={enabled ? 'text-grn' : 'text-text-3'} />
              <h2 className="text-[14px] font-bold text-navy">
                AI სერვისი {enabled ? 'ჩართულია' : 'გათიშულია'}
              </h2>
            </div>
            <p className="mt-1 text-[11.5px] text-text-3">
              როცა გათიშულია, ყველა /api/ai/* endpoint აბრუნებს 503.
            </p>
          </div>
          <button
            type="button"
            onClick={onToggleEnabled}
            disabled={pending}
            role="switch"
            aria-checked={enabled}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-colors ${
              enabled ? 'border-grn-bd bg-grn' : 'border-bdr bg-sur-2'
            }`}
          >
            <span
              className={`absolute top-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${
                enabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
              }`}
            />
          </button>
        </div>
      </div>

      {/* TEST */}
      <div className="rounded-card border border-bdr bg-sur p-5">
        <div className="mb-3 flex items-center gap-2">
          <Check size={16} className="text-blue" />
          <h2 className="text-[14px] font-bold text-navy">ტესტი</h2>
        </div>
        <p className="mb-3 text-[12px] text-text-2">
          გაუშვი test request Claude-ზე და დარწმუნდი, რომ key მუშაობს.
        </p>
        <button
          type="button"
          onClick={onTest}
          disabled={testing || !hasKey}
          className="inline-flex h-9 items-center gap-1.5 rounded-md border border-blue-bd bg-blue-lt px-4 text-[12.5px] font-semibold text-blue transition hover:bg-blue hover:text-white disabled:opacity-50"
        >
          {testing ? 'იგზავნება…' : 'ტესტის გაშვება'}
        </button>
        {testResult && (
          <div
            className={`mt-3 rounded-md border px-3 py-2 text-[12.5px] ${
              testResult.ok
                ? 'border-grn-bd bg-grn-lt text-grn'
                : 'border-red-bd bg-red-lt text-red'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 font-semibold">
              {testResult.ok ? <Check size={14} /> : <X size={14} />}
              {testResult.ok ? 'წარმატება' : 'შეცდომა'}
            </span>
            <p className="mt-1 break-all font-mono text-[11.5px]">
              {testResult.text}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
