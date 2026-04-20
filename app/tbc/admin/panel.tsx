'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {TbcSession} from '@/lib/tbc/auth';

type TbcUser = {
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
  user_agent: string | null;
  success: boolean;
  created_at: string;
};

export function TbcAdminPanel({session}: {session: TbcSession}) {
  const router = useRouter();
  const [tab, setTab] = useState<'users' | 'events'>('users');
  const [users, setUsers] = useState<TbcUser[]>([]);
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  // new user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, eRes] = await Promise.all([
        fetch('/api/tbc/users'),
        fetch('/api/tbc/login-events?limit=200')
      ]);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
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
    await fetch('/api/tbc/logout', {method: 'POST'});
    router.replace('/tbc');
    router.refresh();
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch('/api/tbc/users', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          username: newUsername.trim().toLowerCase(),
          password: newPassword,
          display_name: newDisplay || undefined,
          email: newEmail.trim() || undefined,
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
      setNewUsername('');
      setNewPassword('');
      setNewDisplay('');
      setNewEmail('');
      setNewRole('user');
      flashToast('მომხმარებელი დამატებულია');
      loadAll();
    } finally {
      setCreating(false);
    }
  }

  async function patchUser(id: string, body: Record<string, unknown>, label: string) {
    const res = await fetch(`/api/tbc/users/${id}`, {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify(body)
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      flashToast(
        b?.error === 'static_admin_locked'
          ? 'სტატიკური ადმინი ვერ იცვლება'
          : 'ვერ მოხერხდა'
      );
      return;
    }
    flashToast(label);
    loadAll();
  }

  async function deleteUser(u: TbcUser) {
    if (u.is_static) {
      flashToast('სტატიკური ადმინი ვერ წაიშლება');
      return;
    }
    if (!confirm(`წავშალო მომხმარებელი "${u.username}"?`)) return;
    const res = await fetch(`/api/tbc/users/${u.id}`, {method: 'DELETE'});
    if (!res.ok) {
      flashToast('წაშლა ვერ მოხერხდა');
      return;
    }
    flashToast('წაიშალა');
    loadAll();
  }

  async function resetPassword(u: TbcUser) {
    const pw = prompt(`ახალი პაროლი ${u.username}-სთვის (min 6 სიმბოლო):`);
    if (!pw || pw.length < 6) return;
    await patchUser(u.id, {password: pw}, 'პაროლი შეიცვალა');
  }

  async function setEmail(u: TbcUser) {
    const current = u.email || '';
    const next = prompt(`${u.username}-ის ელფოსტა:`, current);
    if (next === null) return;
    await patchUser(u.id, {email: next.trim()}, next.trim() ? 'ელფოსტა განახლდა' : 'ელფოსტა წაიშალა');
  }

  async function sendResetEmail(u: TbcUser) {
    if (!u.email) {
      flashToast('ჯერ დააყენე ელფოსტა');
      return;
    }
    if (!confirm(`გამოიგზავნოს პაროლის აღდგენის ბმული ${u.email}-ზე?`)) return;
    const res = await fetch(`/api/tbc/users/${u.id}/password-reset`, {
      method: 'POST'
    });
    if (!res.ok) {
      const b = await res.json().catch(() => ({}));
      flashToast(
        b?.error === 'no_email'
          ? 'ელფოსტა არ არის დაყენებული'
          : 'ვერ გაიგზავნა'
      );
      return;
    }
    const body = await res.json().catch(() => ({}));
    if (body?.stubbed) {
      const url = body.resetUrl || '';
      prompt(
        'RESEND_API_KEY არ არის დაყენებული — მეილი ვერ გაიგზავნა. აქ არის ბმული (copy):',
        url
      );
    } else {
      flashToast('ბმული გაიგზავნა ელფოსტაზე ✓');
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="flex items-center gap-4 border-b border-slate-200 bg-white px-4 py-2.5 text-sm">
        <div className="flex items-center gap-2">
          <div className="rounded border-2 border-[#0071CE] px-2 py-0.5 text-xs font-extrabold tracking-tight text-[#0071CE]">
            TBC
          </div>
          <span className="text-slate-300">×</span>
          <span className="flex h-6 w-6 items-center justify-center rounded bg-gradient-to-br from-[#00AA8D] to-[#008A73] font-mono text-xs font-extrabold text-white">
            D
          </span>
          <span className="font-bold">DMT · Admin</span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <span className="hidden text-slate-500 sm:inline">
            {session.displayName || session.username}
          </span>
          <Link
            href="/tbc/app"
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
          >
            ← ინვენტარი
          </Link>
          <button
            onClick={logout}
            className="rounded-md border border-slate-200 bg-white px-3 py-1.5 font-medium text-slate-700 hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            გასვლა
          </button>
        </div>
      </header>

      <div className="border-b border-slate-200 bg-white px-4">
        <div className="flex gap-1">
          {(
            [
              ['users', 'მომხმარებლები'],
              ['events', 'შესვლის ლოგი']
            ] as const
          ).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`border-b-2 px-4 py-3 text-sm font-semibold transition ${
                tab === k
                  ? 'border-[#0071CE] text-[#0071CE]'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="mx-auto max-w-5xl p-6">
        {tab === 'users' && (
          <div className="space-y-6">
            {/* Create user card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                ახალი მომხმარებელი
              </h2>
              <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-6">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username"
                  pattern="[a-z0-9_.\-]+"
                  minLength={3}
                  required
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                />
                <input
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  type="password"
                  placeholder="პაროლი (min 6)"
                  minLength={6}
                  required
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                />
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  type="email"
                  placeholder="ელფოსტა (reset-ისთვის)"
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                />
                <input
                  value={newDisplay}
                  onChange={(e) => setNewDisplay(e.target.value)}
                  placeholder="სახელი (საჩვენებელი)"
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                />
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-md bg-[#0071CE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005BA8] disabled:opacity-60"
                >
                  {creating ? '…' : '+ დამატება'}
                </button>
              </form>
            </div>

            {/* Users table */}
            <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                  ყველა მომხმარებელი
                </h2>
                <span className="font-mono text-xs text-slate-400">
                  {users.length} ჩანაწერი
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-4 py-2 text-left">username</th>
                      <th className="px-4 py-2 text-left">სახელი</th>
                      <th className="px-4 py-2 text-left">ელფოსტა</th>
                      <th className="px-4 py-2 text-left">როლი</th>
                      <th className="px-4 py-2 text-left">სტატუსი</th>
                      <th className="px-4 py-2 text-left">ბოლო შესვლა</th>
                      <th className="px-4 py-2 text-right">მოქმედება</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                          იტვირთება…
                        </td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                          არ არის მომხმარებელი
                        </td>
                      </tr>
                    ) : (
                      users.map((u) => (
                        <tr key={u.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-slate-900">
                            {u.username}
                            {u.is_static && (
                              <span className="ml-1.5 rounded bg-amber-100 px-1.5 py-0.5 font-sans text-[10px] font-bold text-amber-700">
                                static
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {u.display_name || '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            {u.email ? (
                              <span className="font-mono text-xs text-slate-600">
                                {u.email}
                              </span>
                            ) : (
                              <button
                                onClick={() => setEmail(u)}
                                className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-400 hover:border-[#0071CE] hover:text-[#0071CE]"
                              >
                                + დაამატე
                              </button>
                            )}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                u.role === 'admin'
                                  ? 'bg-[#E6F2FB] text-[#0071CE]'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {u.role}
                            </span>
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`rounded px-2 py-0.5 text-xs font-semibold ${
                                u.active ? 'bg-[#E0F7F3] text-[#008A73]' : 'bg-red-100 text-red-700'
                              }`}
                            >
                              {u.active ? 'აქტიური' : 'გამორთული'}
                            </span>
                          </td>
                          <td className="px-4 py-2.5 font-mono text-xs text-slate-500">
                            {u.last_login_at ? formatDate(u.last_login_at) : '—'}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex flex-wrap justify-end gap-1 text-xs">
                              {u.email && (
                                <button
                                  onClick={() => sendResetEmail(u)}
                                  className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                                  title="გაუგზავნე პაროლის აღდგენის ბმული ელფოსტაზე"
                                >
                                  📧 reset
                                </button>
                              )}
                              <button
                                onClick={() => setEmail(u)}
                                className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                              >
                                ელფოსტა
                              </button>
                              <button
                                onClick={() => resetPassword(u)}
                                className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                              >
                                პაროლი
                              </button>
                              {!u.is_static && (
                                <>
                                  <button
                                    onClick={() =>
                                      patchUser(
                                        u.id,
                                        {active: !u.active},
                                        u.active ? 'გამოირთო' : 'ჩაირთო'
                                      )
                                    }
                                    className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                                  >
                                    {u.active ? 'გამორთვა' : 'ჩართვა'}
                                  </button>
                                  <button
                                    onClick={() => deleteUser(u)}
                                    className="rounded border border-red-200 bg-white px-2 py-1 text-red-600 hover:bg-red-50"
                                  >
                                    წაშლა
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Static admin notice */}
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
              <b>სტატიკური ადმინები</b> (<code>admin_givi</code>, <code>admin_temo</code>) —
              მათი პაროლი ინახება environment variable-ში (<code>TBC_ADMIN_*_PASS_HASH</code>). პაროლის
              შესაცვლელად ან მისამართზე პროდაქშენის ცვლილებისთვის უნდა განახლდეს env.
            </div>
          </div>
        )}

        {tab === 'events' && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                შესვლის ლოგი
              </h2>
              <span className="font-mono text-xs text-slate-400">
                ბოლო {events.length}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-4 py-2 text-left">დრო</th>
                    <th className="px-4 py-2 text-left">მომხმარებელი</th>
                    <th className="px-4 py-2 text-left">IP</th>
                    <th className="px-4 py-2 text-left">სტატუსი</th>
                    <th className="px-4 py-2 text-left">User-Agent</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        იტვირთება…
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                        ლოგი ცარიელია
                      </td>
                    </tr>
                  ) : (
                    events.map((e) => (
                      <tr key={e.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="px-4 py-2 font-mono text-xs text-slate-600">
                          {formatDate(e.created_at)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs font-semibold text-slate-900">
                          {e.username}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs text-slate-500">
                          {e.ip || '—'}
                        </td>
                        <td className="px-4 py-2">
                          <span
                            className={`rounded px-2 py-0.5 text-xs font-semibold ${
                              e.success
                                ? 'bg-[#E0F7F3] text-[#008A73]'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {e.success ? 'წარმატება' : 'ჩავარდა'}
                          </span>
                        </td>
                        <td className="truncate px-4 py-2 text-xs text-slate-500 max-w-xs">
                          <span title={e.user_agent || ''}>
                            {e.user_agent ? e.user_agent.slice(0, 60) : '—'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
