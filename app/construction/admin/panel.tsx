'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {ConstructionSession} from '@/lib/construction/auth';

type ConstructionUser = {
  id: string;
  username: string;
  email: string | null;
  display_name: string | null;
  role: 'admin' | 'user';
  is_static: boolean;
  active: boolean;
  created_at: string;
  created_by: string | null;
  last_login_at: string | null;
};

type LoginEvent = {
  id: number;
  username: string;
  ip: string | null;
  success: boolean;
  created_at: string;
};

type AuditEvent = {
  id: number;
  actor: string;
  action: string;
  target_type: string | null;
  summary: string | null;
  ip: string | null;
  created_at: string;
};

const PRIMARY = '#1565C0';
const PRIMARY_DARK = '#0D47A1';
const PRIMARY_LIGHT = '#E3F2FD';

export function ConstructionAdminPanel({session}: {session: ConstructionSession}) {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'activity' | 'events'>('users');
  const [users, setUsers] = useState<ConstructionUser[]>([]);
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, eRes, aRes] = await Promise.all([
        fetch('/api/construction/users'),
        fetch('/api/construction/login-events?limit=200'),
        fetch('/api/construction/audit-log?limit=300')
      ]);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
      if (aRes.ok) setAudit((await aRes.json()).events || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  async function logout() {
    await fetch('/api/construction/logout', {method: 'POST'});
    router.replace('/construction');
    router.refresh();
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    if (!newEmail.trim()) {
      flashToast('ელფოსტა სავალდებულოა');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/construction/users', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          username: newUsername.trim().toLowerCase(),
          password: newPassword || undefined,
          display_name: newDisplay || undefined,
          email: newEmail.trim(),
          role: newRole
        })
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        flashToast(
          body?.error === 'username_taken'
            ? 'ასეთი მომხმარებელი უკვე არსებობს'
            : 'შექმნა ვერ მოხერხდა'
        );
        return;
      }
      const body = await res.json();
      if (body.stubbed && body.temp_password) {
        alert(`RESEND_API_KEY არ არის — მეილი ვერ გაიგზავნა.\n\nდროებითი პაროლი:\n${body.temp_password}`);
      } else {
        flashToast('მომხმარებელი დაემატა + მეილი გაიგზავნა ✓');
      }
      setNewUsername(''); setNewPassword(''); setNewDisplay(''); setNewEmail(''); setNewRole('user');
      loadAll();
    } finally {
      setCreating(false);
    }
  }

  async function regeneratePassword(u: ConstructionUser) {
    if (!u.email) { flashToast('ჯერ დააყენე ელფოსტა'); return; }
    if (!confirm(`ახალი პაროლი გაუგზავნოს ${u.email}-ზე?`)) return;
    const r = await fetch(`/api/construction/users/${u.id}/regenerate-password`, {method: 'POST'});
    if (!r.ok) { flashToast('ვერ გაიგზავნა'); return; }
    const body = await r.json();
    if (body.stubbed && body.temp_password) {
      alert(`RESEND_API_KEY არ არის.\n\nახალი პაროლი:\n${body.temp_password}`);
    } else {
      flashToast('ახალი პაროლი გაიგზავნა ✓');
    }
  }

  async function patchUser(id: string, body: Record<string, unknown>, label: string) {
    const res = await fetch(`/api/construction/users/${id}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      flashToast(b?.error === 'static_admin_locked' ? 'სტატიკური ადმინი ვერ იცვლება' : 'ვერ მოხერხდა');
      return;
    }
    flashToast(label);
    loadAll();
  }

  async function deleteUser(u: ConstructionUser) {
    if (u.is_static) { flashToast('სტატიკური ადმინი ვერ წაიშლება'); return; }
    if (!confirm(`წავშალო "${u.username}"?`)) return;
    const res = await fetch(`/api/construction/users/${u.id}`, {method: 'DELETE'});
    if (!res.ok) { flashToast('წაშლა ვერ მოხერხდა'); return; }
    flashToast('წაიშალა');
    loadAll();
  }

  async function setEmail(u: ConstructionUser) {
    const next = prompt(`${u.username}-ის ელფოსტა:`, u.email || '');
    if (next === null) return;
    await patchUser(u.id, {email: next.trim()}, next.trim() ? 'ელფოსტა განახლდა' : 'ელფოსტა წაიშალა');
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {/* Header */}
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5 text-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-[#1565C0] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 2l10 20H2z" /><path d="M10 14h4v8h-4z" />
            </svg>
          </div>
          <span className="font-bold text-slate-900">KAYA Construction</span>
          <span className="text-slate-300">·</span>
          <span className="font-semibold" style={{color: PRIMARY}}>Admin Panel</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-slate-500 sm:inline">{session.displayName || session.username}</span>
          <Link
            href="/construction/app"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            ← ინვენტარიზაცია
          </Link>
          <button
            onClick={logout}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            გასვლა
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-slate-200 bg-white px-4">
        {(['users', 'activity', 'events'] as const).map((t) => {
          const labels = {users: 'მომხმარებლები', activity: 'Audit Log', events: 'Login Events'};
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`mr-1 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
                tab === t
                  ? 'border-[#1565C0] text-[#1565C0]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {labels[t]}
            </button>
          );
        })}
      </div>

      <div className="mx-auto max-w-6xl px-4 py-6">
        {loading && (
          <div className="py-12 text-center text-sm text-slate-400">იტვირთება…</div>
        )}

        {!loading && tab === 'users' && (
          <div className="space-y-6">
            {/* Create user form */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-4 text-sm font-bold text-slate-900">ახალი მომხმარებელი</h2>
              <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">Username *</label>
                  <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="user_giorgi"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">სახელი</label>
                  <input value={newDisplay} onChange={(e) => setNewDisplay(e.target.value)} placeholder="გიორგი მ."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">ელფოსტა *</label>
                  <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required type="email" placeholder="giorgi@example.com"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">პაროლი (ან ავტო)</label>
                  <input value={newPassword} onChange={(e) => setNewPassword(e.target.value)} type="text" placeholder="ცარიელი = ავტო 4-char"
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none focus:ring-2 focus:ring-[#1565C0]/20" />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">როლი</label>
                  <select value={newRole} onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#1565C0] focus:outline-none">
                    <option value="user">user</option>
                    <option value="admin">admin</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <button type="submit" disabled={creating}
                    className="w-full rounded-lg px-4 py-2 text-sm font-semibold text-white transition disabled:opacity-60"
                    style={{background: PRIMARY}}>
                    {creating ? 'იქმნება…' : '+ შექმნა'}
                  </button>
                </div>
              </form>
            </div>

            {/* Users table */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
                <span className="text-sm font-bold text-slate-900">მომხმარებლები</span>
                <span className="ml-2 text-xs text-slate-400">{users.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-3">Username</th>
                      <th className="px-4 py-3">სახელი</th>
                      <th className="px-4 py-3">ელფოსტა</th>
                      <th className="px-4 py-3">როლი</th>
                      <th className="px-4 py-3">სტატუსი</th>
                      <th className="px-4 py-3">ბოლო შესვლა</th>
                      <th className="px-4 py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[12px] font-semibold text-slate-900">{u.username}</span>
                            {u.is_static && <span className="rounded bg-slate-100 px-1 text-[10px] font-semibold text-slate-400">STATIC</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-700">{u.display_name || '—'}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => setEmail(u)} className="rounded px-2 py-0.5 text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-900">
                            {u.email || <span className="text-slate-300">+ ელფოსტა</span>}
                          </button>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.role === 'admin' ? 'bg-slate-100 text-[#1565C0]' : 'bg-slate-100 text-slate-600'}`}>
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => patchUser(u.id, {active: !u.active}, u.active ? 'დეაქტივირდა' : 'გააქტიურდა')}
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${u.active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
                          >
                            {u.active ? 'active' : 'inactive'}
                          </button>
                        </td>
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-400">
                          {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('ka') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => regeneratePassword(u)}
                              className="rounded px-2 py-1 text-[11px] font-medium text-slate-500 hover:bg-slate-100"
                              title="ახალი პაროლი ელფოსტაზე">🔑</button>
                            {!u.is_static && (
                              <button onClick={() => deleteUser(u)}
                                className="rounded px-2 py-1 text-[11px] font-medium text-red-400 hover:bg-red-50">✕</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {!loading && tab === 'activity' && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-sm font-bold text-slate-900">Audit Log</span>
              <span className="ml-2 text-xs text-slate-400">{audit.length} ჩანაწერი</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">თარიღი</th>
                    <th className="px-4 py-3">Actor</th>
                    <th className="px-4 py-3">Action</th>
                    <th className="px-4 py-3">Summary</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {audit.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{new Date(e.created_at).toLocaleString('ka')}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-slate-700">{e.actor}</td>
                      <td className="px-4 py-2.5"><span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#1565C0]">{e.action}</span></td>
                      <td className="px-4 py-2.5 text-xs text-slate-600">{e.summary || '—'}</td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{e.ip || '—'}</td>
                    </tr>
                  ))}
                  {audit.length === 0 && (
                    <tr><td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-400">ჯერ ჩანაწერი არ არის</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loading && tab === 'events' && (
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
              <span className="text-sm font-bold text-slate-900">Login Events</span>
              <span className="ml-2 text-xs text-slate-400">{events.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="px-4 py-3">თარიღი</th>
                    <th className="px-4 py-3">Username</th>
                    <th className="px-4 py-3">სტატუსი</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody>
                  {events.map((e) => (
                    <tr key={e.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{new Date(e.created_at).toLocaleString('ka')}</td>
                      <td className="px-4 py-2.5 font-mono text-[12px] font-semibold text-slate-700">{e.username}</td>
                      <td className="px-4 py-2.5">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${e.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                          {e.success ? 'OK' : 'FAIL'}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-[11px] text-slate-400">{e.ip || '—'}</td>
                    </tr>
                  ))}
                  {events.length === 0 && (
                    <tr><td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-400">ჯერ ჩანაწერი არ არის</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white shadow-lg"
          style={{background: PRIMARY}}>
          {toast}
        </div>
      )}
    </div>
  );
}
