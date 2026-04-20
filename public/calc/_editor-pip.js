/*!
 * EditorPIP — portable Picture-in-Picture widget for calc editors.
 * Injects a draggable, collapsible alt-view panel into a host container.
 * Uses .ep-pip CSS from _editor-ui.css (do not modify that file).
 *
 * Usage:
 *   const pip = EditorPIP.attach(stageEl, {
 *     title: 'მიმოხილვა',
 *     draw2D(svg) { ... },
 *     draw3D(svg) { ... },                  // optional
 *     initialPos: { right: 16, top: 16 },   // optional
 *     persistKey: 'eng_my_pip_v1'           // optional
 *   });
 *   // Handle: { update(), destroy(), setVisible(v), setMode('2d'|'3d'), el }
 */
(function (global) {
  'use strict';

  const SVG_NS = 'http://www.w3.org/2000/svg';

  function loadPersisted(key) {
    if (!key) return null;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const v = JSON.parse(raw);
      return (v && typeof v === 'object') ? v : null;
    } catch (_) { return null; }
  }

  function savePersisted(key, data) {
    if (!key) return;
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (_) {}
  }

  function attach(hostEl, opts) {
    if (!hostEl) throw new Error('EditorPIP.attach: hostEl is required');
    opts = opts || {};

    const title = opts.title || 'მიმოხილვა';
    const initialPos = opts.initialPos || { right: 16, top: 16 };
    const persistKey = opts.persistKey || null;
    const draw2D = typeof opts.draw2D === 'function' ? opts.draw2D : () => {};
    const draw3D = typeof opts.draw3D === 'function' ? opts.draw3D : null;

    const saved = loadPersisted(persistKey) || {};
    let mode = (saved.mode === '3d' && draw3D) ? '3d' : '2d';
    let pos  = saved.pos || null;              // {left, top} in px within host
    let collapsed = !!saved.collapsed;
    let visible = true;

    // Ensure host is positioned so absolute children anchor correctly.
    const hostPos = getComputedStyle(hostEl).position;
    if (!hostPos || hostPos === 'static') {
      hostEl.style.position = 'relative';
    }

    // Build DOM
    const root = document.createElement('div');
    root.className = 'ep-pip';
    if (collapsed) root.classList.add('collapsed');

    const head = document.createElement('div');
    head.className = 'ep-pip-head';

    const titleEl = document.createElement('span');
    titleEl.className = 'ep-pip-title';
    titleEl.textContent = title;

    const seg = document.createElement('div');
    seg.className = 'ep-pip-seg';
    const btn2d = document.createElement('button');
    btn2d.type = 'button'; btn2d.textContent = '2D';
    const btn3d = document.createElement('button');
    btn3d.type = 'button'; btn3d.textContent = '3D';
    seg.appendChild(btn2d);
    if (draw3D) seg.appendChild(btn3d);

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'ep-iconbtn';
    collapseBtn.setAttribute('data-tip', 'ჩაკვრა');
    collapseBtn.style.cssText = 'width:20px;height:20px;margin-left:2px';
    collapseBtn.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M5 12h14"/></svg>';

    head.appendChild(titleEl);
    head.appendChild(seg);
    head.appendChild(collapseBtn);

    const body = document.createElement('div');
    body.className = 'ep-pip-body';
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('xmlns', SVG_NS);
    body.appendChild(svg);

    root.appendChild(head);
    root.appendChild(body);

    // Initial position
    if (pos && typeof pos.left === 'number' && typeof pos.top === 'number') {
      root.style.left = pos.left + 'px';
      root.style.top  = pos.top + 'px';
      root.style.right = 'auto';
    } else {
      if (typeof initialPos.right === 'number') root.style.right = initialPos.right + 'px';
      if (typeof initialPos.top   === 'number') root.style.top   = initialPos.top + 'px';
      if (typeof initialPos.left  === 'number') { root.style.left = initialPos.left + 'px'; root.style.right = 'auto'; }
    }

    hostEl.appendChild(root);

    function persist() {
      savePersisted(persistKey, { mode, pos, collapsed });
    }

    function refreshSeg() {
      btn2d.classList.toggle('active', mode === '2d');
      btn3d.classList.toggle('active', mode === '3d');
    }

    function update() {
      if (!visible) return;
      refreshSeg();
      try {
        if (mode === '3d' && draw3D) draw3D(svg);
        else draw2D(svg);
      } catch (e) { /* consumer draw errors must not crash host */ console.warn('EditorPIP draw failed', e); }
    }

    function setVisible(v) {
      visible = !!v;
      root.style.display = visible ? '' : 'none';
      if (visible) update();
    }

    function setMode(m) {
      if (m !== '2d' && m !== '3d') return;
      if (m === '3d' && !draw3D) return;
      mode = m;
      refreshSeg();
      update();
      persist();
    }

    // Drag on head — clamped to host bounds
    let drag = null;
    head.addEventListener('pointerdown', (e) => {
      if (e.target.closest('button')) return;
      const r = root.getBoundingClientRect();
      drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, id: e.pointerId };
      try { head.setPointerCapture(e.pointerId); } catch (_) {}
    });
    head.addEventListener('pointermove', (e) => {
      if (!drag) return;
      const host = hostEl.getBoundingClientRect();
      const w = root.offsetWidth, h = root.offsetHeight;
      // keep at least the head visible (40px) to avoid trapping off-screen
      const left = Math.max(0, Math.min(host.width - Math.max(w, 40), e.clientX - host.left - drag.dx));
      const top  = Math.max(0, Math.min(host.height - 24, e.clientY - host.top - drag.dy));
      root.style.right = 'auto';
      root.style.left = left + 'px';
      root.style.top  = top + 'px';
      pos = { left, top };
    });
    const endDrag = (e) => {
      if (!drag) return;
      try { head.releasePointerCapture(drag.id); } catch (_) {}
      drag = null;
      persist();
    };
    head.addEventListener('pointerup', endDrag);
    head.addEventListener('pointercancel', endDrag);

    btn2d.addEventListener('click', () => setMode('2d'));
    if (draw3D) btn3d.addEventListener('click', () => setMode('3d'));
    collapseBtn.addEventListener('click', () => {
      collapsed = !collapsed;
      root.classList.toggle('collapsed', collapsed);
      persist();
      if (!collapsed) update();
    });

    // Initial paint
    refreshSeg();
    update();

    return {
      el: root,
      svg,
      update,
      setVisible,
      setMode,
      destroy() {
        try { root.remove(); } catch (_) {}
      }
    };
  }

  global.EditorPIP = { attach };
})(typeof window !== 'undefined' ? window : this);
