'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {UserPlus, Trash2, ShieldCheck, UserCheck, UserX} from 'lucide-react';
import {DmtPageShell} from '@/components/dmt/page-shell';

type Role = 'owner' | 'admin' | 'member' | 'viewer';
type Status = 'active' | 'invited' | 'suspended';

type User = {
  id: string;
  email: string;
  name: string;
  role: Role;
  status: Status;
  last_login_at: string | null;
  created_at: string;
};

const ROLE_META: Record<Role, {label: string; color: string; bg: string; border: string}> = {
  owner:  {label: 'Owner',  color: '#7c3aed',       bg: '#ede9fe',       border: '#c4b5fd'},
  admin:  {label: 'Admin',  color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  member: {label: 'Member', color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  viewer: {label: 'Viewer', color: 'var(--text-2)', bg: 'var(--sur-2)',   border: 'var(--bdr)'}
};

const STATUS_META: Record<Status, {label: string; color: string; bg: string; border: string}> = {
  active:    {label: 'აქტიური',  color: 'var(--grn)',  bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  invited:   {label: 'მოწვეული', color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  suspended: {label: 'გაყინული', color: 'var(--red)',  bg: 'var(--red-lt)',  border: '#f0b8b4'}
};

type Me = {id: string; email: string; role: Role};

export default function DmtUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [me, setMe] = useState<Me | null>(null);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({name: '', email: '', password: '', role: 'member' as Role});
  const [formBusy, setFormBusy] = useState(false);
  const [formError, setFormError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/dmt/users');
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'load_failed');
        return;
      }
      setUsers(data.users || []);
      setMe(data.me || null);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'error');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function patch(id: string, body: Partial<User>) {
    const res = await fetch('/api/dmt/users', {
      method: 'PATCH',
      headers: {'content-type': 'application/json'},
      body: JSON.stringify({id, ...body})
    });
    if (res.ok) load();
  }

  async function remove(id: string, email: string) {
    if (!confirm(`წავშალო მომხმარებელი ${email}?`)) return;
    const res = await fetch(`/api/dmt/users?id=${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    if (res.ok) load();
    else {
      const d = await res.json().catch(() => ({}));
      alert(d.error || 'წაშლა ვერ მოხერხდა');
    }
  }

  async function submitNew(e: React.FormEvent) {
    e.preventDefault();
    setFormBusy(true);
    setFormError('');
    try {
      const res = await fetch('/api/dmt/auth/register', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(form)
      });
      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || data.message || 'შეცდომა');
        return;
      }
      setShowForm(false);
      setForm({name: '', email: '', password: '', role: 'member'});
      load();
    } finally {
      setFormBusy(false);
    }
  }

  const isOwner = me?.role === 'owner';

  const filtered = users.filter((u) => {
    const t = q.trim().toLowerCase();
    if (!t) return true;
    return (
      u.email.toLowerCase().includes(t) ||
      u.name.toLowerCase().includes(t) ||
      u.role.includes(t)
    );
  });

  return (
    <DmtPageShell
      kicker="TEAM · ACCESS CONTROL"
      title="მომხმარებლები"
      subtitle="admin / owner-ს შეუძლია ახალი მომხმარებლის მოწვევა, role-ის შეცვლა, გაყინვა"
      searchPlaceholder="ძიება email / სახელი / role…"
      onQueryChange={setQ}
    >
      <div className="px-6 py-5 md:px-8">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-mono text-[11px] text-text-3">
            {loading ? 'იტვირთება…' : `${filtered.length} / ${users.length} მომხმარებელი`}
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-1.5 rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2"
          >
            <UserPlus size={13} /> {showForm ? 'დახურვა' : '+ ახალი'}
          </button>
        </div>

        {showForm && (
          <form
            onSubmit={submitNew}
            className="mb-4 grid gap-2 rounded-[10px] border border-blue-bd bg-blue-lt/50 p-4 md:grid-cols-[1fr_1fr_1fr_120px_auto]"
          >
            <div>
              <label className="mb-0.5 block font-mono text-[9.5px] text-text-3">სახელი</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({...form, name: e.target.value})}
                className="w-full rounded-md border border-bdr bg-sur px-3 py-1.5 text-[13px] focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block font-mono text-[9.5px] text-text-3">Email</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={(e) => setForm({...form, email: e.target.value})}
                className="w-full rounded-md border border-bdr bg-sur px-3 py-1.5 text-[13px] focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block font-mono text-[9.5px] text-text-3">პაროლი (მინ. 8)</label>
              <input
                type="password"
                required
                minLength={8}
                value={form.password}
                onChange={(e) => setForm({...form, password: e.target.value})}
                className="w-full rounded-md border border-bdr bg-sur px-3 py-1.5 text-[13px] focus:border-blue focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-0.5 block font-mono text-[9.5px] text-text-3">Role</label>
              <select
                value={form.role}
                onChange={(e) => setForm({...form, role: e.target.value as Role})}
                className="w-full rounded-md border border-bdr bg-sur px-3 py-1.5 text-[13px] focus:border-blue focus:outline-none"
              >
                <option value="viewer">Viewer</option>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            <div className="self-end">
              <button
                type="submit"
                disabled={formBusy}
                className="w-full rounded-md border border-blue bg-blue px-3 py-1.5 text-[12px] font-semibold text-white hover:bg-navy-2 disabled:opacity-50"
              >
                {formBusy ? '…' : 'დამატება'}
              </button>
            </div>
            {formError && (
              <div className="col-span-full rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
                {formError}
              </div>
            )}
          </form>
        )}

        {error && (
          <div className="mb-4 rounded-md border border-red bg-red-lt px-3 py-2 text-[12px] text-red">
            {error === 'forbidden'
              ? 'მხოლოდ admin / owner-ს შეუძლია მომხმარებლების ნახვა.'
              : error}
          </div>
        )}

        <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
          <table className="w-full text-[12.5px]">
            <thead>
              <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase tracking-[0.06em] text-text-3">
                <th className="px-4 py-2.5">სახელი / Email</th>
                <th className="px-4 py-2.5">Role</th>
                <th className="px-4 py-2.5">სტატუსი</th>
                <th className="px-4 py-2.5">ბოლო შესვლა</th>
                <th className="px-4 py-2.5">შექმნა</th>
                <th className="px-4 py-2.5 w-20"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((u) => {
                const rm = ROLE_META[u.role];
                const sm = STATUS_META[u.status];
                return (
                  <tr key={u.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2">
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-navy text-[11px] font-bold uppercase text-white">
                          {(u.name || u.email)[0]}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-navy">{u.name || '—'}</div>
                          <div className="truncate font-mono text-[10.5px] text-text-3">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {isOwner ? (
                        <select
                          value={u.role}
                          onChange={(e) => patch(u.id, {role: e.target.value as Role})}
                          className="cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold focus:outline-none"
                          style={{color: rm.color, background: rm.bg, borderColor: rm.border}}
                        >
                          {(['owner', 'admin', 'member', 'viewer'] as Role[]).map((r) => (
                            <option key={r} value={r}>
                              {ROLE_META[r].label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span
                          className="inline-block rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                          style={{color: rm.color, background: rm.bg, borderColor: rm.border}}
                          title="role-ის შეცვლა მხოლოდ owner-ს შეუძლია"
                        >
                          {rm.label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={u.status}
                        onChange={(e) => patch(u.id, {status: e.target.value as Status})}
                        className="cursor-pointer appearance-none rounded-full border px-2 py-0.5 text-[10.5px] font-semibold focus:outline-none"
                        style={{color: sm.color, background: sm.bg, borderColor: sm.border}}
                      >
                        {(['active', 'invited', 'suspended'] as Status[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUS_META[s].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10.5px] text-text-3">
                      {u.last_login_at ? new Date(u.last_login_at).toLocaleString('en-GB') : '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-[10.5px] text-text-3">
                      {new Date(u.created_at).toLocaleDateString('en-GB')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isOwner && u.id !== me?.id ? (
                        <button
                          onClick={() => remove(u.id, u.email)}
                          className="rounded p-1 text-text-3 hover:bg-red-lt hover:text-red"
                          title="წაშლა"
                        >
                          <Trash2 size={13} />
                        </button>
                      ) : (
                        <span className="font-mono text-[10px] text-text-3">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-text-3">
                    მომხმარებელი არ არის
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-wrap gap-3 text-[11px] text-text-3">
          <span className="inline-flex items-center gap-1">
            <ShieldCheck size={12} /> Owner: სრული უფლებები — role-ის შეცვლა, წაშლა
          </span>
          <span className="inline-flex items-center gap-1">
            <UserCheck size={12} /> Admin: name/status-ის ცვლილება, invite — მაგრამ არა წაშლა/role
          </span>
          <span className="inline-flex items-center gap-1">
            <UserX size={12} /> Viewer: მხოლოდ კითხვა
          </span>
        </div>

        <div className="mt-4 rounded-[10px] border border-bdr bg-sur-2 p-3 text-[11.5px] leading-relaxed text-text-2">
          🔐 Auth რეალიზაცია: <b>dmt_users</b> Supabase table + bcrypt password hash + JWT cookie (`dmt_session`, 30d) + <code>middleware.ts</code> gate /dmt/*-ზე. იხილე <Link href="/admin" className="text-blue hover:underline">admin sidebar → DMT</Link>.
        </div>
      </div>
    </DmtPageShell>
  );
}
