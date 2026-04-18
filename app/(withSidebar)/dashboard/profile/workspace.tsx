'use client';

import {useEffect, useState, useTransition} from 'react';
import {useRouter} from 'next/navigation';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  ShieldCheck,
  Trash2,
  UserCircle2
} from 'lucide-react';
import {
  clearStoredUser,
  getStoredUser,
  saveStoredUser,
  type StoredUser
} from '@/lib/user-session';

type Profile = {
  id: string;
  email: string;
  name: string;
  language: string;
  profession: string | null;
  country_id: number | null;
  registered_at: string;
  last_login_at: string | null;
  email_verified: boolean;
  ref_code: string | null;
  source: 'self' | 'referred';
  verified_engineer: boolean;
};

const LANG_LABELS: Record<string, string> = {
  ka: 'ქართული',
  en: 'English',
  ru: 'Русский',
  tr: 'Türkçe',
  az: 'Azərbaycan',
  hy: 'Հայերեն'
};

export function ProfileWorkspace() {
  const router = useRouter();
  const [local, setLocal] = useState<StoredUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [status, setStatus] = useState<'loading' | 'anon' | 'error' | 'ok'>(
    'loading'
  );

  useEffect(() => {
    const u = getStoredUser();
    if (!u) {
      setStatus('anon');
      return;
    }
    setLocal(u);
    fetch(`/api/me/profile?email=${encodeURIComponent(u.email)}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((p: Profile) => {
        setProfile(p);
        setStatus('ok');
      })
      .catch(() => setStatus('error'));
  }, []);

  if (status === 'anon') {
    return <Box>მომხმარებლის პროფილი — ჯერ ავტორიზაცია გაიარე.</Box>;
  }
  if (status === 'loading' || !profile || !local) {
    return <Box>იტვირთება…</Box>;
  }
  if (status === 'error') {
    return (
      <Box>
        <AlertTriangle className="text-ora" /> ვერ ჩაიტვირთა. სცადე refresh.
      </Box>
    );
  }

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-start gap-3">
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-blue-bd bg-blue-lt text-blue">
          <UserCircle2 size={28} />
        </span>
        <div>
          <h1 className="text-[22px] font-bold text-navy">{profile.name}</h1>
          <p className="mt-0.5 font-mono text-[12px] text-text-3">{profile.email}</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {profile.email_verified ? (
              <Pill color="grn">
                <CheckCircle2 size={10} /> email verified
              </Pill>
            ) : (
              <Pill color="ora">
                <AlertTriangle size={10} /> email not verified
              </Pill>
            )}
            {profile.verified_engineer && (
              <Pill color="blue">
                <ShieldCheck size={10} /> verified engineer
              </Pill>
            )}
            {profile.source === 'referred' && <Pill color="ora">referred</Pill>}
            {profile.ref_code && (
              <Pill color="bdr">
                ref: <code className="font-mono">{profile.ref_code}</code>
              </Pill>
            )}
          </div>
        </div>
      </header>

      <ProfileForm
        profile={profile}
        currentPassword={local.password_hash ? '' : ''}
        credentialEmail={local.email}
        onSaved={(next) => setProfile({...profile, ...next})}
      />

      <ChangePasswordCard credentialEmail={local.email} credentialName={profile.name} />

      <DangerZone
        credentialEmail={local.email}
        onDeleted={() => {
          clearStoredUser();
          router.push('/?account=deleted');
        }}
      />
    </div>
  );
}

function ProfileForm({
  profile,
  credentialEmail,
  onSaved
}: {
  profile: Profile;
  credentialEmail: string;
  currentPassword: string;
  onSaved: (next: Partial<Profile>) => void;
}) {
  const [name, setName] = useState(profile.name);
  const [language, setLanguage] = useState(profile.language);
  const [profession, setProfession] = useState(profile.profession ?? '');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [pending, start] = useTransition();

  const dirty =
    name !== profile.name ||
    language !== profile.language ||
    (profession || '') !== (profile.profession ?? '');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!password) {
      setMsg({kind: 'err', text: 'პაროლი საჭიროა დასადასტურებლად'});
      return;
    }
    start(async () => {
      const res = await fetch('/api/me/update', {
        method: 'PATCH',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          email: credentialEmail,
          password,
          name,
          language,
          profession: profession.trim() || null
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({kind: 'err', text: data?.message ?? 'ვერ შეინახა'});
        return;
      }
      onSaved({name, language, profession: profession.trim() || null});
      setMsg({kind: 'ok', text: 'შენახულია'});
      setPassword('');
    });
  };

  return (
    <Section title="პროფილი">
      <form onSubmit={submit} className="space-y-3">
        <Field label="სახელი">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={120}
            className="input"
          />
        </Field>
        <Field label="ენა">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="input"
          >
            {Object.entries(LANG_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </Field>
        <Field label="პროფესია / როლი">
          <input
            type="text"
            value={profession}
            onChange={(e) => setProfession(e.target.value)}
            maxLength={120}
            className="input"
            placeholder="HVAC / Electrical / Arch / …"
          />
        </Field>
        <Field label="პაროლი (ცვლილებების დასადასტურებლად)">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="input"
            autoComplete="current-password"
          />
        </Field>

        {msg && (
          <p
            className={`text-[12px] ${
              msg.kind === 'ok' ? 'text-grn' : 'text-danger'
            }`}
          >
            {msg.text}
          </p>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={!dirty || !password || pending}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
          >
            {pending ? 'მიმდინარეობს…' : 'შენახვა'}
          </button>
        </div>
      </form>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid var(--bdr);
          background: var(--sur-2);
          padding: 8px 10px;
          font-size: 13px;
          color: var(--navy);
        }
        .input:focus {
          outline: none;
          border-color: var(--blue);
          box-shadow: 0 0 0 2px var(--blue-lt);
        }
      `}</style>
    </Section>
  );
}

function ChangePasswordCard({
  credentialEmail,
  credentialName
}: {
  credentialEmail: string;
  credentialName: string;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (next.length < 8) {
      setMsg({kind: 'err', text: 'ახალი პაროლი მინ. 8 სიმბოლო'});
      return;
    }
    if (next !== confirm) {
      setMsg({kind: 'err', text: 'ახალი და დადასტურება არ ემთხვევა'});
      return;
    }
    start(async () => {
      const res = await fetch('/api/me/change-password', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          email: credentialEmail,
          password: current,
          new_password: next
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({kind: 'err', text: data?.message ?? 'ვერ შეიცვალა'});
        return;
      }
      // Re-hash password in localStorage so subsequent mutations work without re-login.
      await saveStoredUser({
        name: credentialName,
        email: credentialEmail,
        password: next
      });
      setMsg({kind: 'ok', text: 'პაროლი შეიცვალა'});
      setCurrent('');
      setNext('');
      setConfirm('');
    });
  };

  return (
    <Section title="პაროლი" icon={<KeyRound size={13} />}>
      <form onSubmit={submit} className="space-y-3">
        <Field label="მიმდინარე პაროლი">
          <div className="relative">
            <input
              type={show ? 'text' : 'password'}
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              className="input"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              className="absolute right-1.5 top-1/2 inline-flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded text-text-3 hover:text-navy"
            >
              {show ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </div>
        </Field>
        <Field label="ახალი პაროლი">
          <input
            type={show ? 'text' : 'password'}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </Field>
        <Field label="დაადასტურე">
          <input
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            autoComplete="new-password"
            className="input"
          />
        </Field>
        {msg && (
          <p
            className={`text-[12px] ${
              msg.kind === 'ok' ? 'text-grn' : 'text-danger'
            }`}
          >
            {msg.text}
          </p>
        )}
        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={pending || !current || !next || !confirm}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
          >
            {pending ? 'მიმდინარეობს…' : 'პაროლის შეცვლა'}
          </button>
        </div>
      </form>
      <style jsx>{`
        .input {
          width: 100%;
          border-radius: 6px;
          border: 1px solid var(--bdr);
          background: var(--sur-2);
          padding: 8px 34px 8px 10px;
          font-size: 13px;
          color: var(--navy);
        }
        .input:focus {
          outline: none;
          border-color: var(--blue);
          box-shadow: 0 0 0 2px var(--blue-lt);
        }
      `}</style>
    </Section>
  );
}

function DangerZone({
  credentialEmail,
  onDeleted
}: {
  credentialEmail: string;
  onDeleted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(null);
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (confirm !== 'DELETE') {
      setMsg({kind: 'err', text: '"DELETE" სიტყვა უნდა ჩაწერო'});
      return;
    }
    start(async () => {
      const res = await fetch('/api/me/delete', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          email: credentialEmail,
          password,
          confirm: 'DELETE'
        })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({kind: 'err', text: data?.message ?? 'ვერ წაიშალა'});
        return;
      }
      onDeleted();
    });
  };

  return (
    <Section title="ანგარიშის წაშლა" icon={<Trash2 size={13} />} accent="red">
      {!open ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-md border border-red-lt bg-red-lt px-3 py-1.5 text-[12px] font-semibold text-danger transition-colors hover:bg-red-100"
        >
          <Trash2 size={12} /> წაშლის მოთხოვნა
        </button>
      ) : (
        <form onSubmit={submit} className="space-y-3">
          <p className="rounded-md border border-red-lt bg-red-lt px-3 py-2 text-[12px] text-danger">
            წაშლის შემდეგ ანგარიში 10 დღით ინახება (soft delete) → ამ ხნის
            განმავლობაში ადმინს შეუძლია აღდგენა. ამის შემდეგ — პერმანენტული
            წაშლა. Referral-ები, ref_code და invited user-ები შეინახება.
          </p>
          <Field label="პაროლი">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px]"
            />
          </Field>
          <Field label='დაადასტურე — ჩაწერე "DELETE"'>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-bdr bg-sur-2 px-3 py-2 text-[13px] font-mono"
            />
          </Field>
          {msg && (
            <p
              className={`text-[12px] ${
                msg.kind === 'ok' ? 'text-grn' : 'text-danger'
              }`}
            >
              {msg.text}
            </p>
          )}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-[11.5px] font-semibold text-text-2 hover:text-navy"
            >
              გაუქმება
            </button>
            <button
              type="submit"
              disabled={pending || confirm !== 'DELETE' || !password}
              className="inline-flex h-9 items-center gap-1.5 rounded-md bg-danger px-4 text-[12.5px] font-semibold text-white transition-colors hover:opacity-90 disabled:opacity-50"
              style={{background: 'var(--red)'}}
            >
              {pending ? 'მიმდინარეობს…' : 'ანგარიშის წაშლა'}
            </button>
          </div>
        </form>
      )}
    </Section>
  );
}

function Section({
  title,
  icon,
  accent,
  children
}: {
  title: string;
  icon?: React.ReactNode;
  accent?: 'red';
  children: React.ReactNode;
}) {
  return (
    <section
      className={`rounded-[var(--radius-card)] border bg-sur ${
        accent === 'red' ? 'border-red-lt' : 'border-bdr'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-inherit px-4 py-2.5">
        {icon}
        <h2
          className={`text-[13px] font-bold ${
            accent === 'red' ? 'text-danger' : 'text-navy'
          }`}
        >
          {title}
        </h2>
      </header>
      <div className="px-4 py-3">{children}</div>
    </section>
  );
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block space-y-1">
      <span className="text-[11px] font-semibold text-text-2">{label}</span>
      {children}
    </label>
  );
}

function Pill({
  color,
  children
}: {
  color: 'grn' | 'ora' | 'blue' | 'bdr';
  children: React.ReactNode;
}) {
  const map: Record<string, string> = {
    grn: 'border-grn-bd bg-grn-lt text-grn',
    ora: 'border-ora-bd bg-ora-lt text-ora',
    blue: 'border-blue-bd bg-blue-lt text-blue',
    bdr: 'border-bdr bg-sur-2 text-text-3'
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold ${map[color]}`}
    >
      {children}
    </span>
  );
}

function Box({children}: {children: React.ReactNode}) {
  return (
    <div className="rounded-[var(--radius-card)] border bg-sur p-6 text-center text-[13px] text-text-2">
      {children}
    </div>
  );
}
