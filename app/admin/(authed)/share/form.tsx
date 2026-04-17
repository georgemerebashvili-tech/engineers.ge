'use client';

import {useState} from 'react';
import {Facebook, Linkedin, Send, Link as LinkIcon} from 'lucide-react';

type Settings = {
  facebook: boolean;
  x: boolean;
  linkedin: boolean;
  telegram: boolean;
  whatsapp: boolean;
  copy_link: boolean;
};

const ITEMS: {
  key: keyof Settings;
  label: string;
  icon: (p: {size?: number}) => React.ReactElement;
}[] = [
  {key: 'facebook', label: 'Facebook', icon: ({size = 18}) => <Facebook size={size} />},
  {key: 'x', label: 'X (Twitter)', icon: ({size = 18}) => <XIcon size={size} />},
  {key: 'linkedin', label: 'LinkedIn', icon: ({size = 18}) => <Linkedin size={size} />},
  {key: 'telegram', label: 'Telegram', icon: ({size = 18}) => <Send size={size} />},
  {key: 'whatsapp', label: 'WhatsApp', icon: ({size = 18}) => <WhatsAppIcon size={size} />},
  {key: 'copy_link', label: 'ლინკის კოპირება', icon: ({size = 18}) => <LinkIcon size={size} />}
];

export function ShareSettingsForm({initial}: {initial: Settings}) {
  const [settings, setSettings] = useState<Settings>(initial);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);

  const toggle = (key: keyof Settings) => {
    setSettings((s) => ({...s, [key]: !s[key]}));
    setMsg(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      const r = await fetch('/api/admin/share', {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(settings)
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d?.error ?? 'save failed');
      }
      setMsg({kind: 'ok', text: 'შენახულია'});
    } catch (err) {
      setMsg({kind: 'err', text: err instanceof Error ? err.message : 'error'});
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid gap-2 rounded-2xl border bg-surface p-4 sm:grid-cols-2">
        {ITEMS.map((it) => {
          const active = settings[it.key];
          return (
            <label
              key={it.key}
              className={`flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
                active ? 'border-blue-500 bg-blue-50/50' : 'bg-surface-alt'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-md border ${
                    active ? 'border-blue-300 text-blue-600' : 'text-fg-muted'
                  }`}
                >
                  <it.icon />
                </span>
                <span className="text-sm font-medium">{it.label}</span>
              </span>
              <Toggle checked={active} onChange={() => toggle(it.key)} />
            </label>
          );
        })}
      </div>

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-navy px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50"
        >
          {saving ? 'ინახება…' : 'შენახვა'}
        </button>
        {msg && (
          <span
            className={`text-xs ${
              msg.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'
            }`}
          >
            {msg.text}
          </span>
        )}
      </div>
    </form>
  );
}

function Toggle({checked, onChange}: {checked: boolean; onChange: () => void}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
        checked ? 'bg-blue-500' : 'bg-gray-300'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function XIcon({size = 18}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.454L22 22h-6.844l-4.77-6.24L4.8 22H2l7-8.02L2 2h6.98l4.3 5.69L18.244 2Zm-1.196 18h1.86L7.03 4H5.06l11.988 16Z" />
    </svg>
  );
}

function WhatsAppIcon({size = 18}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.11 4.9A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.9c0 1.75.46 3.46 1.33 4.96L2 22l5.26-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.46 0 9.9-4.45 9.9-9.9 0-2.64-1.03-5.12-2.83-7.04Zm-7.07 15.25h-.01a8.22 8.22 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.22 8.22 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.23-8.23a8.19 8.19 0 0 1 5.82 2.41 8.18 8.18 0 0 1 2.4 5.82c0 4.54-3.69 8.25-8.22 8.25Zm4.5-6.15c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.97-1.22-.73-.65-1.22-1.45-1.36-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.57-.43-.15-.01-.32-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.17-.06-.1-.23-.17-.48-.3Z" />
    </svg>
  );
}
