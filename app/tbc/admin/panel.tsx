'use client';

import {useCallback, useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import Link from 'next/link';
import type {TbcSession} from '@/lib/tbc/auth';
import {TbcHelpModal, TbcHelpButton} from '@/components/tbc-help-modal';

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

type AuditEvent = {
  id: number;
  actor: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  summary: string | null;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

type Company = {
  id: number;
  name: string;
  type: 'client' | 'contractor' | 'supplier' | 'other';
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  tax_id: string | null;
  notes: string | null;
  active: boolean;
  created_at: string;
  created_by: string | null;
};

type CategoryReport = {
  category: string;
  planned: number;
  installed: number;
  unplanned: number;
  pct: number;
};
type SubtypeReport = CategoryReport & {subtype: string};
type RegionReport = {
  region: string;
  branches: number;
  planned: number;
  installed: number;
  unplanned: number;
  pct: number;
};

export function TbcAdminPanel({session}: {session: TbcSession}) {
  const router = useRouter();
  const [tab, setTab] = useState<
    'users' | 'companies' | 'tables' | 'activity' | 'events'
  >('users');
  const [users, setUsers] = useState<TbcUser[]>([]);
  const [events, setEvents] = useState<LoginEvent[]>([]);
  const [audit, setAudit] = useState<AuditEvent[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [report, setReport] = useState<{
    categories: CategoryReport[];
    subtypes: SubtypeReport[];
    regions: RegionReport[];
    totals: {
      branches: number;
      planned: number;
      installed: number;
      unplanned: number;
    };
  } | null>(null);
  const [auditActor, setAuditActor] = useState('');
  const [auditAction, setAuditAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);
  const [helpOpen, setHelpOpen] = useState(false);

  // new user form
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newDisplay, setNewDisplay] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [creating, setCreating] = useState(false);

  // company-access modal
  const [accessUser, setAccessUser] = useState<TbcUser | null>(null);
  const [accessWildcard, setAccessWildcard] = useState(false);
  const [accessIds, setAccessIds] = useState<Set<number>>(new Set());
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessSaving, setAccessSaving] = useState(false);
  const [accessSummary, setAccessSummary] = useState<Record<string, {count: number; wildcard: boolean}>>({});

  // branch-access modal (uses tbc_branch_permissions)
  const [branchAccessUser, setBranchAccessUser] = useState<TbcUser | null>(null);
  const [branchWildcard, setBranchWildcard] = useState(false);
  const [branchIds, setBranchIds] = useState<Set<number>>(new Set());
  const [branchAccessLoading, setBranchAccessLoading] = useState(false);
  const [branchAccessSaving, setBranchAccessSaving] = useState(false);
  const [branchAccessSummary, setBranchAccessSummary] = useState<Record<string, {count: number; wildcard: boolean}>>({});
  const [branchList, setBranchList] = useState<Array<{id: number; name: string; alias: string | null; region: string | null; city: string | null}>>([]);

  const loadAudit = useCallback(async () => {
    const params = new URLSearchParams();
    params.set('limit', '300');
    if (auditActor) params.set('actor', auditActor.trim().toLowerCase());
    if (auditAction) params.set('action', auditAction);
    const r = await fetch('/api/tbc/audit-log?' + params.toString());
    if (r.ok) setAudit((await r.json()).events || []);
  }, [auditActor, auditAction]);

  const loadCompanies = useCallback(async () => {
    const r = await fetch('/api/tbc/companies');
    if (r.ok) setCompanies((await r.json()).companies || []);
  }, []);

  const loadReport = useCallback(async () => {
    const r = await fetch('/api/tbc/reports/categories');
    if (r.ok) setReport(await r.json());
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [uRes, eRes, aRes, cRes, rRes] = await Promise.all([
        fetch('/api/tbc/users'),
        fetch('/api/tbc/login-events?limit=200'),
        fetch('/api/tbc/audit-log?limit=300'),
        fetch('/api/tbc/companies'),
        fetch('/api/tbc/reports/categories')
      ]);
      if (uRes.ok) setUsers((await uRes.json()).users || []);
      if (eRes.ok) setEvents((await eRes.json()).events || []);
      if (aRes.ok) setAudit((await aRes.json()).events || []);
      if (cRes.ok) setCompanies((await cRes.json()).companies || []);
      if (rRes.ok) setReport(await rRes.json());
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
    if (!newEmail.trim()) {
      flashToast('ელფოსტა სავალდებულოა — პაროლი ავტომატურად გაიგზავნება');
      return;
    }
    setCreating(true);
    try {
      const res = await fetch('/api/tbc/users', {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          username: newUsername.trim().toLowerCase(),
          // password is now optional — server auto-generates 4-char if absent
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
        alert(
          `RESEND_API_KEY არ არის დაყენებული — მეილი ვერ გაიგზავნა.\n\nდროებითი პაროლი (გადაეცი user-ს ხელით):\n\n${body.temp_password}`
        );
      } else {
        flashToast('მომხმარებელი დაემატა + მეილი გაიგზავნა ✓');
      }
      setNewUsername('');
      setNewPassword('');
      setNewDisplay('');
      setNewEmail('');
      setNewRole('user');
      loadAll();
    } finally {
      setCreating(false);
    }
  }

  async function regenerateUserPassword(u: TbcUser) {
    if (!u.email) {
      flashToast('ჯერ დააყენე ელფოსტა');
      return;
    }
    if (!confirm(`დააგენერიროს ახალი 4-სიმბოლოიანი პაროლი და გაუგზავნოს ${u.email}-ზე?`))
      return;
    const r = await fetch(`/api/tbc/users/${u.id}/regenerate-password`, {
      method: 'POST'
    });
    if (!r.ok) {
      flashToast('ვერ გაიგზავნა');
      return;
    }
    const body = await r.json();
    if (body.stubbed && body.temp_password) {
      alert(
        `RESEND_API_KEY არ არის დაყენებული — მეილი ვერ გაიგზავნა.\n\nახალი პაროლი (გადაეცი user-ს ხელით):\n\n${body.temp_password}`
      );
    } else {
      flashToast('ახალი პაროლი გაიგზავნა ელფოსტაზე ✓');
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

  async function setEmail(u: TbcUser) {
    const current = u.email || '';
    const next = prompt(`${u.username}-ის ელფოსტა:`, current);
    if (next === null) return;
    await patchUser(u.id, {email: next.trim()}, next.trim() ? 'ელფოსტა განახლდა' : 'ელფოსტა წაიშალა');
  }

  const [accessLoadError, setAccessLoadError] = useState(false);

  async function openCompanyAccess(u: TbcUser) {
    setAccessUser(u);
    setAccessWildcard(false);
    setAccessIds(new Set());
    setAccessLoading(true);
    setAccessLoadError(false);
    try {
      const r = await fetch(`/api/tbc/users/${u.id}/companies`);
      if (r.ok) {
        const b = await r.json();
        setAccessWildcard(!!b.wildcard);
        setAccessIds(new Set<number>((b.companyIds || []) as number[]));
      } else {
        setAccessLoadError(true);
        flashToast('ვერ ჩაიტვირთა — save გათიშულია');
      }
    } catch {
      setAccessLoadError(true);
      flashToast('ვერ ჩაიტვირთა — save გათიშულია');
    } finally {
      setAccessLoading(false);
    }
  }

  const [branchAccessLoadError, setBranchAccessLoadError] = useState(false);

  async function openBranchAccess(u: TbcUser) {
    setBranchAccessUser(u);
    setBranchWildcard(false);
    setBranchIds(new Set());
    setBranchAccessLoading(true);
    setBranchAccessLoadError(false);
    try {
      // load branch list if needed
      if (branchList.length === 0) {
        const br = await fetch('/api/tbc/branches');
        if (br.ok) {
          const data = await br.json();
          const rows = (data.branches || []) as Array<{
            id: number;
            name: string;
            alias: string | null;
            region: string | null;
            city: string | null;
          }>;
          setBranchList(rows);
        }
      }
      const r = await fetch(`/api/tbc/users/${u.id}/branches`);
      if (r.ok) {
        const b = await r.json();
        setBranchWildcard(!!b.wildcard);
        setBranchIds(new Set<number>((b.branchIds || []) as number[]));
      } else {
        setBranchAccessLoadError(true);
        flashToast('ვერ ჩაიტვირთა — save გათიშულია');
      }
    } catch {
      setBranchAccessLoadError(true);
      flashToast('ვერ ჩაიტვირთა — save გათიშულია');
    } finally {
      setBranchAccessLoading(false);
    }
  }

  async function saveBranchAccess() {
    if (!branchAccessUser) return;
    setBranchAccessSaving(true);
    try {
      const r = await fetch(`/api/tbc/users/${branchAccessUser.id}/branches`, {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          wildcard: branchWildcard,
          branchIds: branchWildcard ? [] : Array.from(branchIds)
        })
      });
      if (!r.ok) {
        flashToast('ვერ შეინახა');
        return;
      }
      const count = branchWildcard ? branchList.length : branchIds.size;
      setBranchAccessSummary((prev) => ({
        ...prev,
        [branchAccessUser.id]: {count, wildcard: branchWildcard}
      }));
      flashToast(
        branchWildcard
          ? 'ყველა ფილიალის წვდომა მიანიჭა'
          : `${count} ფილიალის წვდომა შეინახა`
      );
      setBranchAccessUser(null);
    } finally {
      setBranchAccessSaving(false);
    }
  }


  async function saveCompanyAccess() {
    if (!accessUser) return;
    setAccessSaving(true);
    try {
      const r = await fetch(`/api/tbc/users/${accessUser.id}/companies`, {
        method: 'PUT',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({
          wildcard: accessWildcard,
          companyIds: accessWildcard ? [] : Array.from(accessIds)
        })
      });
      if (!r.ok) {
        flashToast('ვერ შეინახა');
        return;
      }
      const count = accessWildcard ? companies.length : accessIds.size;
      setAccessSummary((prev) => ({
        ...prev,
        [accessUser.id]: {count, wildcard: accessWildcard}
      }));
      flashToast(
        accessWildcard
          ? 'ყველა კომპანიის წვდომა მიანიჭა'
          : `${count} კომპანიის წვდომა შეინახა`
      );
      setAccessUser(null);
    } finally {
      setAccessSaving(false);
    }
  }

  const loadAccessSummaries = useCallback(async (list: TbcUser[]) => {
    const nonAdmin = list.filter((u) => u.role === 'user');
    const results = await Promise.all(
      nonAdmin.map(async (u) => {
        try {
          const [cr, br] = await Promise.all([
            fetch(`/api/tbc/users/${u.id}/companies`),
            fetch(`/api/tbc/users/${u.id}/branches`)
          ]);
          const c = cr.ok ? await cr.json() : null;
          const b = br.ok ? await br.json() : null;
          return [
            u.id,
            {
              company: c ? {count: (c.companyIds || []).length, wildcard: !!c.wildcard} : null,
              branch: b ? {count: (b.branchIds || []).length, wildcard: !!b.wildcard} : null
            }
          ] as const;
        } catch {
          return null;
        }
      })
    );
    const cMap: Record<string, {count: number; wildcard: boolean}> = {};
    const bMap: Record<string, {count: number; wildcard: boolean}> = {};
    for (const r of results) {
      if (!r) continue;
      if (r[1].company) cMap[r[0]] = r[1].company;
      if (r[1].branch) bMap[r[0]] = r[1].branch;
    }
    setAccessSummary(cMap);
    setBranchAccessSummary(bMap);
  }, []);

  useEffect(() => {
    if (users.length > 0) loadAccessSummaries(users);
  }, [users, loadAccessSummaries]);

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
        <div className="flex items-center gap-3">
          <img src="/tbc/logos/tbc.svg" alt="TBC" className="h-7 w-auto" />
          <span className="text-slate-300">×</span>
          <img src="/tbc/logos/dmt.png" alt="DMT" className="h-6 w-auto" />
          <span className="ml-3 rounded bg-red-100 px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider text-red-700">
            Admin
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2 text-xs">
          <TbcHelpButton onClick={() => setHelpOpen(true)} />
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
              ['companies', 'კომპანიები'],
              ['tables', 'ცხრილი'],
              ['activity', 'მოქმედებათა ლოგი'],
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

      <main className="mx-auto w-full max-w-[1600px] p-6">
        {tab === 'users' && (
          <div className="space-y-6">
            {/* Create user card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
                ახალი მომხმარებელი
              </h2>
              <form onSubmit={createUser} className="grid gap-3 sm:grid-cols-5">
                <input
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username *"
                  pattern="[a-z0-9_.\-]+"
                  minLength={3}
                  required
                  className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
                />
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  type="email"
                  placeholder="ელფოსტა *"
                  required
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
                  {creating ? '…' : '+ დამატება + email'}
                </button>
              </form>
              <p className="mt-3 rounded-md bg-[#E6F2FB] px-3 py-2 text-[11px] leading-relaxed text-[#005BA8] ring-1 ring-[#0071CE]/20">
                🔐 <b>4-სიმბოლოიანი ერთჯერადი პაროლი</b> ავტომატურად დაგენერირდება
                და გაიგზავნება ელფოსტაზე bcrypt-ით დაშიფრული სახით ინახება ბაზაში —
                აღდგენა შეუძლებელია. მხოლოდ ადმინს შეუძლია ახალი generate-ს გაკეთება.
              </p>
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
                              <button
                                onClick={() => setEmail(u)}
                                className="inline-flex items-center gap-1 font-mono text-xs text-slate-600 hover:text-[#0071CE]"
                                title="ელფოსტის შეცვლა"
                              >
                                {u.email}
                              </button>
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
                            <div className="inline-flex items-center justify-end gap-1 text-xs">
                              {u.role === 'user' ? (
                                <AccessPill
                                  label="ფილიალები"
                                  summary={branchAccessSummary[u.id]}
                                  onClick={() => openBranchAccess(u)}
                                  title="ფილიალებზე წვდომა"
                                />
                              ) : (
                                <span
                                  className="inline-flex items-center rounded border border-dashed border-slate-200 px-2 py-1 text-[11px] text-slate-400"
                                  title="ადმინებს ყოველთვის აქვთ სრული წვდომა"
                                >
                                  ყველა წვდომა (ადმინი)
                                </span>
                              )}

                              <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />

                              {u.is_static ? (
                                <span
                                  className="inline-flex items-center rounded border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-semibold text-amber-700"
                                  title="სტატიკური ადმინი — პაროლი env-ში"
                                >
                                  env-ით იმართება
                                </span>
                              ) : (
                                <>
                                  <button
                                    onClick={() =>
                                      u.email
                                        ? regenerateUserPassword(u)
                                        : flashToast('ჯერ დააყენე ელფოსტა')
                                    }
                                    disabled={!u.email}
                                    className={
                                      u.email
                                        ? 'rounded border border-[#0071CE]/30 bg-[#E6F2FB] px-2.5 py-1 font-semibold text-[#0071CE] hover:bg-[#0071CE] hover:text-white'
                                        : 'cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-400 opacity-60'
                                    }
                                    title={
                                      u.email
                                        ? 'ახალი 4-სიმბოლოიანი პაროლი ელფოსტაზე'
                                        : 'ელფოსტა არ არის — ჯერ დაამატე'
                                    }
                                  >
                                    ახალი პაროლი
                                  </button>
                                  <button
                                    onClick={() =>
                                      u.email
                                        ? sendResetEmail(u)
                                        : flashToast('ჯერ დააყენე ელფოსტა')
                                    }
                                    disabled={!u.email}
                                    className={
                                      u.email
                                        ? 'rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50'
                                        : 'cursor-not-allowed rounded border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-400 opacity-60'
                                    }
                                    title={
                                      u.email
                                        ? 'reset ბმული ელფოსტაზე'
                                        : 'ელფოსტა არ არის — ჯერ დაამატე'
                                    }
                                  >
                                    reset ბმული
                                  </button>

                                  <span className="mx-1 h-5 w-px bg-slate-200" aria-hidden />

                                  <button
                                    onClick={() =>
                                      patchUser(
                                        u.id,
                                        {active: !u.active},
                                        u.active ? 'გამოირთო' : 'ჩაირთო'
                                      )
                                    }
                                    className="rounded border border-slate-200 bg-white px-2.5 py-1 text-slate-700 hover:bg-slate-50"
                                    title={u.active ? 'გამორთვა' : 'ჩართვა'}
                                  >
                                    {u.active ? 'გამორთვა' : 'ჩართვა'}
                                  </button>
                                  <button
                                    onClick={() => deleteUser(u)}
                                    className="rounded border border-red-200 bg-white px-2.5 py-1 text-red-600 hover:bg-red-50"
                                    title="წაშლა"
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

        {tab === 'companies' && (
          <CompaniesPanel
            rows={companies}
            loading={loading}
            reload={loadCompanies}
            flash={flashToast}
          />
        )}

        {tab === 'tables' && (
          <TablesPanel
            data={report}
            loading={loading}
            reload={loadReport}
          />
        )}

        {tab === 'activity' && (
          <ActivityPanel
            events={audit}
            loading={loading}
            actor={auditActor}
            setActor={setAuditActor}
            action={auditAction}
            setAction={setAuditAction}
            reload={loadAudit}
          />
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

      {helpOpen && (
        <TbcHelpModal
          role={session.role}
          onClose={() => setHelpOpen(false)}
        />
      )}

      {branchAccessUser && (
        <BranchAccessModal
          user={branchAccessUser}
          branches={branchList}
          wildcard={branchWildcard}
          selected={branchIds}
          loading={branchAccessLoading}
          saving={branchAccessSaving}
          loadError={branchAccessLoadError}
          onToggleWildcard={(v) => {
            setBranchWildcard(v);
            if (v) setBranchIds(new Set());
          }}
          onToggleBranch={(id) => {
            setBranchIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectAll={() => setBranchIds(new Set(branchList.map((b) => b.id)))}
          onClear={() => {
            setBranchIds(new Set());
            setBranchWildcard(false);
          }}
          onClose={() => setBranchAccessUser(null)}
          onSave={saveBranchAccess}
        />
      )}

      {accessUser && (
        <CompanyAccessModal
          user={accessUser}
          companies={companies}
          wildcard={accessWildcard}
          selected={accessIds}
          loading={accessLoading}
          saving={accessSaving}
          loadError={accessLoadError}
          onToggleWildcard={(v) => {
            setAccessWildcard(v);
            if (v) setAccessIds(new Set());
          }}
          onToggleCompany={(id) => {
            setAccessIds((prev) => {
              const next = new Set(prev);
              if (next.has(id)) next.delete(id);
              else next.add(id);
              return next;
            });
          }}
          onSelectAll={() => setAccessIds(new Set(companies.map((c) => c.id)))}
          onClear={() => {
            setAccessIds(new Set());
            setAccessWildcard(false);
          }}
          onClose={() => setAccessUser(null)}
          onSave={saveCompanyAccess}
        />
      )}
    </div>
  );
}

function AccessPill({
  label,
  srLabel,
  summary,
  onClick,
  title
}: {
  label: string;
  srLabel?: string;
  summary?: {count: number; wildcard: boolean};
  onClick: () => void;
  title: string;
}) {
  const badge = summary?.wildcard ? (
    <span className="ml-1 rounded bg-[#0071CE] px-1 py-0 text-[10px] font-bold text-white">
      ALL
    </span>
  ) : summary && summary.count > 0 ? (
    <span className="ml-1 rounded bg-[#E6F2FB] px-1 py-0 text-[10px] font-bold text-[#0071CE]">
      {summary.count}
    </span>
  ) : (
    <span className="ml-1 rounded bg-red-100 px-1 py-0 text-[10px] font-bold text-red-700">
      0
    </span>
  );
  return (
    <button
      onClick={onClick}
      title={title}
      className="inline-flex items-center rounded border border-[#0071CE]/30 bg-white px-2 py-1 font-semibold text-[#0071CE] hover:bg-[#E6F2FB]"
      aria-label={srLabel || title}
    >
      {label}
      {badge}
    </button>
  );
}

function CompanyAccessModal({
  user,
  companies,
  wildcard,
  selected,
  loading,
  saving,
  loadError,
  onToggleWildcard,
  onToggleCompany,
  onSelectAll,
  onClear,
  onClose,
  onSave
}: {
  user: TbcUser;
  companies: Company[];
  wildcard: boolean;
  selected: Set<number>;
  loading: boolean;
  saving: boolean;
  loadError: boolean;
  onToggleWildcard: (v: boolean) => void;
  onToggleCompany: (id: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [q, setQ] = useState('');
  const filtered = companies.filter((c) => {
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return (
      c.name.toLowerCase().includes(t) ||
      (c.contact_person || '').toLowerCase().includes(t) ||
      (c.tax_id || '').toLowerCase().includes(t) ||
      c.type.toLowerCase().includes(t)
    );
  });

  const countLabel = wildcard
    ? 'ყველა კომპანია'
    : `${selected.size} / ${companies.length} არჩეული`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              კომპანიების წვდომა
            </div>
            <div className="text-base font-bold text-slate-900">
              {user.display_name || user.username}{' '}
              <span className="font-mono text-sm font-normal text-slate-500">
                ({user.username})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={wildcard}
              onChange={(e) => onToggleWildcard(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#0071CE]"
            />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">
                ყველა კომპანიის წვდომა (wildcard)
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                მომავალში დამატებული კომპანიებიც ავტომატურად ხილული იქნება.
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 კომპანიის ძიება…"
            className="flex-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#0071CE] focus:outline-none"
            disabled={wildcard}
          />
          <button
            onClick={onSelectAll}
            disabled={wildcard}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ყველა
          </button>
          <button
            onClick={onClear}
            disabled={wildcard && selected.size === 0}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            გასუფთავება
          </button>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${wildcard ? 'pointer-events-none opacity-50' : ''}`}>
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">იტვირთება…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              {companies.length === 0 ? 'კომპანიები ჯერ არაა დამატებული' : 'ვერ მოიძებნა'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((c) => {
                const on = selected.has(c.id);
                return (
                  <li key={c.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-5 py-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={on || wildcard}
                        disabled={wildcard}
                        onChange={() => onToggleCompany(c.id)}
                        className="h-4 w-4 accent-[#0071CE]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {c.name}
                          </span>
                          <span
                            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                              c.type === 'client'
                                ? 'bg-[#E0F7F3] text-[#008A73]'
                                : c.type === 'contractor'
                                  ? 'bg-[#E6F2FB] text-[#0071CE]'
                                  : c.type === 'supplier'
                                    ? 'bg-amber-100 text-amber-700'
                                    : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {c.type}
                          </span>
                          {!c.active && (
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
                              გამორთული
                            </span>
                          )}
                        </div>
                        {(c.contact_person || c.tax_id) && (
                          <div className="mt-0.5 flex gap-3 text-xs text-slate-500">
                            {c.contact_person && <span>👤 {c.contact_person}</span>}
                            {c.tax_id && <span className="font-mono">#{c.tax_id}</span>}
                          </div>
                        )}
                      </div>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-xs text-slate-600">
            {loadError ? (
              <span className="font-semibold text-red-600">
                ⚠ მონაცემების ჩატვირთვა ვერ მოხერხდა — save გათიშული (data-safety)
              </span>
            ) : (
              <span className="font-semibold">{countLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              გაუქმება
            </button>
            <button
              onClick={onSave}
              disabled={saving || loading || loadError}
              className="rounded bg-[#0071CE] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#005ca8] disabled:opacity-50"
            >
              {saving ? 'ინახება…' : 'შენახვა'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function BranchAccessModal({
  user,
  branches,
  wildcard,
  selected,
  loading,
  saving,
  loadError,
  onToggleWildcard,
  onToggleBranch,
  onSelectAll,
  onClear,
  onClose,
  onSave
}: {
  user: TbcUser;
  branches: Array<{id: number; name: string; alias: string | null; region: string | null; city: string | null}>;
  wildcard: boolean;
  selected: Set<number>;
  loading: boolean;
  saving: boolean;
  loadError: boolean;
  onToggleWildcard: (v: boolean) => void;
  onToggleBranch: (id: number) => void;
  onSelectAll: () => void;
  onClear: () => void;
  onClose: () => void;
  onSave: () => void;
}) {
  const [q, setQ] = useState('');
  const [regionFilter, setRegionFilter] = useState('');

  const regions = Array.from(
    new Set(branches.map((b) => b.region).filter((r): r is string => !!r))
  ).sort();

  const filtered = branches.filter((b) => {
    if (regionFilter && b.region !== regionFilter) return false;
    if (!q.trim()) return true;
    const t = q.trim().toLowerCase();
    return (
      b.name.toLowerCase().includes(t) ||
      (b.alias || '').toLowerCase().includes(t) ||
      (b.city || '').toLowerCase().includes(t) ||
      (b.region || '').toLowerCase().includes(t)
    );
  });

  const countLabel = wildcard
    ? 'ყველა ფილიალი'
    : `${selected.size} / ${branches.length} არჩეული`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className="flex h-[80vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <div>
            <div className="text-xs uppercase tracking-wide text-slate-500">
              ფილიალების წვდომა
            </div>
            <div className="text-base font-bold text-slate-900">
              {user.display_name || user.username}{' '}
              <span className="font-mono text-sm font-normal text-slate-500">
                ({user.username})
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded border border-slate-200 bg-white px-2.5 py-1 text-sm text-slate-600 hover:bg-slate-50"
          >
            ✕
          </button>
        </header>

        <div className="border-b border-slate-200 bg-slate-50 px-5 py-3">
          <label className="flex cursor-pointer items-start gap-2.5">
            <input
              type="checkbox"
              checked={wildcard}
              onChange={(e) => onToggleWildcard(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[#0071CE]"
            />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">
                ყველა ფილიალის წვდომა (wildcard)
              </div>
              <div className="mt-0.5 text-xs text-slate-500">
                მომავალში დამატებული ფილიალებიც ავტომატურად ხილული იქნება.
              </div>
            </div>
          </label>
        </div>

        <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-2">
          <input
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="🔍 ფილიალის ძიება…"
            className="flex-1 rounded border border-slate-200 bg-white px-3 py-1.5 text-sm focus:border-[#0071CE] focus:outline-none"
            disabled={wildcard}
          />
          {regions.length > 0 && (
            <select
              value={regionFilter}
              onChange={(e) => setRegionFilter(e.target.value)}
              disabled={wildcard}
              className="rounded border border-slate-200 bg-white px-2 py-1.5 text-sm focus:border-[#0071CE] focus:outline-none disabled:opacity-40"
            >
              <option value="">ყველა რეგიონი</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          )}
          <button
            onClick={onSelectAll}
            disabled={wildcard}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            ყველა
          </button>
          <button
            onClick={onClear}
            disabled={wildcard && selected.size === 0}
            className="rounded border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            გასუფთავება
          </button>
        </div>

        <div className={`min-h-0 flex-1 overflow-y-auto ${wildcard ? 'pointer-events-none opacity-50' : ''}`}>
          {loading ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">იტვირთება…</div>
          ) : filtered.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-slate-400">
              {branches.length === 0 ? 'ფილიალები ჯერ არაა დამატებული' : 'ვერ მოიძებნა'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const on = selected.has(b.id);
                return (
                  <li key={b.id}>
                    <label className="flex cursor-pointer items-center gap-3 px-5 py-2 hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={on || wildcard}
                        disabled={wildcard}
                        onChange={() => onToggleBranch(b.id)}
                        className="h-4 w-4 accent-[#0071CE]"
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          {b.alias && (
                            <span className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                              {b.alias}
                            </span>
                          )}
                          <span className="truncate text-sm font-semibold text-slate-900">
                            {b.name}
                          </span>
                        </div>
                        {(b.region || b.city) && (
                          <div className="mt-0.5 flex gap-3 text-xs text-slate-500">
                            {b.region && <span>📍 {b.region}</span>}
                            {b.city && <span>{b.city}</span>}
                          </div>
                        )}
                      </div>
                      <span className="shrink-0 font-mono text-[10px] text-slate-400">#{b.id}</span>
                    </label>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-5 py-3">
          <div className="text-xs text-slate-600">
            {loadError ? (
              <span className="font-semibold text-red-600">
                ⚠ მონაცემების ჩატვირთვა ვერ მოხერხდა — save გათიშული (data-safety)
              </span>
            ) : (
              <span className="font-semibold">{countLabel}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="rounded border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              გაუქმება
            </button>
            <button
              onClick={onSave}
              disabled={saving || loading || loadError}
              className="rounded bg-[#0071CE] px-3 py-1.5 text-sm font-semibold text-white hover:bg-[#005ca8] disabled:opacity-50"
            >
              {saving ? 'ინახება…' : 'შენახვა'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const ACTION_META: Record<
  string,
  {emoji: string; label: string; color: string; bg: string}
> = {
  'login.success': {emoji: '🔓', label: 'შემოვიდა', color: '#008A73', bg: '#E0F7F3'},
  'login.fail': {emoji: '🚫', label: 'ვერ შემოვიდა', color: '#DC2626', bg: '#FEE2E2'},
  'logout': {emoji: '🚪', label: 'გავიდა', color: '#64748B', bg: '#F1F5F9'},
  'branch.create': {emoji: '🏢', label: 'ფილიალი.შექმნა', color: '#0071CE', bg: '#E6F2FB'},
  'branch.update': {emoji: '✏️', label: 'ფილიალი.ცვლილება', color: '#0071CE', bg: '#E6F2FB'},
  'device.add': {emoji: '➕', label: 'მოწყობ.დამატება', color: '#00AA8D', bg: '#E0F7F3'},
  'comment.post': {emoji: '💬', label: 'განცხად.დაწერა', color: '#8B5CF6', bg: '#EDE9FE'},
  'comment.delete': {emoji: '🗑', label: 'განცხად.წაშლა', color: '#DC2626', bg: '#FEE2E2'},
  'estimate.save': {emoji: '💰', label: 'ხარჯთა.შენახვა', color: '#D97706', bg: '#FEF3C7'},
  'user.create': {emoji: '👤', label: 'user.შექმნა', color: '#0071CE', bg: '#E6F2FB'},
  'user.update': {emoji: '📝', label: 'user.ცვლილება', color: '#0071CE', bg: '#E6F2FB'},
  'user.delete': {emoji: '🗑', label: 'user.წაშლა', color: '#DC2626', bg: '#FEE2E2'},
  'user.reset_password': {emoji: '🔑', label: 'პაროლი შეიცვალა', color: '#D97706', bg: '#FEF3C7'},
  'password_reset.request': {emoji: '📧', label: 'reset.მოთხოვნა', color: '#8B5CF6', bg: '#EDE9FE'},
  'password_reset.confirm': {emoji: '✅', label: 'reset.შესრულდა', color: '#008A73', bg: '#E0F7F3'},
  'password_reset.admin_send': {emoji: '📮', label: 'reset.გაგზავნა', color: '#0071CE', bg: '#E6F2FB'},
  'seed': {emoji: '🌱', label: 'bulk import', color: '#64748B', bg: '#F1F5F9'}
};

function ActivityPanel({
  events,
  loading,
  actor,
  setActor,
  action,
  setAction,
  reload
}: {
  events: AuditEvent[];
  loading: boolean;
  actor: string;
  setActor: (v: string) => void;
  action: string;
  setAction: (v: string) => void;
  reload: () => void;
}) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  function toggle(id: number) {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          მოქმედებათა ლოგი
        </h2>
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          <input
            value={actor}
            onChange={(e) => setActor(e.target.value)}
            placeholder="🔍 username"
            className="w-32 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-xs"
          >
            <option value="">ყველა ტიპი</option>
            <option value="login">ლოგინი</option>
            <option value="branch">ფილიალი</option>
            <option value="device">მოწყობილობა</option>
            <option value="comment">განცხადება</option>
            <option value="estimate">ხარჯთაღრიცხვა</option>
            <option value="user">მომხმარებელი</option>
            <option value="password_reset">პაროლი</option>
          </select>
          <button
            onClick={reload}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            გამოიყენე
          </button>
          <span className="font-mono text-slate-400">{events.length}</span>
        </div>
      </div>

      <div className="divide-y divide-slate-100">
        {loading ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            იტვირთება…
          </div>
        ) : events.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-slate-400">
            ლოგი ცარიელია
          </div>
        ) : (
          events.map((e) => {
            const meta =
              ACTION_META[e.action] ||
              {emoji: '•', label: e.action, color: '#64748B', bg: '#F1F5F9'};
            const isOpen = expanded.has(e.id);
            return (
              <div key={e.id}>
                <button
                  onClick={() => toggle(e.id)}
                  className="grid w-full grid-cols-[auto_auto_1fr_auto] items-start gap-3 px-5 py-2.5 text-left text-sm hover:bg-slate-50"
                >
                  <span
                    className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold"
                    style={{background: meta.bg, color: meta.color}}
                    title={e.action}
                  >
                    {meta.emoji} {meta.label}
                  </span>
                  <span className="shrink-0 font-mono text-xs text-slate-900">
                    {e.actor}
                  </span>
                  <span className="min-w-0 truncate text-slate-700">
                    {e.summary || '—'}
                  </span>
                  <span className="shrink-0 font-mono text-[11px] text-slate-400">
                    {formatDate(e.created_at)}
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 text-xs">
                    {e.ip && (
                      <div className="mb-1 text-slate-500">
                        <span className="font-semibold">IP:</span>{' '}
                        <span className="font-mono">{e.ip}</span>
                      </div>
                    )}
                    {e.target_type && (
                      <div className="mb-1 text-slate-500">
                        <span className="font-semibold">Target:</span>{' '}
                        <span className="font-mono">
                          {e.target_type}
                          {e.target_id ? ` / ${e.target_id}` : ''}
                        </span>
                      </div>
                    )}
                    {e.user_agent && (
                      <div className="mb-2 max-w-full truncate text-slate-400">
                        <span className="font-semibold">UA:</span>{' '}
                        <span className="font-mono text-[10px]">
                          {e.user_agent}
                        </span>
                      </div>
                    )}
                    {e.metadata && Object.keys(e.metadata).length > 0 && (
                      <pre className="mt-1 max-h-96 overflow-auto rounded-md bg-white p-3 font-mono text-[11px] leading-relaxed text-slate-700 ring-1 ring-slate-200">
                        {JSON.stringify(e.metadata, null, 2)}
                      </pre>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ============================================
// COMPANIES PANEL
// ============================================
const COMPANY_TYPE_LABEL: Record<string, string> = {
  client: 'კლიენტი',
  contractor: 'კონტრაქტორი',
  supplier: 'მომწოდებელი',
  other: 'სხვა'
};
const COMPANY_TYPE_COLOR: Record<string, string> = {
  client: 'bg-[#E6F2FB] text-[#0071CE]',
  contractor: 'bg-[#E0F7F3] text-[#008A73]',
  supplier: 'bg-[#FEF3C7] text-amber-700',
  other: 'bg-slate-100 text-slate-700'
};

function CompaniesPanel({
  rows,
  loading,
  reload,
  flash
}: {
  rows: Company[];
  loading: boolean;
  reload: () => void;
  flash: (m: string) => void;
}) {
  const [form, setForm] = useState({
    name: '',
    type: 'contractor' as Company['type'],
    contact_person: '',
    phone: '',
    email: '',
    address: '',
    tax_id: '',
    notes: ''
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setForm({
      name: '',
      type: 'contractor',
      contact_person: '',
      phone: '',
      email: '',
      address: '',
      tax_id: '',
      notes: ''
    });
    setEditingId(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const url = editingId
        ? `/api/tbc/companies/${editingId}`
        : '/api/tbc/companies';
      const method = editingId ? 'PATCH' : 'POST';
      const r = await fetch(url, {
        method,
        headers: {'content-type': 'application/json'},
        body: JSON.stringify(form)
      });
      if (!r.ok) {
        flash('ვერ შეინახა');
        return;
      }
      flash(editingId ? 'განახლდა' : 'დამატებულია');
      reset();
      reload();
    } finally {
      setBusy(false);
    }
  }

  function startEdit(c: Company) {
    setEditingId(c.id);
    setForm({
      name: c.name,
      type: c.type,
      contact_person: c.contact_person || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      tax_id: c.tax_id || '',
      notes: c.notes || ''
    });
    window.scrollTo({top: 0, behavior: 'smooth'});
  }

  async function del(c: Company) {
    if (!confirm(`წავშალო კომპანია "${c.name}"?`)) return;
    const r = await fetch(`/api/tbc/companies/${c.id}`, {method: 'DELETE'});
    if (!r.ok) flash('ვერ წაიშალა');
    else {
      flash('წაიშალა');
      reload();
    }
  }

  return (
    <div className="space-y-6">
      {/* form */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          {editingId ? 'კომპანიის რედაქტირება' : 'ახალი კომპანია'}
        </h2>
        <form onSubmit={submit} className="grid gap-3 sm:grid-cols-4">
          <input
            value={form.name}
            onChange={(e) => setForm({...form, name: e.target.value})}
            placeholder="კომპანიის სახელი *"
            required
            className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <select
            value={form.type}
            onChange={(e) =>
              setForm({...form, type: e.target.value as Company['type']})
            }
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
          >
            {Object.entries(COMPANY_TYPE_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <input
            value={form.tax_id}
            onChange={(e) => setForm({...form, tax_id: e.target.value})}
            placeholder="საიდ. ნომერი"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <input
            value={form.contact_person}
            onChange={(e) => setForm({...form, contact_person: e.target.value})}
            placeholder="კონტაქტი / სახელი"
            className="sm:col-span-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <input
            value={form.phone}
            onChange={(e) => setForm({...form, phone: e.target.value})}
            placeholder="ტელეფონი"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <input
            value={form.email}
            onChange={(e) => setForm({...form, email: e.target.value})}
            type="email"
            placeholder="ელფოსტა"
            className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <input
            value={form.address}
            onChange={(e) => setForm({...form, address: e.target.value})}
            placeholder="მისამართი"
            className="sm:col-span-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <textarea
            value={form.notes}
            onChange={(e) => setForm({...form, notes: e.target.value})}
            placeholder="შენიშვნები"
            rows={2}
            className="sm:col-span-4 rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm focus:border-[#0071CE] focus:bg-white focus:outline-none"
          />
          <div className="sm:col-span-4 flex gap-2">
            <button
              type="submit"
              disabled={busy}
              className="rounded-md bg-[#0071CE] px-4 py-2 text-sm font-semibold text-white hover:bg-[#005BA8] disabled:opacity-60"
            >
              {busy ? '…' : editingId ? '💾 შეინახე' : '+ დამატება'}
            </button>
            {editingId && (
              <button
                type="button"
                onClick={reset}
                className="rounded-md border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                გაუქმება
              </button>
            )}
          </div>
        </form>
      </div>

      {/* list */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            ყველა კომპანია
          </h2>
          <span className="font-mono text-xs text-slate-400">{rows.length}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">სახელი</th>
                <th className="px-4 py-2 text-left">ტიპი</th>
                <th className="px-4 py-2 text-left">კონტაქტი</th>
                <th className="px-4 py-2 text-left">ტელ.</th>
                <th className="px-4 py-2 text-left">ელფოსტა</th>
                <th className="px-4 py-2 text-right">მოქმედ.</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    იტვირთება…
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-slate-400"
                  >
                    ცარიელია
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-slate-100 hover:bg-slate-50"
                  >
                    <td className="px-4 py-2.5 font-semibold text-slate-900">
                      {c.name}
                      {c.tax_id && (
                        <div className="font-mono text-[10px] text-slate-400">
                          {c.tax_id}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${COMPANY_TYPE_COLOR[c.type]}`}
                      >
                        {COMPANY_TYPE_LABEL[c.type]}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">
                      {c.contact_person || '—'}
                    </td>
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-600">
                      {c.phone ? (
                        <a
                          href={`tel:${c.phone}`}
                          className="text-[#0071CE] hover:underline"
                        >
                          {c.phone}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs">
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="text-[#0071CE] hover:underline"
                        >
                          {c.email}
                        </a>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="inline-flex gap-1 text-xs">
                        <button
                          onClick={() => startEdit(c)}
                          className="rounded border border-slate-200 bg-white px-2 py-1 hover:bg-slate-50"
                        >
                          ✏️ რედ.
                        </button>
                        <button
                          onClick={() => del(c)}
                          className="rounded border border-red-200 bg-white px-2 py-1 text-red-600 hover:bg-red-50"
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ============================================
// TABLES (pivot reports) PANEL
// ============================================
function TablesPanel({
  data,
  loading,
  reload
}: {
  data: {
    categories: CategoryReport[];
    subtypes: SubtypeReport[];
    regions: RegionReport[];
    totals: {
      branches: number;
      planned: number;
      installed: number;
      unplanned: number;
    };
  } | null;
  loading: boolean;
  reload: () => void;
}) {
  if (loading || !data) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400 shadow-sm">
        იტვირთება…
      </div>
    );
  }
  const {categories, subtypes, regions, totals} = data;

  return (
    <div className="space-y-6">
      {/* Totals */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Tile label="ფილიალი" value={totals.branches} />
        <Tile label="დაგეგმილი" value={totals.planned} />
        <Tile
          label="დაყენებული"
          value={totals.installed}
          sub={
            totals.planned > 0
              ? `${Math.round((totals.installed / totals.planned) * 100)}%`
              : ''
          }
          accent
        />
        <Tile
          label="დაუგეგმავი"
          value={`+${totals.unplanned}`}
          warn
        />
      </div>

      {/* Categories */}
      <ReportTable
        title="კატეგორიის მიხედვით"
        headers={['კატეგორია', 'დაგეგმ.', 'დაყენებ.', '+?', '%']}
        onRefresh={reload}
      >
        {categories.map((c) => (
          <tr key={c.category} className="border-b border-slate-100">
            <td className="px-4 py-2 font-semibold text-slate-900">
              {c.category}
            </td>
            <td className="px-4 py-2 text-right font-mono">{c.planned}</td>
            <td className="px-4 py-2 text-right font-mono text-[#008A73]">
              {c.installed}
            </td>
            <td className="px-4 py-2 text-right font-mono text-amber-600">
              {c.unplanned ? `+${c.unplanned}` : ''}
            </td>
            <td className="px-4 py-2 text-right">
              <PctBar pct={c.pct} />
            </td>
          </tr>
        ))}
      </ReportTable>

      {/* Subtypes */}
      <ReportTable
        title="ქვეტიპის მიხედვით"
        headers={['კატეგორია', 'ქვეტიპი', 'დაგეგმ.', 'დაყენებ.', '%']}
      >
        {subtypes.map((s, i) => (
          <tr key={i} className="border-b border-slate-100">
            <td className="px-4 py-2 text-xs text-slate-500">{s.category}</td>
            <td className="px-4 py-2 font-medium text-slate-900">
              {s.subtype}
            </td>
            <td className="px-4 py-2 text-right font-mono">{s.planned}</td>
            <td className="px-4 py-2 text-right font-mono text-[#008A73]">
              {s.installed}
            </td>
            <td className="px-4 py-2 text-right">
              <PctBar pct={s.pct} />
            </td>
          </tr>
        ))}
      </ReportTable>

      {/* Regions */}
      <ReportTable
        title="რეგიონის მიხედვით"
        headers={['რეგიონი', 'ფილ.', 'დაგეგმ.', 'დაყენებ.', '+?', '%']}
      >
        {regions.map((r) => (
          <tr key={r.region} className="border-b border-slate-100">
            <td className="px-4 py-2 font-semibold text-slate-900">
              {r.region}
            </td>
            <td className="px-4 py-2 text-right font-mono">{r.branches}</td>
            <td className="px-4 py-2 text-right font-mono">{r.planned}</td>
            <td className="px-4 py-2 text-right font-mono text-[#008A73]">
              {r.installed}
            </td>
            <td className="px-4 py-2 text-right font-mono text-amber-600">
              {r.unplanned ? `+${r.unplanned}` : ''}
            </td>
            <td className="px-4 py-2 text-right">
              <PctBar pct={r.pct} />
            </td>
          </tr>
        ))}
      </ReportTable>
    </div>
  );
}

function Tile({
  label,
  value,
  sub,
  accent,
  warn
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
  warn?: boolean;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </div>
      <div
        className={`font-mono text-2xl font-bold ${accent ? 'text-[#008A73]' : warn ? 'text-amber-600' : 'text-slate-900'}`}
      >
        {value}
      </div>
      {sub && <div className="font-mono text-xs text-slate-400">{sub}</div>}
    </div>
  );
}

function ReportTable({
  title,
  headers,
  children,
  onRefresh
}: {
  title: string;
  headers: string[];
  children: React.ReactNode;
  onRefresh?: () => void;
}) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {title}
        </h2>
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="rounded-md border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            🔄 განახლება
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  className={`px-4 py-2 ${i >= 2 ? 'text-right' : 'text-left'}`}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function PctBar({pct}: {pct: number}) {
  const clamped = Math.max(0, Math.min(100, pct));
  const color =
    clamped >= 90
      ? '#00AA8D'
      : clamped >= 50
        ? '#0071CE'
        : clamped >= 25
          ? '#F59E0B'
          : '#EC4899';
  return (
    <div className="inline-flex min-w-[100px] items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full"
          style={{width: clamped + '%', background: color}}
        />
      </div>
      <span className="font-mono text-xs font-semibold text-slate-700">
        {pct}%
      </span>
    </div>
  );
}
