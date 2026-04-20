'use client';

import {useEffect, useState, useId} from 'react';
import {UserPlus, X, Check, Mail, Zap, ShieldCheck, Lock, Eye, EyeOff} from 'lucide-react';
import {saveStoredUser} from '@/lib/user-session';

type Step = 'terms' | 'full-features' | 'submitted';

type Consents = {
  terms: boolean;
  dataStorage: boolean;
  privacy: boolean;
};

const INITIAL_CONSENTS: Consents = {
  terms: false,
  dataStorage: false,
  privacy: false
};

export function RegistrationTrigger({
  className,
  label = 'რეგისტრაცია'
}: {
  className?: string;
  label?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ??
          'inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur px-3 py-1.5 text-xs font-medium text-text-2 transition-colors hover:border-blue hover:text-blue'
        }
      >
        <UserPlus size={13} />
        {label}
      </button>
      {open && <RegistrationModal onClose={() => setOpen(false)} />}
    </>
  );
}

function RegistrationModal({onClose}: {onClose: () => void}) {
  const [step, setStep] = useState<Step>('terms');
  const [consents, setConsents] = useState<Consents>(INITIAL_CONSENTS);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [emails, setEmails] = useState<[string, string, string]>(['', '', '']);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  const allConsented = Object.values(consents).every(Boolean);
  const basicFilled = name.trim().length > 1 && /\S+@\S+\.\S+/.test(email);
  const passwordStrong = password.length >= 8;
  const passwordsMatch = password === password2 && password2.length > 0;
  const canSubmit = allConsented && basicFilled && passwordStrong && passwordsMatch;
  const emailsValid = emails.every((e) => /\S+@\S+\.\S+/.test(e));

  const persistUser = () =>
    saveStoredUser({name: name.trim(), email: email.trim(), password});

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="რეგისტრაცია"
      onClick={onClose}
      className="fixed inset-0 z-[110] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-[680px] rounded-2xl bg-sur shadow-2xl overflow-hidden"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-sur-2 border text-text-2 hover:border-blue hover:text-blue transition-colors"
        >
          <X size={16} />
        </button>

        <div className="px-6 pt-6 pb-4 md:px-8 md:pt-8 border-b border-bdr">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-blue-bd bg-blue-lt text-blue">
              <UserPlus size={20} strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-navy leading-tight">
                რეგისტრაცია
              </h2>
              <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-text-3">
                {step === 'terms' && 'ნაბიჯი 1/2 · წესები + თანხმობა'}
                {step === 'full-features' && 'ნაბიჯი 2/2 · სრული ფუნქციების გააქტიურება'}
                {step === 'submitted' && 'მოთხოვნა მიღებულია'}
              </p>
            </div>
          </div>
        </div>

        <div className="px-6 py-5 md:px-8 md:py-6 max-h-[70vh] overflow-y-auto">
          {step === 'terms' && (
            <TermsStep
              consents={consents}
              setConsents={setConsents}
              name={name}
              setName={setName}
              email={email}
              setEmail={setEmail}
              password={password}
              setPassword={setPassword}
              password2={password2}
              setPassword2={setPassword2}
              passwordStrong={passwordStrong}
              passwordsMatch={passwordsMatch}
            />
          )}

          {step === 'full-features' && (
            <FullFeaturesStep emails={emails} setEmails={setEmails} />
          )}

          {step === 'submitted' && <SubmittedStep />}
        </div>

        {step === 'terms' && (
          <div className="px-6 py-4 md:px-8 border-t border-bdr bg-sur-2 flex flex-wrap items-center justify-between gap-3">
            <span className="text-[11px] font-mono text-text-3">
              {allConsented ? '✓ ყველა პირობა დადასტურებულია' : '3 ცალი checkbox უნდა მონიშნო'}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  persistUser();
                  setStep('full-features');
                }}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-[6px] border border-bdr-2 bg-sur px-3.5 py-2 text-xs font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap size={13} /> სრული ფუნქციების ჩართვა
              </button>
              <button
                type="button"
                onClick={() => {
                  persistUser();
                  setStep('submitted');
                }}
                disabled={!canSubmit}
                className="inline-flex items-center gap-1.5 rounded-[6px] bg-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check size={13} /> დადასტურება
              </button>
            </div>
          </div>
        )}

        {step === 'full-features' && (
          <div className="px-6 py-4 md:px-8 border-t border-bdr bg-sur-2 flex flex-wrap items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => setStep('terms')}
              className="text-[11px] text-text-2 hover:text-blue"
            >
              ← უკან
            </button>
            <button
              type="button"
              onClick={() => setStep('submitted')}
              disabled={!emailsValid}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Mail size={13} /> ვერიფიკაციის გაგზავნა
            </button>
          </div>
        )}

        {step === 'submitted' && (
          <div className="px-6 py-4 md:px-8 border-t border-bdr bg-sur-2 flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-[6px] bg-blue px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-navy-2"
            >
              დახურვა
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TermsStep({
  consents,
  setConsents,
  name,
  setName,
  email,
  setEmail,
  password,
  setPassword,
  password2,
  setPassword2,
  passwordStrong,
  passwordsMatch
}: {
  consents: Consents;
  setConsents: (c: Consents) => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  password2: string;
  setPassword2: (v: string) => void;
  passwordStrong: boolean;
  passwordsMatch: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-5">
      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">1. სერვისის აღწერა</h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          engineers.ge არის უფასო საინჟინრო პლატფორმა — კალკულატორები,
          ანალიზის ხელსაწყოები და ცოდნის ბაზა. რეგისტრაცია{' '}
          <strong>არასავალდებულოა</strong> ძირითადი გამოყენებისთვის — ყველა
          კალკულატორი მუშაობს ანონიმურადაც. რეგისტრაცია ხსნის დამატებით
          ფუნქციებს: PDF/XLS ექსპორტი, კონფიგურაციის cloud-save, personalized
          dashboard.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">2. მომხმარების წესები</h3>
        <ul className="list-disc pl-5 text-[13px] leading-relaxed text-text-2 space-y-1">
          <li>შენ ხარ პასუხისმგებელი შენს ანგარიშზე და ყველა ქმედებაზე მის ქვეშ.</li>
          <li>
            აკრძალულია: automated scraping, სხვისი ანგარიშის გამოყენება, reverse
            engineering, service-ის გადატვირთვა.
          </li>
          <li>
            კალკულატორების შედეგები არის <strong>საცნობარო</strong> — სერტიფიცირებული
            ინჟინრის ვერიფიკაცია საჭიროა რეალური პროექტებისთვის.
          </li>
          <li>engineers.ge არ აგებს პასუხს კალკულაციებიდან გამომდინარე გადაწყვეტილებებზე.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">3. პერსონალური მონაცემები (GDPR)</h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          შევინახავთ <strong>მხოლოდ</strong>: სახელი, გვარი, ელ.ფოსტა, არჩეული
          ენა. ამ მონაცემების ერთადერთი მიზანია ანგარიშის სერვისი. არავის,
          არასოდეს არ გადავცემთ, არ ვყიდით, არ ვიყენებთ რეკლამისთვის. შენ გაქვს
          უფლება გადმოწერო (JSON), შეცვალო ან წაშალო შენი მონაცემები ნებისმიერ
          დროს —{' '}
          <a className="text-blue underline" href="mailto:georgemerebashvili@gmail.com">
            georgemerebashvili@gmail.com
          </a>
          .
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">4. ფაილების შენახვა</h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          <strong>PDF, Excel, ანგარიშები — არ ვინახავთ არსად.</strong> ფაილები
          გენერდება on-demand შენს ბრაუზერში, ჩამოიტვირთება შენს მოწყობილობაზე
          და სერვერზე არ რჩება. რეგისტრაცია არის <strong>მხოლოდ გასაღები</strong>,
          რომელიც ხსნის ამ ფუნქციას — თავად ფაილების შენახვას ჩვენ არავის ვთავაზობთ.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">5. Cookie და local storage</h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          კალკულატორის input state ინახება შენი ბრაუზერის cookie-ში (1 წელი).
          შეგიძლია ნებისმიერ დროს წაშალო ბრაუზერიდან.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">
          6. სრული ფუნქციების გააქტიურება (optional)
        </h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          „სრული ფუნქციების ჩართვა&rdquo; ღილაკით შეგიძლია დაამატო 3 დამატებითი
          ელ.ფოსტა. სისტემა თითოეულს გაუგზავნის ვერიფიკაციის ლინკს.
          <br />
          <strong>თუ 1 კვირაში 3-ივე ელ.ფოსტიდან დადასტურდება</strong> — ანგარიში
          გააქტიურდება სრული ფუნქციებით.
          <br />
          <strong>თუ 1 კვირაში არც ერთი არ დადასტურდება</strong> — სისტემა
          ავტომატურად გაგიუქმებს ანგარიშს და მოგიწევს თავიდან შესვლა.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">7. ანგარიშის წაშლა</h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          ნებისმიერ დროს გქონდეს უფლება წაშალო ანგარიში →{' '}
          <a className="text-blue underline" href="mailto:georgemerebashvili@gmail.com">
            georgemerebashvili@gmail.com
          </a>
          . 30 დღის განმავლობაში ყველა მონაცემი წაიშლება.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">8. წესების ცვლილება</h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          ცვლილების შემთხვევაში ელ.ფოსტით შეგატყობინებთ <strong>მინიმუმ 14 დღით ადრე</strong>.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[13px] font-bold text-navy">
          <span className="inline-flex items-center gap-1.5">
            <Lock size={13} className="text-blue" />
            9. პაროლის დაცვა (encryption)
          </span>
        </h3>
        <p className="text-[13px] leading-relaxed text-text-2">
          შენი პაროლი <strong>არასოდეს ინახება წაკითხვად ფორმაში</strong>. იგი ბრაუზერში
          დაუყოვნებლივ გარდაიქმნება cryptographic hash-ად{' '}
          <strong>PBKDF2 + SHA-256</strong> ალგორითმით, <strong>210,000 იტერაცია</strong>,
          16-ბაიტიანი შემთხვევითი salt-ით (OWASP 2023 რეკომენდაცია).
        </p>
        <ul className="list-disc pl-5 text-[13px] leading-relaxed text-text-2 space-y-1">
          <li>
            სერვერი, ადმინი (გიორგი მერებაშვილი) და engineers.ge-ს ვინმე სხვა{' '}
            <strong>ვერ ხედავს შენ პაროლს</strong> — არც database-ში, არც log-ში.
          </li>
          <li>
            ჰეშის უკან გადატრიალება (reverse) <strong>გამოთვლით შეუძლებელია</strong> — მხოლოდ
            პირდაპირი brute-force, რომელიც 210k იტერაციის გამო ნელია.
          </li>
          <li>
            შესვლისას შენი პაროლი ისევ იმავე ალგორითმით ჰეშდება და ორი hash-ი შეედრება
            (constant-time).
          </li>
          <li>
            პაროლის დაკარგვის შემთხვევაში — <strong>ვერ აღვადგენთ</strong>, მხოლოდ reset
            ლინკი ემაილზე (Resend integration-ის შემდეგ).
          </li>
        </ul>
        <p className="font-mono text-[11px] text-text-3 pt-1">
          algo = PBKDF2(SHA-256, 210_000, salt[16], dkLen=32) · key = output[32 bytes]
        </p>
      </section>

      {/* Account info inputs */}
      <section className="space-y-3 pt-3 border-t border-bdr">
        <h3 className="text-[13px] font-bold text-navy">ანგარიშის მონაცემები</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="სახელი და გვარი">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="მაგ: გიორგი მერებაშვილი"
              className="w-full rounded-[5px] border border-bdr bg-sur px-3 py-2 text-[13px] focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/10"
            />
          </Field>
          <Field label="ელ.ფოსტა">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@engineers.ge"
              className="w-full rounded-[5px] border border-bdr bg-sur px-3 py-2 text-[13px] font-mono focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/10"
            />
          </Field>
          <Field label="პაროლი (მინ. 8 სიმბოლო)">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className="w-full rounded-[5px] border border-bdr bg-sur pl-8 pr-10 py-2 text-[13px] font-mono focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/10"
              />
              <Lock
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
              />
              <button
                type="button"
                onClick={() => setShow((v) => !v)}
                aria-label={show ? 'პაროლის დამალვა' : 'პაროლის ჩვენება'}
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded text-text-3 hover:text-blue transition-colors"
              >
                {show ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </Field>
          <Field label="გაიმეორე პაროლი">
            <div className="relative">
              <input
                type={show ? 'text' : 'password'}
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
                className={`w-full rounded-[5px] border bg-sur pl-8 pr-3 py-2 text-[13px] font-mono focus:outline-none focus:ring-2 ${
                  password2.length > 0 && !passwordsMatch
                    ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10'
                    : 'border-bdr focus:border-blue focus:ring-blue/10'
                }`}
              />
              <Lock
                size={13}
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-text-3"
              />
            </div>
          </Field>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt p-3 text-[12px] leading-relaxed text-text-2">
          <Lock size={15} className="text-blue flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <strong className="text-navy">პაროლი დაცულია:</strong> იშიფრება ბრაუზერში{' '}
            <strong>PBKDF2-SHA256</strong>-ით (210,000 იტერაცია, salt[16]). წაკითხვადი ფორმა
            არსად არ ინახება — არც მე, არც ადმინი <strong>ვერ ვნახავთ</strong> პაროლს.
            <span className="block mt-0.5 font-mono text-[10px] text-text-3">
              🔒 client-side hashing · OWASP 2023 compliant
            </span>
          </div>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-text-3">
          <span className={password.length === 0 ? '' : passwordStrong ? 'text-grn' : 'text-red-500'}>
            {password.length === 0
              ? '○ პაროლი არ არის'
              : passwordStrong
              ? '✓ საკმარისი სიგრძე'
              : `○ ${password.length}/8 სიმბოლო`}
          </span>
          <span>·</span>
          <span className={password2.length === 0 ? '' : passwordsMatch ? 'text-grn' : 'text-red-500'}>
            {password2.length === 0
              ? '○ განმეორება არ არის'
              : passwordsMatch
              ? '✓ ემთხვევა'
              : '✗ არ ემთხვევა'}
          </span>
        </div>
      </section>

      {/* Consents */}
      <section className="space-y-2 pt-3 border-t border-bdr">
        <h3 className="text-[13px] font-bold text-navy">თანხმობა</h3>
        <div className="space-y-2">
          <Consent
            checked={consents.terms}
            onChange={(v) => setConsents({...consents, terms: v})}
          >
            ვეთანხმები <strong>მომხმარების წესებს</strong> (§1–2).
          </Consent>
          <Consent
            checked={consents.dataStorage}
            onChange={(v) => setConsents({...consents, dataStorage: v})}
          >
            ვაძლევ ნებართვას engineers.ge-ს <strong>შეინახოს ჩემი სახელი, გვარი და ელ.ფოსტა</strong> ანგარიშის სერვისისთვის (§3).
          </Consent>
          <Consent
            checked={consents.privacy}
            onChange={(v) => setConsents({...consents, privacy: v})}
          >
            გავეცანი <strong>კონფიდენციალურობის პოლიტიკასა</strong> და{' '}
            <strong>პერსონალური მონაცემების</strong> პრინციპს.
          </Consent>
        </div>
      </section>
    </div>
  );
}

function FullFeaturesStep({
  emails,
  setEmails
}: {
  emails: [string, string, string];
  setEmails: (e: [string, string, string]) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt p-4">
        <ShieldCheck size={18} className="text-blue mt-0.5 flex-shrink-0" />
        <div className="text-[13px] leading-relaxed text-text-2">
          <strong className="text-navy">როგორ მუშაობს:</strong>
          <br />
          სისტემა თითოეულ ქვემოთ მითითებულ ელ.ფოსტაზე გაგზავნის ვერიფიკაციის ლინკს.
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>
              <strong>3-ივე ელ.ფოსტიდან დადასტურდება 1 კვირაში</strong> → სრული
              ფუნქციები აქტიურდება (უნლიმ. PDF/XLS ექსპორტი, cloud configs, team access).
            </li>
            <li>
              <strong>არც ერთი არ დადასტურდება 1 კვირაში</strong> → ანგარიში
              ავტომატურად გაუქმდება, მოგიწევს თავიდან შესვლა.
            </li>
          </ul>
        </div>
      </div>

      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Field key={i} label={`ელ.ფოსტა ${i + 1}`}>
            <input
              type="email"
              value={emails[i]}
              onChange={(e) => {
                const next = [...emails] as [string, string, string];
                next[i] = e.target.value;
                setEmails(next);
              }}
              placeholder={`email${i + 1}@example.com`}
              className="w-full rounded-[5px] border border-bdr bg-sur px-3 py-2 text-[13px] font-mono focus:border-blue focus:outline-none focus:ring-2 focus:ring-blue/10"
            />
          </Field>
        ))}
      </div>
    </div>
  );
}

function SubmittedStep() {
  return (
    <div className="space-y-3 text-center py-6">
      <div className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-grn-lt border border-grn-bd text-grn mx-auto">
        <Check size={28} strokeWidth={2.5} />
      </div>
      <h3 className="text-lg font-bold text-navy">მოთხოვნა მიღებულია</h3>
      <p className="text-[13px] text-text-2 max-w-[420px] mx-auto leading-relaxed">
        ვერიფიკაციის ბმული გაგზავნილია მითითებულ ელ.ფოსტ(ებ)ზე.
        დააკლიკე ბმულს რომ დაასრულო რეგისტრაცია. კითხვების შემთხვევაში:{' '}
        <a className="text-blue underline" href="mailto:georgemerebashvili@gmail.com">
          georgemerebashvili@gmail.com
        </a>
      </p>
      <p className="font-mono text-[11px] text-text-3 pt-2">
        ℹ ეს არის UI preview. რეალური ემაილების გაგზავნა ამოქმედდება Resend
        integration-ის შემდეგ.
      </p>
    </div>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3">
        {label}
      </span>
      {children}
    </label>
  );
}

function Consent({
  checked,
  onChange,
  children
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  const id = useId();
  return (
    <label
      htmlFor={id}
      className="flex items-start gap-2 cursor-pointer select-none rounded-[6px] p-2 -mx-2 hover:bg-sur-2 transition-colors"
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 accent-blue cursor-pointer"
      />
      <span className="text-[13px] leading-relaxed text-text-2">{children}</span>
    </label>
  );
}
