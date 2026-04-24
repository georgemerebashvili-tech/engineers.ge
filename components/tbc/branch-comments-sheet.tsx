'use client';

import {useCallback, useEffect, useState} from 'react';

export type CommentKind = 'note' | 'blocker' | 'info' | 'done';

type Comment = {
  id: number;
  branch_id: number;
  author: string;
  kind: CommentKind;
  body: string;
  created_at: string;
};

const KIND_META: Record<
  CommentKind,
  {emoji: string; label: string; bg: string; text: string}
> = {
  note: {emoji: '📝', label: 'შენიშვნა', bg: 'bg-slate-100', text: 'text-slate-700'},
  blocker: {emoji: '⛔', label: 'პრობლემა', bg: 'bg-red-50', text: 'text-red-700'},
  info: {emoji: 'ℹ️', label: 'ინფო', bg: 'bg-blue-50', text: 'text-blue-700'},
  done: {emoji: '✅', label: 'დასრულდა', bg: 'bg-emerald-50', text: 'text-emerald-700'}
};

function fmtRel(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const diffMin = Math.floor((Date.now() - d.getTime()) / 60000);
  if (diffMin < 1) return 'ახლახან';
  if (diffMin < 60) return `${diffMin} წთ`;
  if (diffMin < 1440) return `${Math.floor(diffMin / 60)} სთ`;
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}.${mm}`;
}

export function BranchCommentsSheet({
  branchId,
  open,
  onClose,
  currentUser,
  isAdmin,
  legacyNote,
  onCountChange
}: {
  branchId: number | null;
  open: boolean;
  onClose: () => void;
  currentUser: string;
  isAdmin: boolean;
  legacyNote?: string | null;
  onCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [draft, setDraft] = useState('');
  const [kind, setKind] = useState<CommentKind>('note');
  const [posting, setPosting] = useState(false);

  const reload = useCallback(async () => {
    if (!branchId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/tbc/branches/${branchId}/comments`);
      if (r.ok) {
        const body = (await r.json()) as {comments?: Comment[]};
        const list = body.comments || [];
        setComments(list);
        onCountChange?.(list.length);
      }
    } finally {
      setLoading(false);
    }
  }, [branchId, onCountChange]);

  useEffect(() => {
    if (open && branchId) reload();
  }, [open, branchId, reload]);

  async function post() {
    const body = draft.trim();
    if (!body || posting || !branchId) return;
    setPosting(true);
    try {
      const r = await fetch(`/api/tbc/branches/${branchId}/comments`, {
        method: 'POST',
        headers: {'content-type': 'application/json'},
        body: JSON.stringify({kind, body})
      });
      if (r.ok) {
        setDraft('');
        await reload();
      }
    } finally {
      setPosting(false);
    }
  }

  async function remove(id: number) {
    if (!branchId) return;
    if (!confirm('წაშალე ეს შენიშვნა?')) return;
    const r = await fetch(`/api/tbc/branches/${branchId}/comments/${id}`, {
      method: 'DELETE'
    });
    if (r.ok) reload();
  }

  if (!open) return null;
  const legacy = (legacyNote || '').trim();

  return (
    <div
      className="fixed inset-0 z-40 flex items-end justify-center bg-slate-900/60 backdrop-blur-sm sm:items-center"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-[540px] flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-3 py-2">
          <span className="text-sm font-bold text-slate-900">
            📝 შენიშვნები {comments.length > 0 && (
              <span className="ml-1 font-mono text-[11px] text-slate-400">({comments.length})</span>
            )}
          </span>
          <button
            onClick={onClose}
            className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700"
          >
            დახურვა
          </button>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 px-3 py-3">
          {legacy && (
            <div className="mb-2 rounded-xl border border-amber-200 bg-amber-50 p-3">
              <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-amber-800">
                📌 არქივირებული შენიშვნა
              </div>
              <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                {legacy}
              </div>
            </div>
          )}
          {loading ? (
            <div className="mt-6 text-center text-xs text-slate-400">იტვირთება…</div>
          ) : comments.length === 0 ? (
            <div className="mt-6 text-center text-xs text-slate-400">
              ცარიელია — დაწერე პირველი შენიშვნა ქვემოთ
            </div>
          ) : (
            <ul className="space-y-2">
              {comments.map((c) => {
                const meta = KIND_META[c.kind] || KIND_META.note;
                const canDel = isAdmin || c.author === currentUser;
                return (
                  <li
                    key={c.id}
                    className="rounded-xl bg-white p-2.5 shadow-sm ring-1 ring-slate-200"
                  >
                    <div className="mb-1 flex items-center gap-2 text-[11px]">
                      <span
                        className={`rounded px-2 py-0.5 font-semibold ${meta.bg} ${meta.text}`}
                      >
                        {meta.emoji} {meta.label}
                      </span>
                      <span className="font-semibold text-slate-900">{c.author}</span>
                      <span className="ml-auto font-mono text-[10px] text-slate-400">
                        {fmtRel(c.created_at)}
                      </span>
                      {canDel && (
                        <button
                          onClick={() => remove(c.id)}
                          title="წაშლა"
                          className="text-slate-400 active:text-red-500"
                        >
                          🗃
                        </button>
                      )}
                    </div>
                    <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-800">
                      {c.body}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white p-3">
          <div className="mb-2 flex flex-wrap gap-1.5 text-[11px]">
            {(Object.keys(KIND_META) as CommentKind[]).map((k) => {
              const m = KIND_META[k];
              const active = kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setKind(k)}
                  className={`rounded-full border px-2.5 py-1 font-semibold transition ${
                    active
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {m.emoji} {m.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-end gap-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={2}
              placeholder="დაამატე შენიშვნები ამ ობიექტის შესახებ..."
              className="flex-1 resize-none rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-[#0071CE] focus:bg-white focus:outline-none"
            />
            <button
              onClick={post}
              disabled={!draft.trim() || posting || !branchId}
              className="rounded-xl bg-[#00AA8D] px-4 py-3 text-sm font-bold text-white shadow disabled:opacity-40 active:scale-95"
            >
              {posting ? '…' : 'გაგზავნა'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
