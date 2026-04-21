'use client';

import Link from 'next/link';
import {useEffect, useMemo, useState} from 'react';
import {
  Coins,
  Users,
  Send,
  CheckCircle2,
  UserPlus,
  Search,
  Trash2,
  Phone,
  Mail,
  Linkedin,
  Facebook,
  Tag as TagIcon,
  X,
  MessageCircle,
  ShieldAlert
} from 'lucide-react';
import {
  CATEGORY_LABELS,
  HASHTAG_SUGGESTIONS,
  REWARD_CAP_GEL,
  REWARD_PER_CONTACT_GEL,
  buildWhatsAppLink,
  computeStats,
  loadContacts,
  maskPhone,
  newContactId,
  saveContacts,
  type ReferralCategory,
  type ReferralContact,
  type ReferralStatus
} from '@/lib/referrals';
import {getStoredUser} from '@/lib/user-session';
import {MyLinkPanel} from '@/components/referrals/my-link-panel';

const STATUS_LABELS: Record<ReferralStatus, string> = {
  draft: 'დამატებული',
  sent: 'მოწვეული',
  registered: 'რეგისტრირებული',
  rewarded: 'გადახდილი'
};

const STATUS_STYLES: Record<ReferralStatus, string> = {
  draft: 'border-bdr bg-sur-2 text-text-2',
  sent: 'border-blue-bd bg-blue-lt text-blue',
  registered: 'border-grn-bd bg-grn-lt text-grn',
  rewarded: 'border-ora-bd bg-ora-lt text-ora'
};

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  category: 'electrical' as ReferralCategory,
  tags: [] as string[],
  phone: '',
  phoneDisposable: true,
  email: '',
  linkedinUrl: '',
  facebookUrl: ''
};

const CONSENT_KEY = 'eng_referral_consent_v1';

export function ReferralsWorkspace() {
  const [contacts, setContacts] = useState<ReferralContact[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [q, setQ] = useState('');
  const [filterStatus, setFilterStatus] = useState<ReferralStatus | 'all'>('all');
  const [filterCategory, setFilterCategory] = useState<ReferralCategory | 'all'>('all');
  const [rowsPerPage, setRowsPerPage] = useState<50 | 100 | 200>(50);
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(EMPTY_FORM);
  const [tagInput, setTagInput] = useState('');
  const [refCode, setRefCode] = useState('anon');
  const [consentGiven, setConsentGiven] = useState<boolean>(true);

  useEffect(() => {
    setContacts(loadContacts());
    try {
      const u = getStoredUser();
      if (u?.email) {
        setRefCode(u.email.replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'anon');
      }
      const c = localStorage.getItem(CONSENT_KEY);
      setConsentGiven(c === '1');
    } catch {}
    setHydrated(true);
  }, []);

  function acceptConsent() {
    try {
      localStorage.setItem(CONSENT_KEY, '1');
    } catch {}
    setConsentGiven(true);
  }

  useEffect(() => {
    if (hydrated) saveContacts(contacts);
  }, [contacts, hydrated]);

  const stats = useMemo(() => computeStats(contacts), [contacts]);
  const capReached = stats.reward >= REWARD_CAP_GEL;

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return contacts.filter((c) => {
      if (filterStatus !== 'all' && c.status !== filterStatus) return false;
      if (filterCategory !== 'all' && c.category !== filterCategory) return false;
      if (!query) return true;
      const hay = [
        c.firstName,
        c.lastName,
        c.email,
        c.phone,
        c.tags.join(' '),
        CATEGORY_LABELS[c.category]
      ]
        .join(' ')
        .toLowerCase();
      return hay.includes(query);
    });
  }, [contacts, q, filterStatus, filterCategory]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const pageSafe = Math.min(page, totalPages);
  const pageStart = filtered.length === 0 ? 0 : (pageSafe - 1) * rowsPerPage;
  const pageEnd = filtered.length === 0 ? 0 : Math.min(filtered.length, pageStart + rowsPerPage);
  const paged = filtered.slice(pageStart, pageEnd);

  useEffect(() => {
    setPage(1);
  }, [q, filterStatus, filterCategory, rowsPerPage]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const canSubmit =
    form.firstName.trim().length >= 2 &&
    form.lastName.trim().length >= 2 &&
    (/^\+?\d{8,}$/.test(form.phone.replace(/\s/g, '')) ||
      /^\S+@\S+\.\S+$/.test(form.email));

  function addContact() {
    if (!canSubmit) return;
    const next: ReferralContact = {
      id: newContactId(),
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      category: form.category,
      tags: [...form.tags],
      phone: form.phone.trim(),
      phoneDisposable: form.phoneDisposable,
      email: form.email.trim(),
      linkedinUrl: form.linkedinUrl.trim(),
      facebookUrl: form.facebookUrl.trim(),
      status: 'draft',
      createdAt: Date.now(),
      sentAt: null,
      registeredAt: null
    };
    setContacts((prev) => [next, ...prev]);
    setForm(EMPTY_FORM);
    setTagInput('');
  }

  function addTag(raw: string) {
    const tag = raw.trim().replace(/^#/, '').toLowerCase();
    if (!tag) return;
    if (form.tags.includes(tag)) return;
    setForm({...form, tags: [...form.tags, tag]});
    setTagInput('');
  }

  function removeTag(t: string) {
    setForm({...form, tags: form.tags.filter((x) => x !== t)});
  }

  function sendWhatsApp(c: ReferralContact) {
    if (!c.phone) {
      alert('ტელეფონის ნომერი არ არის მოცემული — WhatsApp ვერ გაიგზავნება.');
      return;
    }
    const link = buildWhatsAppLink(c, refCode);
    window.open(link, '_blank', 'noopener');
    setContacts((prev) =>
      prev.map((x) =>
        x.id === c.id
          ? {
              ...x,
              status: x.status === 'draft' ? 'sent' : x.status,
              sentAt: Date.now(),
              phone: x.phoneDisposable ? '' : x.phone
            }
          : x
      )
    );
  }

  function deleteContact(id: string) {
    if (!confirm('ნამდვილად წაშლი ამ კონტაქტს?')) return;
    setContacts((prev) => prev.filter((x) => x.id !== id));
  }

  function markRegistered(id: string) {
    setContacts((prev) =>
      prev.map((x) =>
        x.id === id
          ? {...x, status: 'registered', registeredAt: Date.now()}
          : x
      )
    );
  }

  return (
    <div className="space-y-6">
      {hydrated && !consentGiven && <ConsentGate onAccept={acceptConsent} />}

      <header>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
          <Coins size={12} /> REFERRAL · აქცია
        </span>
        <h1 className="mt-3 text-[24px] font-bold text-navy md:text-[28px]">
          მოიწვიე ინჟინრები, იშოვე 3000 ლარამდე
        </h1>
        <p className="mt-1.5 max-w-[720px] text-[13px] leading-relaxed text-text-2">
          ამატებ კონტაქტებს → გეგზავნება WhatsApp მოწვევა → დარეგისტრირებაზე
          გეძლევა {REWARD_PER_CONTACT_GEL} ლარი/კონტაქტი (მაქს {REWARD_CAP_GEL} ₾).
          ტელეფონი default-ად ერთჯერადია (გაგზავნის შემდეგ იშლება).
        </p>
      </header>

      <MyLinkPanel />

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi icon={<Users size={14} />} label="სულ კონტაქტი" value={stats.total} />
        <Kpi icon={<Send size={14} />} label="გაგზავნილი მოწვევა" value={stats.sent} />
        <Kpi
          icon={<CheckCircle2 size={14} />}
          label="რეგისტრირებული"
          value={stats.registered}
          accent="grn"
        />
        <Kpi
          icon={<Coins size={14} />}
          label="დასარიცხი (₾)"
          value={`${stats.reward}`}
          hint={capReached ? `cap მიღწეული ${REWARD_CAP_GEL}₾` : `მაქს ${REWARD_CAP_GEL}₾`}
          accent="ora"
        />
      </section>

      <section className="rounded-[var(--radius-card)] border border-bdr bg-sur">
        <div className="flex items-center gap-2 border-b border-bdr px-4 py-3">
          <UserPlus size={15} className="text-blue" />
          <h2 className="text-[14px] font-bold text-navy">ახალი კონტაქტი</h2>
        </div>

        <div className="grid gap-3 px-4 py-4 md:grid-cols-2 lg:grid-cols-3">
          <Field label="სახელი *">
            <input
              className="inp"
              value={form.firstName}
              onChange={(e) => setForm({...form, firstName: e.target.value})}
              placeholder="გიორგი"
            />
          </Field>
          <Field label="გვარი *">
            <input
              className="inp"
              value={form.lastName}
              onChange={(e) => setForm({...form, lastName: e.target.value})}
              placeholder="მერებაშვილი"
            />
          </Field>

          <Field label="კატეგორია">
            <select
              className="inp"
              value={form.category}
              onChange={(e) =>
                setForm({...form, category: e.target.value as ReferralCategory})
              }
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>

          <Field label="ტელეფონი (WhatsApp)">
            <input
              className="inp font-mono"
              value={form.phone}
              onChange={(e) => setForm({...form, phone: e.target.value})}
              placeholder="+995 555 12 34 56"
              inputMode="tel"
            />
          </Field>

          <Field label="Email">
            <input
              className="inp font-mono"
              value={form.email}
              onChange={(e) => setForm({...form, email: e.target.value})}
              placeholder="user@example.com"
              type="email"
            />
          </Field>

          <Field label="LinkedIn URL (არასავალდებულო)">
            <input
              className="inp"
              value={form.linkedinUrl}
              onChange={(e) => setForm({...form, linkedinUrl: e.target.value})}
              placeholder="https://linkedin.com/in/..."
            />
          </Field>

          <Field label="Facebook URL (არასავალდებულო)">
            <input
              className="inp"
              value={form.facebookUrl}
              onChange={(e) => setForm({...form, facebookUrl: e.target.value})}
              placeholder="https://facebook.com/..."
            />
          </Field>

          <Field label="Hashtag-ები" className="md:col-span-2">
            <div className="flex flex-wrap items-center gap-1.5 rounded-[5px] border border-bdr bg-sur px-2 py-1.5">
              {form.tags.map((t) => (
                <span
                  key={t}
                  className="inline-flex items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-2 py-0.5 font-mono text-[10px] font-semibold text-blue"
                >
                  #{t}
                  <button
                    type="button"
                    onClick={() => removeTag(t)}
                    className="text-blue/70 hover:text-navy"
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              <input
                list="hashtag-suggestions"
                className="min-w-[120px] flex-1 bg-transparent text-[12px] outline-none"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                placeholder={form.tags.length ? 'კიდევ…' : '#ventilation, #bim…'}
              />
              <datalist id="hashtag-suggestions">
                {HASHTAG_SUGGESTIONS.map((h) => (
                  <option key={h} value={h} />
                ))}
              </datalist>
            </div>
          </Field>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bdr bg-sur-2 px-4 py-3">
          <label className="inline-flex items-center gap-2 text-[12px] text-text-2">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue"
              checked={form.phoneDisposable}
              onChange={(e) =>
                setForm({...form, phoneDisposable: e.target.checked})
              }
            />
            ტელეფონი <strong>ერთჯერადი</strong> — გაგზავნის შემდეგ იშლება
            <span className="group relative inline-flex cursor-help">
              <ShieldAlert size={12} className="text-text-3" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-md bg-navy px-2 py-1 text-[11px] text-white group-hover:inline-block">
                მიყოლის გათიშვით ძალაში შედის მონაცემთა პოლიტიკა
              </span>
            </span>
          </label>
          <button
            type="button"
            onClick={addContact}
            disabled={!canSubmit}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <UserPlus size={14} /> დამატება
          </button>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-bdr bg-sur">
        <div className="flex flex-wrap items-center gap-2 border-b border-bdr px-4 py-3">
          <div className="flex h-9 min-w-[200px] flex-1 items-center gap-1.5 rounded-md border border-bdr bg-sur px-2.5">
            <Search size={14} className="text-text-3" />
            <input
              className="flex-1 bg-transparent text-[13px] outline-none"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="ძიება სახელი / email / tag…"
            />
          </div>
          <select
            className="h-9 rounded-md border border-bdr bg-sur px-2.5 text-[12.5px]"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ReferralStatus | 'all')}
          >
            <option value="all">ყველა სტატუსი</option>
            {(['draft', 'sent', 'registered', 'rewarded'] as ReferralStatus[]).map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <select
            className="h-9 rounded-md border border-bdr bg-sur px-2.5 text-[12.5px]"
            value={filterCategory}
            onChange={(e) =>
              setFilterCategory(e.target.value as ReferralCategory | 'all')
            }
          >
            <option value="all">ყველა კატეგორია</option>
            {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <span className="font-mono text-[11px] text-text-3">
            {filtered.length} / {contacts.length}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12.5px]">
            <thead className="bg-sur-2 text-[10px] font-semibold uppercase tracking-wider text-text-3">
              <tr>
                <Th>სახელი / გვარი</Th>
                <Th>კატეგორია</Th>
                <Th>Tags</Th>
                <Th>ტელ.</Th>
                <Th>Email</Th>
                <Th>Social</Th>
                <Th>სტატუსი</Th>
                <Th className="text-right">მოქმედება</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10">
                    <div className="flex flex-col items-center gap-2 text-center">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-dashed border-bdr bg-sur-2 text-text-3">
                        <TagIcon size={16} />
                      </span>
                      <div className="text-[12px] font-semibold text-text-2">
                        {contacts.length === 0 ? 'კონტაქტები ცარიელია' : 'ფილტრს არ შეესაბამება'}
                      </div>
                      <div className="text-[11px] text-text-3">
                        {contacts.length === 0
                          ? 'ზემოთ შეავსე ფორმა და პირველ კონტაქტს დაამატებ'
                          : 'სცადე სხვა ფილტრი ან search query'}
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                paged.map((c) => (
                  <tr key={c.id} className="border-t border-bdr hover:bg-sur-2/60">
                    <Td>
                      <div className="font-semibold text-navy">
                        {c.firstName} {c.lastName}
                      </div>
                      <div className="font-mono text-[10px] text-text-3">
                        {new Date(c.createdAt).toLocaleDateString('ka-GE')}
                      </div>
                    </Td>
                    <Td className="text-text-2">{CATEGORY_LABELS[c.category]}</Td>
                    <Td>
                      <div className="flex flex-wrap gap-1">
                        {c.tags.length === 0 ? (
                          <span className="text-text-3">—</span>
                        ) : (
                          c.tags.slice(0, 4).map((t) => (
                            <span
                              key={t}
                              className="inline-flex items-center gap-0.5 rounded-full border border-bdr bg-sur-2 px-1.5 py-[1px] font-mono text-[9px] text-text-2"
                            >
                              <TagIcon size={8} />
                              {t}
                            </span>
                          ))
                        )}
                        {c.tags.length > 4 && (
                          <span className="font-mono text-[9px] text-text-3">+{c.tags.length - 4}</span>
                        )}
                      </div>
                    </Td>
                    <Td className="font-mono text-[11px] text-text-2">
                      {c.phone ? (
                        c.phone
                      ) : c.phoneDisposable && c.sentAt ? (
                        <span className="text-text-3" title="ერთჯერადი — წაშლილია">
                          {maskPhone('+995000')}
                        </span>
                      ) : (
                        <span className="text-text-3">—</span>
                      )}
                    </Td>
                    <Td>
                      {c.email ? (
                        <a
                          href={`mailto:${c.email}`}
                          className="font-mono text-[11px] text-blue hover:underline"
                        >
                          {c.email}
                        </a>
                      ) : (
                        <span className="text-text-3">—</span>
                      )}
                    </Td>
                    <Td>
                      <div className="flex items-center gap-1.5">
                        {c.linkedinUrl ? (
                          <a
                            href={c.linkedinUrl}
                            target="_blank"
                            rel="noopener"
                            className="text-text-3 hover:text-blue"
                            title="LinkedIn"
                          >
                            <Linkedin size={14} />
                          </a>
                        ) : null}
                        {c.facebookUrl ? (
                          <a
                            href={c.facebookUrl}
                            target="_blank"
                            rel="noopener"
                            className="text-text-3 hover:text-blue"
                            title="Facebook"
                          >
                            <Facebook size={14} />
                          </a>
                        ) : null}
                        {!c.linkedinUrl && !c.facebookUrl && (
                          <span className="text-text-3">—</span>
                        )}
                      </div>
                    </Td>
                    <Td>
                      <span
                        className={`inline-flex items-center rounded-full border px-2 py-[1px] font-mono text-[9px] font-semibold uppercase tracking-wider ${STATUS_STYLES[c.status]}`}
                      >
                        {STATUS_LABELS[c.status]}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => sendWhatsApp(c)}
                          disabled={!c.phone}
                          className="inline-flex h-7 items-center gap-1 rounded-md border border-grn-bd bg-grn-lt px-2 text-[11px] font-semibold text-grn transition-colors hover:bg-grn hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                          title="WhatsApp-ზე გაგზავნა"
                        >
                          <MessageCircle size={12} />
                          WhatsApp
                        </button>
                        {c.status !== 'registered' && c.status !== 'rewarded' && (
                          <button
                            type="button"
                            onClick={() => markRegistered(c.id)}
                            className="inline-flex h-7 items-center gap-1 rounded-md border border-bdr bg-sur-2 px-2 text-[11px] text-text-2 hover:border-blue hover:text-blue"
                            title="manual: მონიშნე რეგისტრირებულად"
                          >
                            <CheckCircle2 size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteContact(c.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-bdr bg-sur text-text-3 hover:border-red-bd hover:text-red"
                          title="წაშლა"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </Td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-bdr bg-sur-2 px-4 py-3">
          <div className="flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-2 text-[12px] text-text-2">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3">
                გვერდზე
              </span>
              <select
                className="h-8 rounded-md border border-bdr bg-sur px-2 text-[12px]"
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value) as 50 | 100 | 200)}
              >
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={200}>200</option>
              </select>
            </label>
            <span className="text-[11px] text-text-3">
              {filtered.length === 0
                ? '0 შედეგი'
                : `${pageStart + 1}-${pageEnd} / ${filtered.length}`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={pageSafe <= 1}
              className="inline-flex h-8 items-center rounded-md border border-bdr bg-sur px-2.5 text-[12px] text-text-2 transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← წინა
            </button>
            <span className="min-w-[72px] text-center font-mono text-[11px] text-text-2">
              {pageSafe} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={pageSafe >= totalPages}
              className="inline-flex h-8 items-center rounded-md border border-bdr bg-sur px-2.5 text-[12px] text-text-2 transition-colors hover:border-blue hover:text-blue disabled:cursor-not-allowed disabled:opacity-50"
            >
              შემდეგი →
            </button>
          </div>
        </div>
      </section>

      <section className="rounded-[var(--radius-card)] border border-bdr bg-sur-2 p-4 md:p-5">
        <h3 className="text-[13px] font-bold text-navy">როგორ ფიქსირდება რეგისტრაცია</h3>
        <p className="mt-1 text-[12.5px] leading-relaxed text-text-2">
          როცა შენს მიერ მოწვეული კონტაქტი გაივლის რეგისტრაციას engineers.ge-ზე, სისტემა
          ჯვარედინად შეადარებს მის ემაილს/ტელეფონს შენს referral ბაზას და ავტომატურად
          გამწვანდება status. manual override ღილაკი{' '}
          <span className="inline-flex h-5 items-center gap-1 rounded border border-bdr bg-sur px-1.5 align-middle font-mono text-[10px]">
            <CheckCircle2 size={10} />
          </span>{' '}
          დროებითია — Supabase-ის ბაზასთან ჯვარედინი შემოწმება შემდეგ ნაბიჯად.
        </p>
      </section>

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          height: 36px;
          border-radius: 5px;
          border: 1.5px solid var(--bdr);
          background: var(--sur);
          padding: 0 10px;
          font-size: 13px;
          color: var(--text);
          outline: none;
          transition: border-color 0.15s, box-shadow 0.15s;
        }
        :global(.inp:focus) {
          border-color: var(--blue);
          box-shadow: 0 0 0 2px color-mix(in srgb, var(--blue) 15%, transparent);
        }
      `}</style>
    </div>
  );
}

function Kpi({
  icon,
  label,
  value,
  hint,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  hint?: string;
  accent?: 'grn' | 'ora';
}) {
  const tint =
    accent === 'grn'
      ? 'text-grn'
      : accent === 'ora'
      ? 'text-ora'
      : 'text-navy';
  return (
    <div className="rounded-[var(--radius-card)] border border-bdr bg-sur p-3.5">
      <div className="flex items-center gap-1.5 font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
        <span className="text-text-2">{icon}</span>
        {label}
      </div>
      <div className={`mt-1.5 font-mono text-[20px] font-bold ${tint}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[10px] text-text-3">{hint}</div>}
    </div>
  );
}

function Field({
  label,
  children,
  className
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className ?? ''}`}>
      <span className="mb-1 block font-mono text-[10px] font-semibold uppercase tracking-[0.06em] text-text-3">
        {label}
      </span>
      {children}
    </label>
  );
}

function Th({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <th className={`whitespace-nowrap px-3 py-2 text-left ${className}`}>
      {children}
    </th>
  );
}

function Td({
  children,
  className = ''
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={`px-3 py-2 align-top ${className}`}>{children}</td>;
}

function ConsentGate({onAccept}: {onAccept: () => void}) {
  const [checked, setChecked] = useState(false);
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center bg-navy/40 backdrop-blur-sm p-4"
    >
      <div className="w-full max-w-[560px] rounded-[var(--radius-card)] border border-bdr bg-sur p-6 shadow-[var(--shadow-modal)] md:p-7">
        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
          <ShieldAlert size={12} /> პერსონალური მონაცემები
        </div>
        <h2 className="mt-3 text-[18px] font-bold text-navy md:text-[20px]">
          მესამე პირების კონტაქტები — თანხმობა
        </h2>
        <div className="mt-3 space-y-2 text-[13px] leading-relaxed text-text-2">
          <p>
            სანამ ამატებ კოლეგის ან ნაცნობის კონტაქტს, გთხოვთ დაადასტუროთ:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>
              გაქვს კონტაქტის <strong>პირადი თანხმობა</strong> engineers.ge-ზე
              მოწვევის გაგზავნაზე.
            </li>
            <li>
              კონტაქტი მოგცა შესაბამისი მონაცემები (სახელი, ელფოსტა, ტელეფონი)
              ნებაყოფლობით — არ აიღე მესამე წყაროდან.
            </li>
            <li>
              ტელეფონი default-ად <strong>ერთჯერადი</strong>ა — WhatsApp-ის
              ბმულის გაგზავნის შემდეგ ბაზიდან იშლება. თუ მოხსნი მონიშვნას,
              ხელშეკრულების ძალაში შედის{' '}
              <a
                href="/privacy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue underline-offset-2 hover:underline"
              >
                პერსონალური მონაცემების პოლიტიკა
              </a>
              .
            </li>
          </ul>
        </div>

        <label className="mt-5 flex items-start gap-2 text-[12.5px] text-text-2">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-blue"
            checked={checked}
            onChange={(e) => setChecked(e.target.checked)}
          />
          <span>
            ვადასტურებ, რომ კონტაქტის დამატებისას ვიყავი ინფორმირებული და მაქვს
            კონტაქტების მფლობელთა თანხმობა.
          </span>
        </label>

        <div className="mt-5 flex items-center justify-end gap-2">
          <Link
            href="/dashboard"
            className="inline-flex h-9 items-center rounded-md border bg-sur px-3 text-[12.5px] font-semibold text-text-2 hover:bg-sur-2"
          >
            უარი
          </Link>
          <button
            type="button"
            onClick={onAccept}
            disabled={!checked}
            className="inline-flex h-9 items-center gap-1.5 rounded-md bg-blue px-4 text-[12.5px] font-semibold text-white transition-colors hover:bg-navy-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CheckCircle2 size={14} /> ვიწყებ მოწვევას
          </button>
        </div>
      </div>
    </div>
  );
}
