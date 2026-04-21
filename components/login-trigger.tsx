'use client';

import {useEffect, useRef, useState, useTransition} from 'react';
import {LogIn, Mail, Lock, X, Eye, EyeOff, LogOut, UserCircle2} from 'lucide-react';
import {saveStoredUser, getStoredUser, clearStoredUser} from '@/lib/user-session';

type StoredUserLite = {email: string; name: string} | null;

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"]), input:not([disabled]), select:not([disabled]), textarea:not([disabled])';

export function LoginTrigger({className}: {className?: string}) {
  const [open, setOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<StoredUserLite>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const sync = () => {
      const u = getStoredUser();
      setUser(u ? {email: u.email, name: u.name} : null);
    };
    sync();
    const onChange = () => sync();
    window.addEventListener('eng_user_change', onChange);
    return () => window.removeEventListener('eng_user_change', onChange);
  }, []);

  // Focus first item on menu open; restore trigger focus on close
  useEffect(() => {
    if (!menuOpen || !menuRef.current) return;
    const first = menuRef.current.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
    first?.focus();
    return () => {
      triggerRef.current?.focus();
    };
  }, [menuOpen]);

  if (user) {
    return (
      <div
        className="relative"
        onKeyDown={(e) => {
          if (!menuOpen) return;
          if (e.key === 'Escape') {
            e.preventDefault();
            setMenuOpen(false);
            return;
          }
          if (e.key === 'Tab' && menuRef.current) {
            const items = Array.from(
              menuRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
            );
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            const active = document.activeElement as HTMLElement | null;
            if (e.shiftKey && active === first) {
              e.preventDefault();
              last.focus();
            } else if (!e.shiftKey && active === last) {
              e.preventDefault();
              first.focus();
            }
          }
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setMenuOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-bdr bg-sur pl-1 pr-2 text-[11.5px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue focus:outline-none focus:ring-2 focus:ring-blue"
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-lt text-blue">
            <UserCircle2 size={14} aria-hidden="true" />
          </span>
          <span className="max-w-[140px] truncate">{user.name}</span>
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-[140]"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={menuRef}
              role="menu"
              aria-label="მომხმარებლის მენიუ"
              className="absolute right-0 top-full z-[141] mt-1.5 w-56 max-w-[calc(100vw-16px)] overflow-hidden rounded-lg border bg-sur shadow-[var(--shadow-card)]"
            >
              <div className="border-b px-3 py-2">
                <p className="text-[12px] font-semibold text-navy truncate">
                  {user.name}
                </p>
                <p className="font-mono text-[10px] text-text-3 truncate">
                  {user.email}
                </p>
              </div>
              <a
                href="/dashboard/profile"
                role="menuitem"
                className="block px-3 py-2 text-[12px] text-text-2 hover:bg-sur-2 hover:text-blue focus:bg-sur-2 focus:text-blue focus:outline-none"
                onClick={() => setMenuOpen(false)}
              >
                პროფილი
              </a>
              <a
                href="/dashboard/referrals"
                role="menuitem"
                className="block px-3 py-2 text-[12px] text-text-2 hover:bg-sur-2 hover:text-blue focus:bg-sur-2 focus:text-blue focus:outline-none"
                onClick={() => setMenuOpen(false)}
              >
                მოწვევები & ბმული
              </a>
              <a
                href="/dashboard"
                role="menuitem"
                className="block px-3 py-2 text-[12px] text-text-2 hover:bg-sur-2 hover:text-blue focus:bg-sur-2 focus:text-blue focus:outline-none"
                onClick={() => setMenuOpen(false)}
              >
                Dashboard
              </a>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  clearStoredUser();
                  setMenuOpen(false);
                }}
                className="flex w-full items-center gap-1.5 border-t px-3 py-2 text-left text-[12px] text-danger hover:bg-red-lt focus:bg-red-lt focus:outline-none"
              >
                <LogOut size={12} aria-hidden="true" /> გასვლა
              </button>
            </div>
          </>
        )}
      </div>
    );
  }

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
        <LogIn size={13} />
        შესვლა
      </button>
      {open && <LoginModal onClose={() => setOpen(false)} />}
    </>
  );
}

function LoginModal({onClose}: {onClose: () => void}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [forgotMsg, setForgotMsg] = useState<{kind: 'ok' | 'err'; text: string} | null>(
    null
  );
  const [forgotPending, startForgot] = useTransition();

  const requestReset = () => {
    setForgotMsg(null);
    const trimmed = email.trim();
    if (!/\S+@\S+\.\S+/.test(trimmed)) {
      setForgotMsg({kind: 'err', text: 'ჯერ email მისამართი ჩაწერე'});
      return;
    }
    startForgot(async () => {
      const res = await fetch('/api/password/request', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({email: trimmed})
      });
      if (res.status === 429) {
        setForgotMsg({
          kind: 'err',
          text: '2 წუთში 1-ჯერ. სცადე ცოტა ხანში.'
        });
        return;
      }
      if (!res.ok) {
        setForgotMsg({kind: 'err', text: 'ვერ მოხერხდა.'});
        return;
      }
      setForgotMsg({
        kind: 'ok',
        text: 'თუ email რეგისტრირებულია — გამოგიგზავნე ბმული.'
      });
    });
  };

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

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    start(async () => {
      try {
        const res = await fetch('/api/login', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body: JSON.stringify({email: email.trim(), password})
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          const msgMap: Record<string, string> = {
            bad_credentials: data.message || 'Email ან პაროლი არასწორია',
            bad_request: 'შეამოწმე ველები',
            locked: data.message || 'ძალიან ბევრი მცდელობა. სცადე ცოტა ხანში.',
            server: 'სერვერის შეცდომა, სცადე კვლავ'
          };
          setError(msgMap[data.error ?? ''] ?? 'შესვლა ვერ მოხერხდა');
          return;
        }
        // Persist locally so that pages using getStoredUser() see the session.
        await saveStoredUser({
          name: data.user.name,
          email: data.user.email,
          password
        });
        onClose();
      } catch (_e) {
        setError('ქსელის შეცდომა');
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="შესვლა"
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4"
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="relative w-full max-w-[380px] rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-modal)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-sur-2 hover:text-navy"
        >
          <X size={16} />
        </button>

        <header className="border-b border-bdr px-5 pt-5 pb-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
            <LogIn size={11} /> Login
          </span>
          <h2 className="mt-2 text-[18px] font-bold text-navy">შესვლა</h2>
          <p className="mt-1 text-[12px] text-text-2">
            უკვე დარეგისტრირდი? შეიყვანე email + პაროლი.
          </p>
        </header>

        <div className="space-y-3 px-5 py-4">
          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-text-2">Email</span>
            <span className="relative flex items-center">
              <Mail
                size={13}
                className="pointer-events-none absolute left-2.5 text-text-3"
              />
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full rounded-md border bg-sur-2 py-2 pl-7 pr-3 text-[13px] text-navy placeholder:text-text-3 focus:border-blue focus:outline-none"
                placeholder="you@example.com"
              />
            </span>
          </label>

          <label className="block space-y-1">
            <span className="text-[11px] font-semibold text-text-2">პაროლი</span>
            <span className="relative flex items-center">
              <Lock
                size={13}
                className="pointer-events-none absolute left-2.5 text-text-3"
              />
              <input
                type={showPwd ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={1}
                className="w-full rounded-md border bg-sur-2 py-2 pl-7 pr-9 text-[13px] text-navy placeholder:text-text-3 focus:border-blue focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? 'დამალვა' : 'ჩვენება'}
                className="absolute right-1.5 inline-flex h-7 w-7 items-center justify-center rounded text-text-3 hover:text-navy"
              >
                {showPwd ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </span>
          </label>

          {error && (
            <p className="rounded-md border border-red-lt bg-red-lt px-2.5 py-1.5 text-[11.5px] text-danger">
              {error}
            </p>
          )}

          <button
            type="button"
            onClick={requestReset}
            disabled={forgotPending}
            className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-blue hover:underline disabled:opacity-50"
          >
            დაგავიწყდა პაროლი?
            {forgotPending && <span className="font-mono text-[10px]">იგზავნება…</span>}
          </button>
          {forgotMsg && (
            <p
              className={`text-[11px] ${
                forgotMsg.kind === 'ok' ? 'text-grn' : 'text-ora'
              }`}
            >
              {forgotMsg.text}
            </p>
          )}
        </div>

        <div className="flex justify-center border-t border-bdr px-5 py-3">
          <button
            type="submit"
            disabled={pending || !email.trim() || !password}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-md bg-blue px-6 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:opacity-50"
          >
            <LogIn size={14} />
            {pending ? 'მიმდინარეობს…' : 'შესვლა'}
          </button>
        </div>
      </form>
    </div>
  );
}
