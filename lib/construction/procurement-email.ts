import 'server-only';

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'} as Record<string, string>)[c]!
  );
}

export async function sendTenderAnnouncementEmail(opts: {
  to: string;
  contactName: string;
  projectNo: string;
  projectName: string;
  itemCount: number;
  tenderUrl: string;
  senderName: string;
}) {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM || 'KAYA Construction <no-reply@engineers.ge>';
  const subject = `ტენდერი: ${opts.projectNo} — ${opts.projectName}`;

  const html = `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;padding:24px;line-height:1.6;color:#0f172a">
  <div style="background:#1565C0;border-radius:10px 10px 0 0;padding:18px 22px;display:flex;align-items:center;gap:12px">
    <div style="color:#fff;font-size:18px;font-weight:800;letter-spacing:-0.5px">KAYA Construction</div>
    <div style="color:rgba(255,255,255,.6);font-size:12px">× ტენდერის მოწვევა</div>
  </div>
  <div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 10px 10px;padding:22px">
    <p style="margin:0 0 16px">გამარჯობა, <strong>${escapeHtml(opts.contactName)}</strong></p>
    <p style="margin:0 0 16px">გთხოვთ, გაეცნოთ ქვემოთ მოცემულ ტენდერს და შეავსოთ თქვენი ფასები.</p>

    <div style="background:#E3F2FD;border-radius:8px;padding:14px 18px;margin:18px 0">
      <div style="font-size:11px;color:#5a6a8a;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">პროექტი</div>
      <div style="font-weight:700;font-size:15px;color:#1565C0">${escapeHtml(opts.projectNo)} — ${escapeHtml(opts.projectName)}</div>
      <div style="font-size:12px;color:#64748b;margin-top:4px">${opts.itemCount} სტრიქონი</div>
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${opts.tenderUrl}"
         style="background:#1565C0;color:#fff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:700;font-size:14px;display:inline-block">
        ფასების შევსება →
      </a>
    </div>

    <div style="background:#FEF3C7;border-radius:8px;padding:10px 14px;font-size:12px;color:#92400E">
      ⚠️ ბმული პერსონალურია — გთხოვთ, მხოლოდ თქვენ გამოიყენოთ.
    </div>

    <p style="color:#94a3b8;font-size:11px;margin-top:18px">
      გაგზავნა: ${escapeHtml(opts.senderName)} · KAYA Construction · engineers.ge
    </p>
  </div>
</div>`;

  if (!key) {
    console.log('[tender-announce] RESEND_API_KEY missing — would send to:', opts.to);
    return {ok: true as const, stubbed: true};
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {authorization: `Bearer ${key}`, 'content-type': 'application/json'},
    body: JSON.stringify({from, to: [opts.to], subject, html})
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => '');
    console.error('[tender-announce] resend failed', res.status, txt);
    return {ok: false as const, status: res.status};
  }
  return {ok: true as const, stubbed: false};
}
