import 'server-only';

/**
 * Shared email HTML templates. Extracted so `/admin/emails/preview` can render
 * the exact same markup that production emails ship with — no drift between
 * "what admin sees in preview" and "what the user receives".
 *
 * Each template takes a strongly-typed input and returns an `{subject, html}`
 * pair. HTML should be inline-styled (Gmail/Outlook strip <style> tags) and
 * safe for width ≤ 600px.
 */

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!
  );
}

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'https://engineers.ge';
}

export type WelcomeEmailInput = {
  email: string;
  name: string;
  language?: string | null;
};

export function welcomeEmail(user: WelcomeEmailInput): {subject: string; html: string} {
  const dashboardUrl = `${siteUrl()}/dashboard`;
  const calcUrl = `${siteUrl()}/calc/heat-loss`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;padding:20px;line-height:1.55">
      <h2 style="color:#1a3a6b;margin:0 0 8px">გამარჯობა, ${escapeHtml(user.name)}!</h2>
      <p style="margin:0 0 16px;color:#3b5170">კეთილი იყოს შენი მობრძანება engineers.ge-ზე 👷‍♂️</p>

      <div style="background:#eaf2fd;border:1px solid #c7dcf8;border-radius:8px;padding:14px 16px;margin:14px 0">
        <p style="margin:0 0 8px;font-weight:600;color:#1f6fd4">რას გვთავაზობ:</p>
        <ul style="margin:0;padding-left:20px;color:#3b5170">
          <li>HVAC, სახანძრო, თბოდანაკარგების კალკულატორები (ASHRAE 62.1, EN 12101, EN 12831 სტანდარტებით)</li>
          <li>კედლის U-ფაქტორის ISO 6946 რედაქტორი</li>
          <li>გეგმის რედაქტორი + DXF/AI იმპორტი, შენობის აღმშენებლობა</li>
          <li>ფიზიკის ფორმულების ცნობარი KaTeX-ით</li>
        </ul>
      </div>

      <p style="margin:16px 0 8px">დაიწყე აქედან:</p>
      <p style="text-align:center;margin:16px 0">
        <a href="${dashboardUrl}" style="background:#1f6fd4;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;margin:4px">დაშბორდი</a>
        <a href="${calcUrl}" style="background:#fff;border:1px solid #c7dcf8;color:#1f6fd4;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;display:inline-block;margin:4px">Heat-loss კალკი</a>
      </p>

      <p style="color:#7a96b8;font-size:12px;margin-top:24px">
        თუ რაიმე კითხვა გქონდა, უბრალოდ უპასუხე ამ წერილს. 💬
      </p>
      <p style="color:#a0aec0;font-size:10px;margin-top:24px;border-top:1px solid #e5eaf3;padding-top:12px">
        engineers.ge — ქართული საინჟინრო ინსტრუმენტები
      </p>
    </div>`;
  return {
    subject: 'კეთილი იყოს შენი მობრძანება engineers.ge-ზე',
    html
  };
}

export type BugReportEmailInput = {
  id: string;
  pathname: string;
  feature_key: string | null;
  message: string;
  email: string | null;
  viewport: string | null;
  user_agent: string | null;
};

export function bugReportEmail(report: BugReportEmailInput): {
  subject: string;
  html: string;
} {
  const adminUrl = `${siteUrl()}/admin/bug-reports`;
  const featureLine = report.feature_key
    ? `<p><strong>Feature:</strong> <code>${escapeHtml(report.feature_key)}</code></p>`
    : '';
  const emailLine = report.email
    ? `<p><strong>Email:</strong> <a href="mailto:${escapeHtml(report.email)}">${escapeHtml(report.email)}</a></p>`
    : '<p style="color:#7a96b8"><em>anonymous (ელფოსტა არ მიუთითა)</em></p>';
  const viewportLine = report.viewport
    ? `<p style="color:#7a96b8;font-size:12px"><strong>Viewport:</strong> ${escapeHtml(report.viewport)}</p>`
    : '';
  const uaLine = report.user_agent
    ? `<p style="color:#7a96b8;font-size:11px;font-family:monospace"><strong>UA:</strong> ${escapeHtml(report.user_agent)}</p>`
    : '';

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;padding:20px;line-height:1.5">
      <h2 style="color:#b45309;margin:0 0 12px">🐞 ახალი ხარვეზის შეტყობინება</h2>
      <p style="margin:0 0 16px;color:#7a96b8;font-size:13px">engineers.ge · test-mode banner reporter</p>

      <div style="background:#fef3c7;border:1px solid #fcd34d;border-radius:8px;padding:12px 16px;margin:12px 0">
        <p style="margin:0;white-space:pre-wrap;color:#78350f">${escapeHtml(report.message)}</p>
      </div>

      <p><strong>გვერდი:</strong> <a href="${siteUrl()}${report.pathname}">${escapeHtml(report.pathname)}</a></p>
      ${featureLine}
      ${emailLine}
      ${viewportLine}
      ${uaLine}

      <p style="text-align:center;margin:24px 0">
        <a href="${adminUrl}" style="background:#1f6fd4;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px">ნახე admin panel-ში</a>
      </p>

      <p style="color:#a0aec0;font-size:11px;margin-top:32px">
        ეს email-ი ავტომატურად იგზავნება ხარვეზების დამუშავებისთვის. გამორთვა შეგიძლია admin → ფიჩერ-მართვა → „notify.bug-reports" = დამალული.
      </p>
    </div>`;

  return {
    subject: `🐞 [engineers.ge] ხარვეზი: ${report.pathname}`,
    html
  };
}

export type VerifyEmailInput = {
  to: string;
  name: string;
  verifyUrl: string;
};

export function verifyEmail(opts: VerifyEmailInput): {subject: string; html: string} {
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:480px;padding:20px;line-height:1.5">
      <h2 style="color:#1a3a6b">გამარჯობა, ${escapeHtml(opts.name)}</h2>
      <p>გთხოვთ დაადასტუროთ email მისამართი — დააჭირეთ ქვემოთ ღილაკს:</p>
      <p style="text-align:center;margin:24px 0">
        <a href="${opts.verifyUrl}" style="background:#1f6fd4;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">Email-ის დადასტურება</a>
      </p>
      <p style="color:#7a96b8;font-size:12px">ბმული ვადა გადის 24 საათში. თუ რეგისტრაცია არ გაგივლიათ, უგულებელჰყავით ეს წერილი.</p>
    </div>`;
  return {
    subject: 'engineers.ge — დაადასტურე email',
    html
  };
}

/** Registry used by /admin/emails/preview — template key → name + sample data. */
export const EMAIL_TEMPLATES = {
  welcome: {
    label: 'Welcome email',
    description: 'ახალი რეგისტრაცია → user-ს ეგზავნება welcome-ი.',
    render: (): {subject: string; html: string} =>
      welcomeEmail({email: 'sample@example.com', name: 'გიორგი', language: 'ka'})
  },
  'bug-report': {
    label: 'Bug report alert (admin)',
    description: 'ვიზიტორი სატესტო რეჟიმიდან → admin-ს ეგზავნება alert-ი.',
    render: (): {subject: string; html: string} =>
      bugReportEmail({
        id: 'sample-id',
        pathname: '/calc/heat-loss',
        feature_key: 'calc.heat-loss',
        message:
          'გვერდი ცარიელად ჩამოიტვირთა და ღილაკი „გამოთვლა" არ რეაგირებდა. Safari 17 macOS.',
        email: 'tester@example.com',
        viewport: '1440x900',
        user_agent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
      })
  },
  'verify-email': {
    label: 'Email verification',
    description: 'რეგისტრაციისას → user-ს ეგზავნება verification link.',
    render: (): {subject: string; html: string} =>
      verifyEmail({
        to: 'sample@example.com',
        name: 'გიორგი',
        verifyUrl: `${siteUrl()}/api/verify-email?token=SAMPLE_TOKEN`
      })
  }
} as const;

export type EmailTemplateKey = keyof typeof EMAIL_TEMPLATES;
