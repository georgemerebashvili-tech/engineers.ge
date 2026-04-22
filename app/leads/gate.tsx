'use client';

import {useEffect, useState} from 'react';
import {
  authenticate,
  createManager,
  loadManagers,
  loadSession,
  saveManagers,
  setSession,
  type Session
} from '@/lib/leads-store';
import {LeadsWorkspace} from './workspace';
import {Briefcase, Lock, UserPlus, ShieldCheck, LogOut} from 'lucide-react';

export function LeadsGate() {
  const [hydrated, setHydrated] = useState(false);
  const [mode, setMode] = useState<'login' | 'setup' | 'workspace'>('login');
  const [session, setSess] = useState<Session | null>(null);

  const refreshMode = () => {
    const hasManagers = loadManagers().length > 0;
    const s = loadSession();
    if (!hasManagers) setMode('setup');
    else if (s) {
      setSess(s);
      setMode('workspace');
    } else setMode('login');
  };

  useEffect(() => {
    refreshMode();
    setHydrated(true);
  }, []);

  if (!hydrated) return null;

  if (mode === 'setup') {
    return <SetupScreen onDone={(s) => {setSess(s); setMode('workspace');}} />;
  }

  if (mode === 'login') {
    return <LoginScreen onDone={(s) => {setSess(s); setMode('workspace');}} onReset={refreshMode} />;
  }

  if (session) {
    return (
      <LeadsWorkspace
        session={session}
        onLogout={() => {
          setSession(null);
          setSess(null);
          setMode('login');
        }}
      />
    );
  }
  return null;
}

function Shell({children, title, subtitle}: {children: React.ReactNode; title: string; subtitle: string}) {
  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-4">
      <div className="w-full max-w-[420px] rounded-[var(--radius-card)] border border-bdr bg-sur p-7 shadow-[var(--shadow-card)]">
        <div className="mb-5 flex items-start gap-3">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-[8px] border border-blue-bd bg-blue-lt text-blue">
            <Briefcase size={18} />
          </span>
          <div>
            <h1 className="text-[18px] font-bold text-navy">{title}</h1>
            <p className="mt-0.5 text-[12px] leading-relaxed text-text-2">{subtitle}</p>
          </div>
        </div>
        {children}
        <p className="mt-5 text-center font-mono text-[10px] text-text-3">
          engineers.ge · Leads CRM · temporary local store
        </p>
      </div>
    </div>
  );
}

const REMEMBER_KEY = 'eng_leads_last_user';

function LoginScreen({onDone, onReset}: {onDone: (s: Session) => void; onReset: () => void}) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(REMEMBER_KEY);
      if (saved) setUsername(saved);
    } catch {}
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const m = await authenticate(username, password);
    setBusy(false);
    if (!m) {
      setError('არასწორი მომხმარებელი ან პაროლი');
      return;
    }
    try {
      if (remember) localStorage.setItem(REMEMBER_KEY, m.username);
      else localStorage.removeItem(REMEMBER_KEY);
    } catch {}
    const session: Session = {username: m.username, role: m.role, name: m.name};
    setSession(session);
    onDone(session);
  }

  return (
    <Shell title="Leads — შესვლა" subtitle="შეიყვანე მომხმარებელი და პაროლი">
      <form onSubmit={submit} className="space-y-3">
        <Field label="მომხმარებელი">
          <input
            className="gate-input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>
        <Field label="პაროლი">
          <div className="relative">
            <input
              className="gate-input pl-10"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Lock size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-3" />
          </div>
        </Field>
        <label className="flex items-center gap-2 text-[12px] text-text-2 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 accent-blue"
          />
          მომხმარებლის დამახსოვრება
        </label>
        {error && (
          <p className="rounded border border-red-bd bg-red-lt px-2.5 py-1.5 text-[12px] text-red">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
        >
          <ShieldCheck size={14} />
          {busy ? 'მოწმდება…' : 'შესვლა'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (
              !confirm(
                'წაიშლება ყველა მომხმარებელი და გააქტიურდება ხელახლა setup. ცხრილის მონაცემები (ტაბები/რიგები) რჩება უცვლელი. გავაგრძელო?'
              )
            )
              return;
            saveManagers([]);
            setSession(null);
            try {
              localStorage.removeItem('eng_leads_last_user');
            } catch {}
            onReset();
          }}
          className="block w-full pt-1 text-center text-[11px] text-text-3 underline hover:text-red"
        >
          დაგავიწყდა პაროლი? · ანგარიშების გადატვირთვა
        </button>
      </form>
      <GateStyle />
    </Shell>
  );
}

function SetupScreen({onDone}: {onDone: (s: Session) => void}) {
  const [username, setUsername] = useState('admin');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 4) {
      setError('პაროლი მინიმუმ 4 სიმბოლო');
      return;
    }
    if (password !== password2) {
      setError('პაროლები არ ემთხვევა');
      return;
    }
    if (!name.trim()) {
      setError('სახელი აუცილებელია');
      return;
    }
    setBusy(true);
    const result = await createManager({
      username,
      name,
      password,
      role: 'admin',
      canAddRemove: true
    });
    setBusy(false);
    if ('error' in result) {
      setError(result.error);
      return;
    }
    const session: Session = {username: result.username, role: 'admin', name: result.name};
    setSession(session);
    onDone(session);
  }

  return (
    <Shell
      title="Leads — პირველადი დაყენება"
      subtitle="შექმენი admin ანგარიში. ეს ანგარიში შეძლებს სხვა მენეჯერების დამატებას."
    >
      <form onSubmit={submit} className="space-y-3">
        <Field label="მომხმარებელი">
          <input className="gate-input" value={username} onChange={(e) => setUsername(e.target.value)} />
        </Field>
        <Field label="სახელი, გვარი">
          <input
            className="gate-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="გიორგი მერებაშვილი"
          />
        </Field>
        <Field label="პაროლი (4+)">
          <input
            className="gate-input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Field label="გაიმეორე პაროლი">
          <input
            className="gate-input"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
        </Field>
        {error && (
          <p className="rounded border border-red-bd bg-red-lt px-2.5 py-1.5 text-[12px] text-red">{error}</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
        >
          <UserPlus size={14} />
          {busy ? 'იქმნება…' : 'ანგარიშის შექმნა'}
        </button>
      </form>
      <GateStyle />
    </Shell>
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

function GateStyle() {
  return (
    <style jsx global>{`
      .gate-input {
        width: 100%;
        height: 38px;
        border-radius: 5px;
        border: 1.5px solid var(--bdr);
        background: var(--sur);
        padding: 0 10px;
        font-size: 13px;
        color: var(--text);
        outline: none;
        transition: border-color 0.15s, box-shadow 0.15s;
      }
      .gate-input:focus {
        border-color: var(--blue);
        box-shadow: 0 0 0 2px color-mix(in srgb, var(--blue) 15%, transparent);
      }
    `}</style>
  );
}

export function LogoutBtn({onClick}: {onClick: () => void}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-8 items-center gap-1 rounded-md border border-bdr bg-sur px-2.5 text-[11px] font-semibold text-text-2 hover:border-red-bd hover:text-red"
    >
      <LogOut size={12} /> გამოსვლა
    </button>
  );
}
