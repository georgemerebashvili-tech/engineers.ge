'use client';
import {useEffect, useRef, useState, useCallback} from 'react';
import {Tag, Trash2, Plus, Download, RefreshCw, Crosshair, X} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────
type MarkRel = 'OR' | 'AND';
type Mark    = {selector: string; tagName: string; text: string; path: string; rel: MarkRel};
type Task    = {id: string; label: string; marks: Mark[]; what: string; relatedTags: string[]; note: string};
type SiteTag = {id: string; page_path: string; selector: string; element_type: string|null; element_text: string|null; tag_name: string; note: string|null};
type HoverInfo = {selector: string; tagName: string; text: string; path: string};

const TASKS_KEY = 'tagconsole:tasks';
const PANEL_KEY = 'tagconsole:panelH';
const loadLocal  = (): Task[] => { try { return JSON.parse(localStorage.getItem(TASKS_KEY) ?? '[]'); } catch { return []; } };
const saveLocal  = (t: Task[]) => localStorage.setItem(TASKS_KEY, JSON.stringify(t));

// ─────────────────────────────────────────────────────────
export default function TagConsolePage() {
  const iframeRef  = useRef<HTMLIFrameElement>(null);

  // drag
  const dragging    = useRef(false);
  const dragOrigin  = useRef({y: 0, h: 0});
  const [panelH,     setPanelH]     = useState(260);
  const [isDragging, setIsDragging] = useState(false);

  // capture — stored in ref so effects never go stale
  const captureRef = useRef<{taskId: string|null; rel: MarkRel}>({taskId: null, rel: 'OR'});
  const [captureTaskId, setCaptureTaskId] = useState<string|null>(null);
  const [captureRel,    setCaptureRel]    = useState<MarkRel>('OR');

  // data
  const [tasks,  setTasks]  = useState<Task[]>([]);
  const [tags,   setTags]   = useState<SiteTag[]>([]);
  const [saving, setSaving] = useState(false);

  // inspector
  const [iframePath,  setIframePath]  = useState('/');
  const [navInput,    setNavInput]    = useState('/');
  const [currentPath, setCurrentPath] = useState('/');
  const [hover,       setHover]       = useState<HoverInfo|null>(null);

  // ── init ─────────────────────────────────────────────────
  useEffect(() => {
    const h = localStorage.getItem(PANEL_KEY);
    if (h) setPanelH(Number(h));
    setTasks(loadLocal());
  }, []);

  useEffect(() => { localStorage.setItem(PANEL_KEY, String(panelH)); }, [panelH]);

  // ── DB tags ──────────────────────────────────────────────
  const loadTags = useCallback(async () => {
    const res = await fetch('/api/admin/tag-console');
    if (res.ok) setTags(await res.json());
  }, []);
  useEffect(() => { loadTags(); }, [loadTags]);

  // ── iframe message handler (stable — uses refs) ──────────
  useEffect(() => {
    function onMsg(e: MessageEvent) {
      const d = e.data;
      if (!d?.type) return;
      if (d.type === 'TAGCONS_HOVER')    { setHover(d); }
      if (d.type === 'TAGCONS_NAVIGATE') { setCurrentPath(d.path); setNavInput(d.path); }
      if (d.type === 'TAGCONS_CLICK') {
        const {taskId, rel} = captureRef.current;
        if (!taskId) return;
        const mark: Mark = {selector: d.selector, tagName: d.tagName, text: d.text, path: d.path, rel};
        setTasks(prev => {
          const next = prev.map(t => t.id === taskId ? {...t, marks: [...t.marks, mark]} : t);
          saveLocal(next);
          return next;
        });
      }
    }
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
  }, []); // empty — uses captureRef, not state

  // ── Shift+D shortcut (stable) ────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!e.shiftKey || e.key !== 'D') return;
      e.preventDefault();
      if (captureRef.current.taskId) {
        stopCapture();
      } else {
        setTasks(prev => {
          if (prev.length > 0) {
            const last = prev[prev.length - 1];
            // call after this sync — avoids calling inside updater
            setTimeout(() => startCapture(last.id, 'OR'), 0);
          }
          return prev;
        });
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []); // stable — uses captureRef

  // ── capture helpers ──────────────────────────────────────
  function startCapture(taskId: string, rel: MarkRel) {
    captureRef.current = {taskId, rel};
    setCaptureTaskId(taskId);
    setCaptureRel(rel);
    iframeRef.current?.contentWindow?.postMessage({type: 'TAGCONS_SET_MODE', tagMode: true}, '*');
  }

  function stopCapture() {
    captureRef.current = {taskId: null, rel: 'OR'};
    setCaptureTaskId(null);
    setCaptureRel('OR');
    iframeRef.current?.contentWindow?.postMessage({type: 'TAGCONS_SET_MODE', tagMode: false}, '*');
  }

  // ── drag ─────────────────────────────────────────────────
  function onDragStart(e: React.MouseEvent) {
    e.preventDefault();
    dragging.current   = true;
    dragOrigin.current = {y: e.clientY, h: panelH};
    setIsDragging(true);
  }
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      const delta = dragOrigin.current.y - e.clientY;
      setPanelH(Math.max(44, Math.min(window.innerHeight * 0.85, dragOrigin.current.h + delta)));
    };
    const onUp = () => { dragging.current = false; setIsDragging(false); };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, []);

  // ── nav ──────────────────────────────────────────────────
  function navigate(p?: string) {
    const raw  = p ?? navInput;
    const path = raw.startsWith('/') ? raw : `/${raw}`;
    setIframePath(path);
    setNavInput(path);
  }

  // ── task CRUD (all use functional setTasks to avoid stale closure) ──
  function addTask() {
    const id = crypto.randomUUID();
    setTasks(prev => {
      const t: Task = {id, label: `Task ${prev.length + 1}`, marks: [], what: '', relatedTags: [], note: ''};
      const next = [...prev, t];
      saveLocal(next);
      return next;
    });
    setTimeout(() => startCapture(id, 'OR'), 0);
  }

  function updateTask(id: string, patch: Partial<Task>) {
    setTasks(prev => {
      const next = prev.map(t => t.id === id ? {...t, ...patch} : t);
      saveLocal(next);
      return next;
    });
  }

  function deleteTask(id: string) {
    if (captureRef.current.taskId === id) stopCapture();
    setTasks(prev => {
      const next = prev.filter(t => t.id !== id);
      saveLocal(next);
      return next;
    });
  }

  function removeMark(taskId: string, idx: number) {
    setTasks(prev => {
      const next = prev.map(t => t.id === taskId
        ? {...t, marks: t.marks.filter((_, i) => i !== idx)}
        : t);
      saveLocal(next);
      return next;
    });
  }

  function toggleTag(taskId: string, name: string) {
    setTasks(prev => {
      const next = prev.map(t => {
        if (t.id !== taskId) return t;
        const has = t.relatedTags.includes(name);
        return {...t, relatedTags: has ? t.relatedTags.filter(x => x !== name) : [...t.relatedTags, name]};
      });
      saveLocal(next);
      return next;
    });
  }

  // ── save to DB ───────────────────────────────────────────
  async function saveAllToDB() {
    setSaving(true);
    for (const task of tasks) {
      for (const mark of task.marks) {
        await fetch('/api/admin/tag-console', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            page_path: mark.path, selector: mark.selector,
            element_type: mark.tagName, element_text: mark.text,
            tag_name: task.label, note: task.what || task.note || null
          })
        });
      }
    }
    setSaving(false);
    await loadTags();
  }

  // ── export ───────────────────────────────────────────────
  function exportJSON() {
    const doc = {
      generated: new Date().toISOString(),
      tasks: tasks.map(t => ({label: t.label, what: t.what, note: t.note, marks: t.marks, relatedTags: t.relatedTags})),
      site_tags: tags.map(t => ({tag: t.tag_name, page: t.page_path, selector: t.selector}))
    };
    navigator.clipboard.writeText(JSON.stringify(doc, null, 2));
  }

  const uniqueTagNames = [...new Set(tags.map(t => t.tag_name))];

  // ─────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-full w-full overflow-hidden bg-[#0d1117]">

      {/* IFRAME ─────────────────────────────────────────── */}
      <div className="relative min-h-0 flex-1">
        <iframe
          ref={iframeRef}
          src={`http://localhost:3000${iframePath}`}
          className="w-full h-full border-0"
          title="site"
        />
        {isDragging && <div className="absolute inset-0 z-10 cursor-ns-resize" />}
        {captureTaskId && (
          <div className="absolute top-3 right-3 z-20 flex items-center gap-2 bg-[#F59E0B] text-black rounded-lg px-3 py-1.5 text-[11px] font-bold font-mono shadow-xl">
            <Crosshair size={13} />
            {captureRel === 'AND' ? '++ AND' : '+ OR'} — კლიკი element-ზე
            <button onClick={stopCapture} className="ml-1 opacity-60 hover:opacity-100">
              <X size={12} />
            </button>
          </div>
        )}
      </div>

      {/* PANEL ──────────────────────────────────────────── */}
      <div className="flex-none flex flex-col overflow-hidden" style={{height: panelH}}>

        {/* drag handle */}
        <div
          onMouseDown={onDragStart}
          className="flex-none h-4 flex items-center justify-center bg-[#161b22] border-t-2 border-[#21262d] hover:border-[#388bfd] cursor-ns-resize transition-colors group"
        >
          <div className="flex gap-1 opacity-25 group-hover:opacity-70 transition-opacity">
            {Array.from({length: 6}).map((_, i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#8b949e]" />
            ))}
          </div>
        </div>

        {/* header bar */}
        <div className="flex items-center gap-2 px-3 h-9 bg-[#161b22] border-b border-[#21262d] flex-none text-[11px] font-mono">
          {/* live hover info */}
          <div className="flex items-center gap-2 flex-1 min-w-0 overflow-hidden text-[#8b949e]">
            {hover ? (
              <>
                <span className="text-[#7ee787] flex-none">&lt;{hover.tagName}&gt;</span>
                <span className="text-[#d2a8ff] truncate">{hover.selector}</span>
                <span className="text-[#79c0ff] flex-none">{hover.path}</span>
              </>
            ) : (
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3fb950] animate-pulse inline-block" />
                გადაიტანე მაუსი iframe-ში
              </span>
            )}
          </div>

          {/* nav */}
          <input
            value={navInput}
            onChange={e => setNavInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && navigate()}
            placeholder="/path"
            className="w-40 bg-[#0d1117] border border-[#30363d] focus:border-[#58a6ff] rounded px-2 h-6 text-[11px] font-mono text-[#e6edf3] outline-none"
          />
          <button onClick={() => navigate()} className="px-2 h-6 bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] rounded text-[11px]">Go</button>

          <div className="w-px h-5 bg-[#30363d]" />

          <button onClick={addTask} className="flex items-center gap-1 px-3 h-6 bg-[#238636] hover:bg-[#2ea043] text-white rounded text-[11px] font-bold">
            <Plus size={12} /> Add Task
          </button>
          <button onClick={saveAllToDB} disabled={saving} className="flex items-center gap-1 px-2 h-6 bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] hover:text-white rounded disabled:opacity-40">
            {saving ? '…' : <><RefreshCw size={11} /> Save DB</>}
          </button>
          <button onClick={exportJSON} className="text-[#8b949e] hover:text-white p-1" title="Copy JSON">
            <Download size={13} />
          </button>
        </div>

        {/* task table */}
        <div className="flex-1 overflow-auto">
          {tasks.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <button onClick={addTask} className="flex items-center gap-2 px-5 py-3 border border-dashed border-[#30363d] rounded-lg text-[#8b949e] hover:border-[#58a6ff] hover:text-white transition-colors font-mono text-[12px]">
                <Plus size={14} /> Add Task
              </button>
            </div>
          ) : (
            <table className="w-full border-collapse font-mono text-[11px]" style={{tableLayout: 'fixed'}}>
              <colgroup>
                <col style={{width: 36}} />
                <col style={{width: 220}} />
                <col />
                <col style={{width: 180}} />
                <col style={{width: 210}} />
              </colgroup>
              <thead>
                <tr className="bg-[#161b22] text-[#8b949e] text-[10px] uppercase tracking-wider sticky top-0 z-10">
                  <th className="text-center px-2 py-1.5 border-b border-r border-[#21262d]">#</th>
                  <th className="text-left px-3 py-1.5 border-b border-r border-[#21262d]">
                    <span className="flex items-center gap-1"><Crosshair size={10}/> MARK</span>
                  </th>
                  <th className="text-left px-3 py-1.5 border-b border-r border-[#21262d]">WHAT (code / text)</th>
                  <th className="text-left px-3 py-1.5 border-b border-r border-[#21262d]">
                    <span className="flex items-center gap-1"><Tag size={10}/> TAGS</span>
                  </th>
                  <th className="text-left px-3 py-1.5 border-b border-[#21262d]">NOTE</th>
                </tr>
              </thead>
              <tbody>
                {tasks.map((task, idx) => {
                  const isCap     = captureTaskId === task.id;
                  const andCount  = task.marks.filter(m => m.rel === 'AND').length;
                  return (
                    <tr key={task.id} className={`border-b border-[#21262d] align-top ${isCap ? 'bg-[#1a1500]' : ''}`}>

                      {/* # */}
                      <td className="border-r border-[#21262d] px-1 py-2 text-center align-middle">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-[#8b949e] text-[10px]">{idx + 1}</span>
                          <button onClick={() => deleteTask(task.id)} className="text-[#30363d] hover:text-[#f85149] transition-colors">
                            <Trash2 size={10} />
                          </button>
                        </div>
                      </td>

                      {/* MARK */}
                      <td className="border-r border-[#21262d] px-2 py-2 align-top">
                        {/* task label */}
                        <input
                          value={task.label}
                          onChange={e => updateTask(task.id, {label: e.target.value})}
                          className="w-full bg-transparent text-[#e6edf3] text-[10px] outline-none border-b border-[#30363d] pb-0.5 mb-2"
                          placeholder="Task name"
                        />
                        {/* mark chips — click to delete */}
                        <div className="space-y-0.5 mb-2">
                          {task.marks.map((m, mi) => (
                            <button
                              key={mi}
                              onClick={() => removeMark(task.id, mi)}
                              title="კლიკი = წაშლა"
                              className={`group w-full flex items-start gap-1 rounded px-1.5 py-0.5 text-left transition-colors hover:bg-[#f85149]/15 ${
                                m.rel === 'AND'
                                  ? 'bg-[#1a1200] border border-[#F59E0B]/25'
                                  : 'bg-[#0d1117] border border-transparent'
                              }`}
                            >
                              <span className={`text-[8px] font-bold flex-none mt-0.5 w-5 ${m.rel === 'AND' ? 'text-[#F59E0B]' : 'text-[#58a6ff]'}`}>
                                {m.rel === 'AND' ? '&&' : '||'}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="text-[#d2a8ff] truncate text-[9px]">{m.selector}</div>
                                {m.text && <div className="text-[#8b949e] truncate text-[9px]">&ldquo;{m.text.slice(0, 26)}&rdquo;</div>}
                                <div className="text-[#79c0ff] text-[9px]">{m.path}</div>
                              </div>
                              <X size={8} className="flex-none opacity-0 group-hover:opacity-100 text-[#f85149] mt-0.5" />
                            </button>
                          ))}
                        </div>

                        {/* + and ++ buttons */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => isCap && captureRel === 'OR' ? stopCapture() : startCapture(task.id, 'OR')}
                            title="+ = OR (ან) — shift+D"
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              isCap && captureRel === 'OR'
                                ? 'bg-[#388bfd] text-black animate-pulse'
                                : 'bg-[#21262d] text-[#58a6ff] hover:bg-[#1f3a5f]'
                            }`}
                          >
                            <Crosshair size={9} /> +
                          </button>
                          <button
                            onClick={() => startCapture(task.id, 'AND')}
                            title="++ = AND — ემატება counter-ში"
                            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold transition-all ${
                              isCap && captureRel === 'AND'
                                ? 'bg-[#F59E0B] text-black animate-pulse'
                                : 'bg-[#21262d] text-[#F59E0B]/70 hover:bg-[#1a1200] hover:text-[#F59E0B]'
                            }`}
                          >
                            <Crosshair size={9} /> ++
                          </button>
                          {andCount > 0 && (
                            <span className="flex items-center justify-center min-w-[18px] h-[18px] rounded-full bg-[#F59E0B] text-black text-[9px] font-bold px-1">
                              {andCount}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* WHAT */}
                      <td className="border-r border-[#21262d] px-2 py-2 align-top relative">
                        {!task.what && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none opacity-30">
                            <LandingPlane />
                            <span className="text-[#8b949e] text-[10px] font-mono mt-2 tracking-wider">რა უნდა გააკეთოს?</span>
                          </div>
                        )}
                        <textarea
                          value={task.what}
                          onChange={e => updateTask(task.id, {what: e.target.value})}
                          placeholder=""
                          className="relative z-10 w-full min-h-[100px] bg-transparent text-[#e6edf3] resize-none outline-none text-[11px] leading-relaxed"
                        />
                      </td>

                      {/* TAGS — inline clickable chips */}
                      <td className="border-r border-[#21262d] px-2 py-2 align-top">
                        {uniqueTagNames.length === 0 ? (
                          <span className="text-[9px] text-[#8b949e] italic">tags არ არის</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {uniqueTagNames.map(name => {
                              const on = task.relatedTags.includes(name);
                              return (
                                <button
                                  key={name}
                                  onClick={() => toggleTag(task.id, name)}
                                  className={`text-[9px] font-mono rounded px-1.5 py-0.5 border transition-all leading-relaxed ${
                                    on
                                      ? 'bg-[#1f3a5f] text-[#58a6ff] border-[#388bfd]'
                                      : 'bg-transparent text-[#8b949e] border-[#30363d] hover:border-[#58a6ff] hover:text-[#e6edf3]'
                                  }`}
                                >
                                  {on && <span className="mr-0.5 text-[#3fb950]">✓</span>}
                                  {name}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </td>

                      {/* NOTE */}
                      <td className="px-2 py-2 align-top">
                        <textarea
                          value={task.note}
                          onChange={e => updateTask(task.id, {note: e.target.value})}
                          placeholder="შენიშვნა..."
                          className="w-full min-h-[110px] bg-[#161b22] border border-[#30363d] focus:border-[#58a6ff] rounded p-2 text-[#e6edf3] resize-y outline-none text-[11px] font-mono placeholder:text-[#8b949e] leading-relaxed transition-colors"
                        />
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Landing Plane ────────────────────────────────────────
function LandingPlane() {
  return (
    <svg width="80" height="52" viewBox="0 0 80 52" fill="none" className="text-[#58a6ff]">
      <line x1="70" y1="4" x2="44" y2="30" stroke="currentColor" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"/>
      <path d="M6 32 Q9 25 18 23 L50 13 Q60 10 62 18 Q63 26 54 28 L36 28 L23 40 L13 40 L24 28 Z" fill="currentColor" opacity="0.75"/>
      <path d="M6 32 L13 22 L19 27 Z" fill="currentColor" opacity="0.55"/>
      <path d="M9 33 L5 38 L20 36 Z" fill="currentColor" opacity="0.4"/>
      <rect x="31" y="26" width="14" height="5" rx="2.5" fill="currentColor" opacity="0.55"/>
      <path d="M23 28 L50 19 L52 24 L27 31 Z" fill="currentColor" opacity="0.25"/>
      <line x1="25" y1="40" x2="25" y2="46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <line x1="37" y1="38" x2="37" y2="46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
      <circle cx="25" cy="48.5" r="2.5" fill="currentColor" opacity="0.55"/>
      <circle cx="37" cy="48.5" r="2.5" fill="currentColor" opacity="0.55"/>
      <line x1="0" y1="51" x2="80" y2="51" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.2"/>
      <line x1="8"  y1="51" x2="18" y2="51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
      <line x1="28" y1="51" x2="38" y2="51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
      <line x1="48" y1="51" x2="58" y2="51" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.45"/>
    </svg>
  );
}
