'use client';

import {useMemo, useState} from 'react';
import {Mail, Send, Smartphone, Monitor} from 'lucide-react';
import type {EmailTemplateKey} from '@/lib/email-templates';

type TemplateItem = {
  key: EmailTemplateKey;
  label: string;
  description: string;
  subject: string;
  html: string;
};

type SendStatus =
  | {state: 'idle'}
  | {state: 'sending'}
  | {state: 'sent'; stubbed?: boolean}
  | {state: 'error'; message: string};

export function EmailsPreview({
  templates,
  initialKey
}: {
  templates: TemplateItem[];
  initialKey: EmailTemplateKey;
}) {
  const [activeKey, setActiveKey] = useState<EmailTemplateKey>(initialKey);
  const [width, setWidth] = useState<'desktop' | 'mobile'>('desktop');
  const [status, setStatus] = useState<SendStatus>({state: 'idle'});

  const active = useMemo(
    () => templates.find((t) => t.key === activeKey) ?? templates[0],
    [templates, activeKey]
  );

  // sandbox: allow-popups so links inside the email iframe could open in a new tab.
  const srcDoc = useMemo(
    () => `<!DOCTYPE html><html><head><meta charset="utf-8"><base target="_blank"></head><body style="margin:0;background:#f5f8fc;padding:16px">${active.html}</body></html>`,
    [active.html]
  );

  async function sendTest() {
    setStatus({state: 'sending'});
    try {
      const res = await fetch('/api/admin/emails/test', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({template: activeKey})
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? data.error ?? 'failed');
      setStatus({state: 'sent', stubbed: data.stubbed});
      setTimeout(() => setStatus({state: 'idle'}), 4000);
    } catch (e) {
      setStatus({state: 'error', message: e instanceof Error ? e.message : 'error'});
    }
  }

  return (
    <div className="space-y-4">
      {/* Template selector */}
      <div className="flex flex-wrap gap-2">
        {templates.map((t) => {
          const on = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveKey(t.key)}
              className={`inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[12px] font-semibold transition-colors ${
                on
                  ? 'border-blue bg-blue text-white'
                  : 'border-bdr bg-sur text-text-2 hover:bg-sur-2'
              }`}
            >
              <Mail size={12} />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-[12px] text-text-2">{active.description}</p>

      {/* Toolbar — subject + viewport + send */}
      <div className="rounded-card border border-bdr bg-sur p-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-mono uppercase tracking-wider text-text-3">
              subject
            </p>
            <p className="truncate text-[13px] font-semibold text-navy">{active.subject}</p>
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-md border border-bdr bg-sur p-0.5">
              <button
                type="button"
                onClick={() => setWidth('desktop')}
                className={`inline-flex h-7 w-7 items-center justify-center rounded ${width === 'desktop' ? 'bg-navy text-white' : 'text-text-3'}`}
                title="Desktop preview"
              >
                <Monitor size={13} />
              </button>
              <button
                type="button"
                onClick={() => setWidth('mobile')}
                className={`inline-flex h-7 w-7 items-center justify-center rounded ${width === 'mobile' ? 'bg-navy text-white' : 'text-text-3'}`}
                title="Mobile preview"
              >
                <Smartphone size={13} />
              </button>
            </div>

            <button
              type="button"
              onClick={sendTest}
              disabled={status.state === 'sending'}
              className="inline-flex h-8 items-center gap-1.5 rounded-md bg-blue px-3 text-[12px] font-semibold text-white hover:bg-blue/90 disabled:opacity-60"
            >
              <Send size={12} />
              {status.state === 'sending' ? 'იგზავნება…' : 'Send test (ADMIN_EMAIL)'}
            </button>
          </div>
        </div>

        {status.state === 'sent' && (
          <p className="mt-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] text-emerald-700">
            ✓ {status.stubbed
              ? 'წერილი stub-ად დაიფიქსირა — RESEND_API_KEY ან ADMIN_EMAIL აკლია (ნახე console).'
              : 'წერილი წარმატებით გაიგზავნა ADMIN_EMAIL-ზე.'}
          </p>
        )}
        {status.state === 'error' && (
          <p className="mt-2 rounded-md border border-red-bd bg-red-lt px-3 py-1.5 text-[11px] text-red-700">
            ✗ {status.message}
          </p>
        )}
      </div>

      {/* Iframe preview */}
      <div className="flex justify-center">
        <div
          className="rounded-card border border-bdr bg-sur p-3 transition-all"
          style={{width: width === 'desktop' ? '640px' : '380px', maxWidth: '100%'}}
        >
          <iframe
            srcDoc={srcDoc}
            sandbox="allow-popups allow-popups-to-escape-sandbox"
            className="block w-full border-0"
            style={{height: '600px'}}
            title={`${active.label} preview`}
          />
        </div>
      </div>

      {/* Raw HTML toggle */}
      <details className="rounded-card border border-bdr bg-sur">
        <summary className="cursor-pointer px-4 py-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-2 hover:bg-sur-2">
          Raw HTML source
        </summary>
        <pre className="max-h-96 overflow-auto border-t border-bdr bg-bg p-3 font-mono text-[10px] text-text-2 whitespace-pre-wrap break-all">
          {active.html.trim()}
        </pre>
      </details>
    </div>
  );
}
