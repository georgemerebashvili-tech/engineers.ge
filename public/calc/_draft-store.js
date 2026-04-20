/* engineers.ge — shared calc draft-store (MVP client persistence)
 *
 * Stores form draft state per slug with:
 *   1) localStorage (primary, large capacity)
 *   2) Cookie fallback (works in privacy mode + readable server-side)
 *
 * Usage (in a calc .html):
 *
 *   <script src="/calc/_draft-store.js"></script>
 *   <script>
 *     const draft = DraftStore.create('heat-loss');
 *     draft.restoreInputs();              // restore <input id="...">, <select id="...">, …
 *     draft.autosaveInputs({debounce:300}); // save on every change
 *     // ... custom state:
 *     draft.set('walls', wallsArray);
 *     const walls = draft.get('walls');
 *     draft.clear();                       // user-triggered reset
 *   </script>
 *
 * Cookie name: eng_calc_<slug>        (30-day, size-capped ~3.5KB)
 * localStorage key: eng_calc_<slug>   (unlimited)
 */
(function (global) {
  'use strict';

  const COOKIE_TTL_DAYS = 30;
  const COOKIE_MAX_BYTES = 3500; // stay under 4KB per-cookie browser limit

  function lsKey(slug) {
    return 'eng_calc_' + slug;
  }

  function cookieKey(slug) {
    return 'eng_calc_' + slug;
  }

  function readLS(slug) {
    try {
      const raw = localStorage.getItem(lsKey(slug));
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      return null;
    }
  }

  function writeLS(slug, obj) {
    try {
      localStorage.setItem(lsKey(slug), JSON.stringify(obj));
      return true;
    } catch (_) {
      return false;
    }
  }

  function readCookie(slug) {
    const name = cookieKey(slug) + '=';
    const parts = (document.cookie || '').split('; ');
    for (const p of parts) {
      if (p.indexOf(name) === 0) {
        try {
          return JSON.parse(decodeURIComponent(p.slice(name.length)));
        } catch (_) {
          return null;
        }
      }
    }
    return null;
  }

  function writeCookie(slug, obj) {
    try {
      const raw = encodeURIComponent(JSON.stringify(obj));
      if (raw.length > COOKIE_MAX_BYTES) {
        // Drop dynamic payload and keep only inputs blob; still too big → skip.
        const pared = {inputs: obj.inputs || {}};
        const rawPared = encodeURIComponent(JSON.stringify(pared));
        if (rawPared.length > COOKIE_MAX_BYTES) return false;
        document.cookie =
          cookieKey(slug) +
          '=' +
          rawPared +
          '; path=/; max-age=' +
          COOKIE_TTL_DAYS * 86400 +
          '; SameSite=Lax';
        return true;
      }
      document.cookie =
        cookieKey(slug) +
        '=' +
        raw +
        '; path=/; max-age=' +
        COOKIE_TTL_DAYS * 86400 +
        '; SameSite=Lax';
      return true;
    } catch (_) {
      return false;
    }
  }

  function clearCookie(slug) {
    document.cookie = cookieKey(slug) + '=; path=/; max-age=0; SameSite=Lax';
  }

  function read(slug) {
    // LocalStorage is primary. Cookie is fallback (privacy mode).
    return readLS(slug) || readCookie(slug) || {};
  }

  function write(slug, obj) {
    writeLS(slug, obj);
    writeCookie(slug, obj);
  }

  function debounce(fn, ms) {
    let t;
    return function (...args) {
      clearTimeout(t);
      t = setTimeout(function () {
        fn.apply(null, args);
      }, ms);
    };
  }

  function create(slug) {
    if (!slug || typeof slug !== 'string') {
      throw new Error('DraftStore.create: slug required');
    }
    const state = read(slug);
    state.inputs = state.inputs || {};
    state.custom = state.custom || {};
    state.savedAt = state.savedAt || null;

    function persist() {
      state.savedAt = new Date().toISOString();
      write(slug, state);
    }

    function restoreInputs() {
      const saved = state.inputs || {};
      let touched = 0;
      Object.keys(saved).forEach(function (id) {
        const el = document.getElementById(id);
        if (!el) return;
        const v = saved[id];
        if (el.type === 'checkbox') el.checked = !!v;
        else if (el.type === 'radio') el.checked = el.value === v;
        else el.value = v == null ? '' : String(v);
        el.dispatchEvent(new Event('input', {bubbles: true}));
        el.dispatchEvent(new Event('change', {bubbles: true}));
        touched++;
      });
      return touched;
    }

    function captureInputs() {
      const nodes = document.querySelectorAll(
        'input[id], select[id], textarea[id]'
      );
      const snap = {};
      nodes.forEach(function (el) {
        if (el.disabled) return;
        if (el.type === 'checkbox') snap[el.id] = el.checked;
        else if (el.type === 'radio') {
          if (el.checked) snap[el.id] = el.value;
        } else {
          snap[el.id] = el.value;
        }
      });
      state.inputs = snap;
    }

    function autosaveInputs(opts) {
      const delay = (opts && opts.debounce) || 400;
      const save = debounce(function () {
        captureInputs();
        persist();
      }, delay);
      document.addEventListener('input', save, true);
      document.addEventListener('change', save, true);
      // First run so partial fills persist even before next edit.
      save();
    }

    function set(key, value) {
      state.custom[key] = value;
      persist();
    }

    function get(key, fallback) {
      return Object.prototype.hasOwnProperty.call(state.custom, key)
        ? state.custom[key]
        : fallback;
    }

    function clear() {
      try {
        localStorage.removeItem(lsKey(slug));
      } catch (_) {}
      clearCookie(slug);
      Object.keys(state).forEach(function (k) {
        delete state[k];
      });
      state.inputs = {};
      state.custom = {};
    }

    function savedAt() {
      return state.savedAt;
    }

    return {
      slug: slug,
      restoreInputs: restoreInputs,
      autosaveInputs: autosaveInputs,
      captureInputs: captureInputs,
      set: set,
      get: get,
      clear: clear,
      savedAt: savedAt
    };
  }

  global.DraftStore = {
    create: create,
    read: read,
    write: write
  };
})(typeof window !== 'undefined' ? window : this);
