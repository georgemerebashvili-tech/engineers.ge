/* engineers.ge — project bridge for iframe-based editors
 * Couples a standalone HTML editor (wall-editor, building-composer, …) to
 * lib/projects.ts' localStorage slot (`eng_projects_v1`).
 *
 * Usage (in editor HTML):
 *   <script src="/calc/_project-bridge.js"></script>
 *   const bridge = ProjectBridge.init({
 *     slug: 'wall-editor',
 *     legacyKey: 'eng_wall_editor_v1',   // fallback when no ?project=
 *     getState: () => state,              // snapshot current state
 *     applyState: (s) => { Object.assign(state, s); ... refresh() }
 *   });
 *   bridge.save();      // debounced
 *   bridge.saveAs('ახალი ასლი');
 *
 * The bridge reads `?project=<id>` from window.location.search. If present,
 * save/load operates on that projects entry. If absent, falls back to the
 * editor's legacy localStorage key (backward compat).
 */

(function (global) {
  'use strict';
  const PROJECTS_KEY = 'eng_projects_v1';

  function readAll() {
    try {
      const raw = localStorage.getItem(PROJECTS_KEY);
      if (!raw) return [];
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch { return []; }
  }
  function writeAll(list) {
    try { localStorage.setItem(PROJECTS_KEY, JSON.stringify(list)); }
    catch (e) { console.warn('project-bridge: write failed', e); }
  }
  function uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'p-' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
  }
  function getProject(id) {
    return readAll().find(p => p.id === id) || null;
  }
  function updateProject(id, patch) {
    const all = readAll();
    const i = all.findIndex(p => p.id === id);
    if (i < 0) return null;
    all[i] = { ...all[i], ...patch, id: all[i].id, slug: all[i].slug, updatedAt: new Date().toISOString() };
    writeAll(all);
    return all[i];
  }
  function createProject(slug, st, name) {
    const now = new Date().toISOString();
    const p = {
      id: uuid(), slug,
      name: name || defaultName(slug),
      version: 'v1.0',
      createdAt: now, updatedAt: now,
      state: st || {},
      meta: {}
    };
    const all = readAll();
    all.push(p);
    writeAll(all);
    return p;
  }
  function defaultName(slug) {
    const d = new Date();
    const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    return `${slug} · ${ds}`;
  }
  function setUrlProject(id, slug) {
    try {
      const u = new URL(window.location.href);
      u.searchParams.set('project', id);
      u.searchParams.delete('state');
      history.replaceState(null, '', u.toString());
    } catch {}
    try {
      if (window.parent && window.parent !== window) {
        const parentUrl = new URL(window.parent.location.href);
        if (parentUrl.pathname === '/calc/' + slug) {
          parentUrl.searchParams.set('project', id);
          parentUrl.searchParams.delete('state');
          const nextUrl = parentUrl.toString();
          if (nextUrl !== window.parent.location.href) {
            window.parent.location.href = nextUrl;
          }
        }
      }
    } catch {}
  }

  function init(opts) {
    const slug = opts.slug;
    const legacyKey = opts.legacyKey;
    const getState = opts.getState || (() => ({}));
    const applyState = opts.applyState || (() => {});
    const onProjectChange = opts.onProjectChange || (() => {});

    const params = new URLSearchParams(window.location.search);
    let projectId = params.get('project') || null;
    const sharedState = params.get('state') || null;

    let saveTimer = null;
    const debounceMs = opts.debounceMs || 1200;

    // UTF-8 safe base64 codecs — avoid deprecated escape/unescape globals.
    function b64encodeUtf8(str) {
      const bytes = new TextEncoder().encode(str);
      let bin = '';
      for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
      return btoa(bin);
    }
    function b64decodeUtf8(b64) {
      const bin = atob(b64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      return new TextDecoder().decode(bytes);
    }

    function load() {
      // Shared-link state takes precedence — base64-encoded project state in
      // the URL. Loads into the editor but does NOT auto-save to projects
      // (user must "Save as" to persist).
      if (sharedState) {
        try {
          const data = JSON.parse(b64decodeUtf8(sharedState));
          applyState(data);
          onProjectChange({ id: null, name: '🔗 გაზიარებული', slug, shared: true });
          return { loaded: true, from: 'shared' };
        } catch (e) { console.warn('shared state decode failed', e); }
      }
      if (projectId) {
        const p = getProject(projectId);
        if (p && p.state) {
          try { applyState(p.state); } catch (e) { console.warn('apply failed', e); }
          onProjectChange({ id: p.id, name: p.name, slug: p.slug });
          return { loaded: true, from: 'project', project: p };
        }
        // Project id in URL but not found → fall through to legacy or empty
      }
      // Legacy fallback
      if (legacyKey) {
        try {
          const raw = localStorage.getItem(legacyKey);
          if (raw) {
            const data = JSON.parse(raw);
            applyState(data);
            return { loaded: true, from: 'legacy' };
          }
        } catch {}
      }
      return { loaded: false };
    }

    function save(immediate) {
      if (saveTimer) clearTimeout(saveTimer);
      const run = () => {
        const st = getState();
        if (projectId) {
          const ok = updateProject(projectId, { state: st });
          if (!ok) {
            // Stale id — promote to new project
            const p = createProject(slug, st);
            projectId = p.id;
            setUrlProject(p.id, slug);
            onProjectChange({ id: p.id, name: p.name, slug: p.slug });
          }
        } else if (legacyKey) {
          try { localStorage.setItem(legacyKey, JSON.stringify(st)); } catch {}
        }
      };
      if (immediate) run(); else saveTimer = setTimeout(run, debounceMs);
    }

    function saveAs(name) {
      const st = getState();
      const p = createProject(slug, st, name);
      projectId = p.id;
      setUrlProject(p.id, slug);
      onProjectChange({ id: p.id, name: p.name, slug: p.slug });
      return p;
    }

    function rename(newName) {
      if (!projectId) return null;
      const p = updateProject(projectId, { name: newName });
      if (p) onProjectChange({ id: p.id, name: p.name, slug: p.slug });
      return p;
    }

    function currentProject() {
      return projectId ? getProject(projectId) : null;
    }

    function openGate() {
      // Navigate parent (if iframe) or self to the calc route without ?project=
      try {
        const target = `/calc/${slug}`;
        if (window.parent && window.parent !== window) {
          window.parent.location.href = target;
        } else {
          window.location.href = target;
        }
      } catch {}
    }

    function exportJSON() {
      const p = currentProject();
      const data = p ? p : { slug, state: getState(), name: 'export', version: 'v1.0', createdAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (data.name || slug).replace(/\s+/g, '-') + '.json';
      a.click();
    }

    function importJSON(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const data = JSON.parse(String(reader.result));
            if (!data || typeof data !== 'object') throw new Error('invalid JSON');
            const st = data.state || data;
            applyState(st);
            // Save as new project
            const p = saveAs((data.name || 'Imported') + ' · imported');
            resolve(p);
          } catch (e) { reject(e); }
        };
        reader.onerror = reject;
        reader.readAsText(file);
      });
    }

    function printPDF() {
      // Trigger browser print dialog — user chooses "Save as PDF"
      window.print();
    }

    // Generate a shareable URL encoding current state into `?state=<base64>`.
    // Returns the URL string; consumer decides how to present (copy to
    // clipboard, toast, modal).
    function shareLink() {
      const st = getState();
      const json = JSON.stringify(st);
      let b64 = '';
      try {
        b64 = b64encodeUtf8(json);
      } catch (e) {
        throw new Error('state serialization failed: ' + e.message);
      }
      const base = window.location.origin + '/calc/' + slug;
      const url = base + '?state=' + b64;
      if (url.length > 8000) {
        console.warn('share URL is long (' + url.length + ' chars); recipient may hit browser URL limits');
      }
      return url;
    }

    async function copyShareLink() {
      const url = shareLink();
      try {
        await navigator.clipboard.writeText(url);
        return { url, copied: true };
      } catch {
        return { url, copied: false };
      }
    }

    return {
      slug,
      load, save, saveAs, rename,
      currentProject,
      openGate,
      exportJSON, importJSON, printPDF,
      shareLink, copyShareLink,
      get projectId() { return projectId; }
    };
  }

  global.ProjectBridge = { init };
})(typeof window !== 'undefined' ? window : this);
