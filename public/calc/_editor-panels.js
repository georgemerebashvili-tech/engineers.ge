/* engineers.ge — portable editor context-panel renderers
 * Requires: /calc/_editor-ui.css (for .ep-* styles)
 *
 * Public API (exposed on global `EditorPanels`):
 *
 *   EditorPanels.render(container, ctx, handlers)
 *     container — HTMLElement to render into (the .ep-panel-body)
 *     ctx       — { type, data, tool?, meta? } see `CONTEXT TYPES` below
 *     handlers  — { onField(key, value), onAction(name, args?), onLibPick(catKey) }
 *
 *   EditorPanels.ctxMenu(container, selection, handlers)
 *     Renders a floating .ep-ctx toolbar anchored at selection.x/y.
 *     Hides if selection is null.
 *
 *   EditorPanels.registerType(type, renderFn)
 *     Extension point — editors can add custom renderers (e.g. 'jetfan' specific).
 *
 * CONTEXT TYPES (built-in):
 *   'empty'        — nothing selected, no tool   → Floor panel
 *   'tool:wall'    — wall tool active            → "Draw wall" form + library
 *   'tool:door'    — door tool active
 *   'tool:window'  — window tool active
 *   'tool:column'  — column tool active
 *   'tool:jetfan'  — jet fan tool active
 *   'tool:exhaust' — exhaust tool active
 *   'sel:wall'     — wall element selected
 *   'sel:door'     — door selected
 *   'sel:window'   — window selected
 *   'sel:column'   — column selected
 *   'sel:jetfan'   — jet fan selected
 *   'sel:exhaust'  — exhaust selected
 *   'sel:room'     — room (closed polygon) selected
 *   'sel:multi'    — multiple elements
 *
 * All data/state mutations go through handlers.onField/onAction — this module
 * holds NO state. It is pure rendering.
 */

(function (global) {
  'use strict';

  // ─────────────────────────────────────────────── utilities ──
  const h = (tag, attrs, ...children) => {
    const el = document.createElement(tag);
    if (attrs) {
      for (const k in attrs) {
        const v = attrs[k];
        if (v == null || v === false) continue;
        if (k === 'class') el.className = v;
        else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
        else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
        else if (k === 'html') el.innerHTML = v;
        else el.setAttribute(k, v === true ? '' : v);
      }
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.appendChild(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  };

  const iconSvg = (path, size = 14) =>
    `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;

  const ICONS = {
    wall: '<path d="M4 20V6h16v14M4 13h16M12 6v14"/>',
    door: '<rect x="6" y="4" width="12" height="16"/><path d="M6 12h6"/>',
    window: '<rect x="4" y="6" width="16" height="12"/><path d="M12 6v12M4 12h16"/>',
    column: '<circle cx="12" cy="12" r="6"/>',
    fan: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>',
    exhaust: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 8l8 8M16 8l-8 8"/>',
    room: '<path d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z"/>',
    floor: '<rect x="3" y="3" width="18" height="18" rx="2"/>',
    delete: '<path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>',
    duplicate: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V6a2 2 0 012-2h10"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
    unlock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0"/>',
    visible: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    hidden: '<path d="M1 12s4-8 11-8c3 0 5.7 1.6 7.7 3.4M23 12s-4 8-11 8c-3 0-5.7-1.6-7.7-3.4"/><path d="M3 3l18 18"/>',
    flip: '<path d="M3 12h18M8 7l-5 5 5 5M16 7l5 5-5 5"/>',
    rotate: '<path d="M3 12a9 9 0 119 9"/><path d="M3 4v8h8"/>',
    align: '<path d="M6 4v16M18 4v16M4 8h16M4 16h16"/>',
    caret: '<path d="M6 9l6 6 6-6"/>',
    chev: '<path d="M9 18l6-6-6-6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M12 1v6M12 17v6M4.2 4.2l4.3 4.3M15.5 15.5l4.3 4.3M1 12h6M17 12h6M4.2 19.8l4.3-4.3M15.5 8.5l4.3-4.3"/>',
    save: '<path d="M5 3h11l4 4v13a1 1 0 01-1 1H5a1 1 0 01-1-1V4a1 1 0 011-1z"/><path d="M8 3v5h8V3M8 21v-7h8v7"/>',
    fire: '<path d="M12 2s3 4 3 7a3 3 0 11-6 0c0-1 1-2 1-2-2 1-4 4-4 7a6 6 0 0012 0c0-5-6-9-6-12z"/>',
    pip: '<rect x="3" y="5" width="18" height="14" rx="2"/><rect x="12" y="11" width="7" height="5"/>',
    ruler: '<rect x="2" y="8" width="20" height="8"/><path d="M6 8v3M10 8v3M14 8v3M18 8v3"/>'
  };

  const mkIcon = (name, size = 14) => {
    const span = document.createElement('span');
    span.innerHTML = iconSvg(ICONS[name] || ICONS.settings, size);
    return span.firstChild;
  };

  // ─────────────────────────────────────────────── field builders ──
  function field(label, ...children) {
    const lbl = typeof label === 'string'
      ? h('label', { class: 'ep-label' }, label)
      : label;
    return h('div', { class: 'ep-field' }, lbl, ...children);
  }

  function numInput({ value, min, max, step, unit, placeholder, onInput }) {
    const inp = h('input', {
      type: 'number',
      class: 'ep-input',
      value: value != null ? String(value) : '',
      min: min != null ? String(min) : null,
      max: max != null ? String(max) : null,
      step: step != null ? String(step) : 'any',
      placeholder: placeholder || '',
      oninput: onInput ? (e) => onInput(parseFloat(e.target.value)) : null
    });
    if (unit) {
      return h('div', { class: 'ep-num' },
        inp,
        h('span', { class: 'ep-num-unit' }, unit)
      );
    }
    return inp;
  }

  function textInput({ value, placeholder, onInput }) {
    return h('input', {
      type: 'text',
      class: 'ep-input',
      value: value != null ? value : '',
      placeholder: placeholder || '',
      oninput: onInput ? (e) => onInput(e.target.value) : null
    });
  }

  function selectInput({ value, options, onChange }) {
    const sel = h('select', {
      class: 'ep-input',
      onchange: onChange ? (e) => onChange(e.target.value) : null
    });
    for (const opt of options) {
      const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
      const el = h('option', { value: o.value }, o.label);
      if (String(o.value) === String(value)) el.selected = true;
      sel.appendChild(el);
    }
    return sel;
  }

  function segControl({ value, options, onChange }) {
    const seg = h('div', { class: 'ep-seg' });
    for (const opt of options) {
      const o = typeof opt === 'string' ? { value: opt, label: opt } : opt;
      const btn = h('button', {
        class: String(o.value) === String(value) ? 'active' : '',
        onclick: () => onChange && onChange(o.value)
      }, o.label);
      seg.appendChild(btn);
    }
    return seg;
  }

  function toggle({ value, label, onChange }) {
    const row = h('label', {
      class: 'ep-toggle' + (value ? ' active' : ''),
      onclick: (e) => { e.preventDefault(); onChange && onChange(!value); }
    },
      h('span', {}, label),
      h('span', { class: 'ep-toggle-sw' })
    );
    return row;
  }

  function slider({ value, min, max, step, unit, onInput }) {
    const vSpan = h('span', { class: 'ep-slider-val' }, `${value}${unit || ''}`);
    const inp = h('input', {
      type: 'range',
      min: String(min), max: String(max), step: String(step || 1),
      value: String(value),
      oninput: (e) => {
        const v = parseFloat(e.target.value);
        vSpan.textContent = `${v}${unit || ''}`;
        onInput && onInput(v);
      }
    });
    return h('div', { class: 'ep-slider-row' }, inp, vSpan);
  }

  function stat(label, val) {
    return h('div', { class: 'ep-stat' },
      h('span', {}, label),
      h('span', { class: 'ep-stat-val' }, val)
    );
  }

  function section({ title, aux, collapsed, iconRow, children }) {
    const caret = h('span', { class: 'ep-caret', html: iconSvg(ICONS.caret, 10) });
    const body = h('div', { class: 'ep-section-body' }, ...(children || []));
    const head = h('button', { class: 'ep-section-head', type: 'button' },
      caret,
      h('span', {}, title),
      h('span', { class: 'ep-head-spacer' }),
      aux ? h('span', { class: 'ep-head-aux' }, aux) : null,
      ...(iconRow || [])
    );
    const sec = h('div', { class: 'ep-section' + (collapsed ? ' collapsed' : '') }, head, body);
    head.addEventListener('click', (e) => {
      if (e.target.closest('.ep-iconbtn')) return;
      sec.classList.toggle('collapsed');
    });
    return sec;
  }

  // ─────────────────────────────────────────────── per-context renderers ──
  const renderers = {};

  function empty(container, msg) {
    container.innerHTML = '';
    container.appendChild(h('div', { class: 'ep-empty' },
      h('span', { class: 'ep-empty-ico' }, '📐'),
      msg || 'აარჩიე ელემენტი კანვაზე\nან დაიწყე ხატვა ინსტრუმენტით'
    ));
  }

  // FLOOR — shown when no selection and no active tool
  renderers['empty'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'იატაკი',
        aux: d.floorLabel || '1F',
        collapsed: false,
        children: [
          field('სახელი', textInput({
            value: d.name || '', placeholder: 'ახალი გეგმა',
            onInput: v => hx.onField('name', v)
          })),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'ოთახის სიმაღლე ', h('span', { class: 'ep-unit' }, '(მ)')),
              numInput({ value: d.roomH, min: 2.0, max: 8, step: 0.1, unit: 'მ',
                onInput: v => hx.onField('roomH', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'იატაკის სისქე ', h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.slabThk, min: 100, max: 500, step: 10, unit: 'მმ',
                onInput: v => hx.onField('slabThk', v) })
            )
          ),
          d.area != null ? stat('ფართობი', (d.area || 0).toFixed(2) + ' მ²') : null,
          d.perim != null ? stat('პერიმეტრი', (d.perim || 0).toFixed(2) + ' მ') : null,
          d.wallCount != null ? stat('კედლების რაოდ.', d.wallCount) : null,
          d.roomCount != null ? stat('ოთახების რაოდ.', d.roomCount) : null
        ].filter(Boolean)
      })
    );

    container.appendChild(
      section({
        title: 'ხილვადობა',
        collapsed: true,
        children: [
          toggle({ value: d.showGrid !== false, label: 'ბადე',
            onChange: v => hx.onField('showGrid', v) }),
          toggle({ value: d.showDims !== false, label: 'ზომები',
            onChange: v => hx.onField('showDims', v) }),
          toggle({ value: d.showRoomLabels !== false, label: 'ოთახის ლეიბლები',
            onChange: v => hx.onField('showRoomLabels', v) }),
          toggle({ value: !!d.showFixtures, label: 'ფიქსცერების ხაზო.',
            onChange: v => hx.onField('showFixtures', v) }),
          field(
            h('label', { class: 'ep-label' }, 'Grid ',
              h('span', { class: 'ep-unit' }, '(მ)')),
            selectInput({ value: d.gridStep || 0.25,
              options: [
                { value: 0.1, label: '10 სმ' },
                { value: 0.25, label: '25 სმ' },
                { value: 0.5, label: '50 სმ' },
                { value: 1, label: '1 მ' }
              ],
              onChange: v => hx.onField('gridStep', parseFloat(v)) })
          ),
          field('გეგმის გამჭვირვალობა',
            slider({ value: d.planOpacity != null ? d.planOpacity : 100, min: 0, max: 100, step: 5, unit: '%',
              onInput: v => hx.onField('planOpacity', v) })
          )
        ]
      })
    );

    container.appendChild(
      section({
        title: 'ქვესართულები',
        aux: d.floorCount ? `${d.floorCount} სართ.` : null,
        collapsed: true,
        children: [
          h('div', { class: 'ep-btn-row' },
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('floor:new-upper') },
              mkIcon('plus', 12), ' ზედა სართული'),
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('floor:new-lower') },
              mkIcon('plus', 12), ' ქვედა სართული')
          ),
          h('div', { class: 'ep-hint' },
            'მრავალსართულიანი გეგმა — თითოეულ სართულს თავისი პოლიგონი/კედლები აქვს. გადაამოწმე ჩასახლება/ფერდი სიმაღლეები.')
        ]
      })
    );
  };

  // TOOL:WALL — drawing mode
  renderers['tool:wall'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'კედლის ხატვა',
        aux: 'W',
        collapsed: false,
        children: [
          field('ხაზვის რეჟიმი',
            segControl({ value: d.wallMode || 'line',
              options: [
                { value: 'line', label: 'ხაზი' },
                { value: 'rect', label: 'მართკუთხა' },
                { value: 'arc', label: 'რკალი' }
              ],
              onChange: v => hx.onField('wallMode', v) })
          ),
          field('ღერძი',
            segControl({ value: d.wallAxis || 'center',
              options: [
                { value: 'inner', label: 'შიგნით' },
                { value: 'center', label: 'ცენტრი' },
                { value: 'outer', label: 'გარე' }
              ],
              onChange: v => hx.onField('wallAxis', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'სისქე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.wallThk || 120, min: 50, max: 500, step: 10, unit: 'მმ',
                onInput: v => hx.onField('wallThk', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'სიმაღლე ',
                h('span', { class: 'ep-unit' }, '(მ)')),
              numInput({ value: d.wallH || 2.8, min: 1.5, max: 8, step: 0.1, unit: 'მ',
                onInput: v => hx.onField('wallH', v) })
            )
          ),
          field('ტიპი',
            selectInput({ value: d.wallType || 'partition',
              options: [
                { value: 'partition', label: 'ტიხარი (არა-მზიდი)' },
                { value: 'loadbearing', label: 'მზიდი' },
                { value: 'facade', label: 'ფასადი' },
                { value: 'fire', label: 'სახანძრო ტიხარი' }
              ],
              onChange: v => hx.onField('wallType', v) })
          ),
          toggle({ value: !!d.autoRoom, label: 'ავტო-ოთახი ჩაკეტვისას',
            onChange: v => hx.onField('autoRoom', v) }),
          h('div', { class: 'ep-hint' },
            'დააწკაპე წერტილები → Enter დასრულება, Esc გაუქმება.')
        ]
      })
    );

    // Library for current tool — walls
    if (ctx.library && ctx.library.length) {
      container.appendChild(libSection('სწრაფი შაბლონები', ctx.library, ctx.libSel, hx));
    }
  };

  // TOOL:DOOR — placing mode
  renderers['tool:door'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'კარის განთავსება',
        aux: 'D',
        collapsed: false,
        children: [
          field('ტიპი',
            segControl({ value: d.doorType || 'single',
              options: [
                { value: 'single', label: '1-ფრთ.' },
                { value: 'double', label: '2-ფრთ.' },
                { value: 'sliding', label: 'მოცურ.' }
              ],
              onChange: v => hx.onField('doorType', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'სიგანე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.doorW || 900, min: 600, max: 3000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('doorW', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'სიმაღლე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.doorH || 2100, min: 1800, max: 3000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('doorH', v) })
            )
          ),
          field('ხსნის მიმართ.',
            segControl({ value: d.doorSwing || 'inner-left',
              options: [
                { value: 'inner-left', label: '↙' },
                { value: 'inner-right', label: '↘' },
                { value: 'outer-left', label: '↖' },
                { value: 'outer-right', label: '↗' }
              ],
              onChange: v => hx.onField('doorSwing', v) })
          ),
          field('სახანძრო კლასი',
            selectInput({ value: d.fireRating || 'none',
              options: [
                { value: 'none', label: 'არა' },
                { value: 'ei30', label: 'EI 30' },
                { value: 'ei60', label: 'EI 60' },
                { value: 'ei90', label: 'EI 90' },
                { value: 'ei120', label: 'EI 120' }
              ],
              onChange: v => hx.onField('fireRating', v) })
          ),
          h('div', { class: 'ep-hint' },
            'კედელს მიადექი — მოკრავს ავტომატურად.')
        ]
      })
    );

    if (ctx.library && ctx.library.length) {
      container.appendChild(libSection('კარის ბიბლიოთეკა', ctx.library, ctx.libSel, hx));
    }
  };

  // TOOL:WINDOW
  renderers['tool:window'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'ფანჯრის განთავსება',
        aux: 'F',
        collapsed: false,
        children: [
          field('ტიპი',
            segControl({ value: d.winType || 'casement',
              options: [
                { value: 'casement', label: 'ფიცარი' },
                { value: 'sliding', label: 'მოცურ.' },
                { value: 'tilt', label: 'დახრი.' },
                { value: 'bay', label: 'Bay' }
              ],
              onChange: v => hx.onField('winType', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'სიგანე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.winW || 1200, min: 300, max: 5000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('winW', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'სიმაღლე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.winH || 1500, min: 300, max: 3500, step: 50, unit: 'მმ',
                onInput: v => hx.onField('winH', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'ცოკოლის ',
              h('span', { class: 'ep-unit' }, '(იატაკიდან მმ)')),
            numInput({ value: d.sill != null ? d.sill : 900, min: 0, max: 2000, step: 50, unit: 'მმ',
              onInput: v => hx.onField('sill', v) })
          ),
          field('ჩარჩო',
            selectInput({ value: d.frame || 'pvc-white',
              options: [
                { value: 'pvc-white', label: 'PVC თეთრი' },
                { value: 'pvc-grey', label: 'PVC რუხი' },
                { value: 'alu', label: 'ალუმინი' },
                { value: 'wood', label: 'ხე' }
              ],
              onChange: v => hx.onField('frame', v) })
          )
        ]
      })
    );
    if (ctx.library && ctx.library.length) {
      container.appendChild(libSection('ფანჯრის ბიბლიოთეკა', ctx.library, ctx.libSel, hx));
    }
  };

  // TOOL:COLUMN
  renderers['tool:column'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'კოლონის განთავსება',
        aux: 'C',
        collapsed: false,
        children: [
          field('ფორმა',
            segControl({ value: d.colShape || 'rect',
              options: [
                { value: 'rect', label: 'მართკუთხა' },
                { value: 'round', label: 'წრიული' },
                { value: 'l-shape', label: 'L-ფორმა' }
              ],
              onChange: v => hx.onField('colShape', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'W ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.colW || 400, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('colW', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'D ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.colD || 400, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('colD', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'სიმაღლე ',
              h('span', { class: 'ep-unit' }, '(მ)')),
            numInput({ value: d.colH || 3.0, min: 1.5, max: 10, step: 0.1, unit: 'მ',
              onInput: v => hx.onField('colH', v) })
          ),
          field('მასალა',
            selectInput({ value: d.colMat || 'concrete',
              options: [
                { value: 'concrete', label: 'ბეტონი' },
                { value: 'steel', label: 'ფოლადი' },
                { value: 'brick', label: 'აგური' }
              ],
              onChange: v => hx.onField('colMat', v) })
          )
        ]
      })
    );
    if (ctx.library && ctx.library.length) {
      container.appendChild(libSection('კოლონის ბიბლიოთეკა', ctx.library, ctx.libSel, hx));
    }
  };

  // TOOL:JETFAN
  renderers['tool:jetfan'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'ჯეტ ფანის განთავსება',
        aux: 'J',
        collapsed: false,
        children: [
          field('ფორმა',
            segControl({ value: d.fanShape || 'round',
              options: [
                { value: 'round', label: 'წრიული' },
                { value: 'rect', label: 'მართკუთხა' }
              ],
              onChange: v => hx.onField('fanShape', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'დიამეტრი ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.fanDia || 315, min: 200, max: 800, step: 10, unit: 'მმ',
                onInput: v => hx.onField('fanDia', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'ბიძგი ',
                h('span', { class: 'ep-unit' }, '(N)')),
              numInput({ value: d.fanThrust || 50, min: 10, max: 200, step: 5, unit: 'N',
                onInput: v => hx.onField('fanThrust', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'ჰაერის ხარჯი ',
              h('span', { class: 'ep-unit' }, '(მ³/სთ)')),
            numInput({ value: d.fanFlow || 7500, min: 1000, max: 50000, step: 500, unit: 'მ³/სთ',
              onInput: v => hx.onField('fanFlow', v) })
          ),
          field('რევერსიული', toggle({ value: !!d.reversible, label: 'Reversible',
            onChange: v => hx.onField('reversible', v) })),
          h('div', { class: 'ep-hint' },
            'პარკინგზე მიყრდნობა: ≥7.5 მ ბიჯით. ცხელი/ცივი ზონის მიმართ ორიენტაცია.')
        ]
      })
    );
    if (ctx.library && ctx.library.length) {
      container.appendChild(libSection('ჯეტ ფანის მოდელები', ctx.library, ctx.libSel, hx));
    }
  };

  // TOOL:EXHAUST
  renderers['tool:exhaust'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'გამწოვის განთავსება',
        aux: 'E',
        collapsed: false,
        children: [
          field('ტიპი',
            selectInput({ value: d.exType || 'grille',
              options: [
                { value: 'grille', label: 'ცხაური' },
                { value: 'duct', label: 'ქურთუკი' },
                { value: 'point', label: 'წერტილოვანი' }
              ],
              onChange: v => hx.onField('exType', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'W ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.exW || 600, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('exW', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'H ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.exH || 600, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('exH', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'ხარჯი ',
              h('span', { class: 'ep-unit' }, '(მ³/სთ)')),
            numInput({ value: d.exFlow || 2000, min: 100, max: 50000, step: 100, unit: 'მ³/სთ',
              onInput: v => hx.onField('exFlow', v) })
          )
        ]
      })
    );
    if (ctx.library && ctx.library.length) {
      container.appendChild(libSection('გამწოვის ბიბლიოთეკა', ctx.library, ctx.libSel, hx));
    }
  };

  // SEL:WALL
  renderers['sel:wall'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'კედელი',
        aux: d.id ? `#${String(d.id).slice(-4)}` : null,
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn', 'data-tip': 'ჩაკეტვა',
            onclick: () => hx.onAction('lock-toggle') }, mkIcon(d.locked ? 'lock' : 'unlock', 12)),
          h('button', { class: 'ep-iconbtn', 'data-tip': 'დამალვა',
            onclick: () => hx.onAction('visibility-toggle') }, mkIcon(d.hidden ? 'hidden' : 'visible', 12)),
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'სისქე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.thk, min: 50, max: 500, step: 10, unit: 'მმ',
                onInput: v => hx.onField('thk', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'სიმაღლე ',
                h('span', { class: 'ep-unit' }, '(მ)')),
              numInput({ value: d.h, min: 1.5, max: 8, step: 0.1, unit: 'მ',
                onInput: v => hx.onField('h', v) })
            )
          ),
          field('ტიპი',
            selectInput({ value: d.type || 'partition',
              options: [
                { value: 'partition', label: 'ტიხარი' },
                { value: 'loadbearing', label: 'მზიდი' },
                { value: 'facade', label: 'ფასადი' },
                { value: 'fire', label: 'სახანძრო' }
              ],
              onChange: v => hx.onField('type', v) })
          ),
          field('მასალა',
            selectInput({ value: d.material || 'brick',
              options: [
                { value: 'brick', label: 'აგური' },
                { value: 'concrete', label: 'ბეტონი' },
                { value: 'gypsum', label: 'GKL' },
                { value: 'block', label: 'ბლოკი' }
              ],
              onChange: v => hx.onField('material', v) })
          ),
          d.length != null ? stat('სიგრძე', d.length.toFixed(2) + ' მ') : null,
          d.area != null ? stat('ფართი', d.area.toFixed(2) + ' მ²') : null,
          h('div', { class: 'ep-divider' }),
          h('div', { class: 'ep-btn-row' },
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('split') }, 'გაყოფა'),
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('reverse') }, 'შებრუნება')
          )
        ].filter(Boolean)
      })
    );
  };

  // SEL:DOOR / SEL:WINDOW share fields
  function renderOpeningPanel(kind, container, ctx, hx) {
    const d = ctx.data || {};
    const title = kind === 'door' ? 'კარი' : 'ფანჯარა';
    const typeOpts = kind === 'door'
      ? [
          { value: 'single', label: '1-ფრთ.' },
          { value: 'double', label: '2-ფრთ.' },
          { value: 'sliding', label: 'მოცურ.' }
        ]
      : [
          { value: 'casement', label: 'ფიცარი' },
          { value: 'sliding', label: 'მოცურ.' },
          { value: 'tilt', label: 'დახრი.' },
          { value: 'bay', label: 'Bay' }
        ];

    container.innerHTML = '';
    container.appendChild(
      section({
        title,
        aux: d.id ? `#${String(d.id).slice(-4)}` : null,
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn', 'data-tip': 'შებრუნება',
            onclick: () => hx.onAction('flip') }, mkIcon('flip', 12)),
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          field('ტიპი',
            segControl({ value: d.type || typeOpts[0].value, options: typeOpts,
              onChange: v => hx.onField('type', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'სიგანე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.w, min: 300, max: 5000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('w', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'სიმაღლე ',
                h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.h, min: 300, max: 3500, step: 50, unit: 'მმ',
                onInput: v => hx.onField('h', v) })
            )
          ),
          kind === 'window' ? field(
            h('label', { class: 'ep-label' }, 'ცოკოლის სიმაღლე ',
              h('span', { class: 'ep-unit' }, '(იატაკიდან მმ)')),
            numInput({ value: d.sill != null ? d.sill : 900, min: 0, max: 2000, step: 50, unit: 'მმ',
              onInput: v => hx.onField('sill', v) })
          ) : null,
          kind === 'door' ? field('ხსნის მხარე',
            segControl({ value: d.swing || 'inner-left',
              options: [
                { value: 'inner-left', label: '↙' },
                { value: 'inner-right', label: '↘' },
                { value: 'outer-left', label: '↖' },
                { value: 'outer-right', label: '↗' }
              ],
              onChange: v => hx.onField('swing', v) })
          ) : null,
          kind === 'door' ? field('მდგომარეობა',
            segControl({ value: d.doorState || 'auto',
              options: [
                { value: 'auto', label: 'Auto' },
                { value: 'open', label: 'ღია' },
                { value: 'closed', label: 'დახურულ.' }
              ],
              onChange: v => hx.onField('doorState', v) })
          ) : null,
          kind === 'door' ? field('სახანძრო კლასი',
            selectInput({ value: d.fireRating || 'none',
              options: [
                { value: 'none', label: 'არა' },
                { value: 'ei30', label: 'EI 30' },
                { value: 'ei60', label: 'EI 60' },
                { value: 'ei90', label: 'EI 90' },
                { value: 'ei120', label: 'EI 120' }
              ],
              onChange: v => hx.onField('fireRating', v) })
          ) : null,
          kind === 'door' ? field('ევაკუაცია',
            toggle({ value: !!d.leadsOutside, label: 'გარეთ გასასვლელია',
              onChange: v => hx.onField('leadsOutside', v) })
          ) : null,
          kind === 'window' ? field('ჩარჩო',
            selectInput({ value: d.frame || 'pvc-white',
              options: [
                { value: 'pvc-white', label: 'PVC თეთრი' },
                { value: 'pvc-grey', label: 'PVC რუხი' },
                { value: 'alu', label: 'ალუმინი' },
                { value: 'wood', label: 'ხე' }
              ],
              onChange: v => hx.onField('frame', v) })
          ) : null,
          field(
            h('label', { class: 'ep-label' }, 'პოზიცია კედელზე ',
              h('span', { class: 'ep-unit' }, '(მ ბოლოდან)')),
            numInput({ value: d.pos != null ? d.pos : 0, min: 0, step: 0.05, unit: 'მ',
              onInput: v => hx.onField('pos', v) })
          )
        ].filter(Boolean)
      })
    );
  }

  renderers['sel:door'] = (c, x, hx) => renderOpeningPanel('door', c, x, hx);
  renderers['sel:window'] = (c, x, hx) => renderOpeningPanel('window', c, x, hx);

  // SEL:COLUMN
  renderers['sel:column'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'კოლონა',
        aux: d.id ? `#${String(d.id).slice(-4)}` : null,
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn', 'data-tip': 'ბრუნვა 90°',
            onclick: () => hx.onAction('rotate') }, mkIcon('rotate', 12)),
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          field('ფორმა',
            segControl({ value: d.shape || 'rect',
              options: [
                { value: 'rect', label: 'მართკუთხა' },
                { value: 'round', label: 'წრიული' },
                { value: 'l-shape', label: 'L' }
              ],
              onChange: v => hx.onField('shape', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'W ', h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.w, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('w', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'D ', h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.depth, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('depth', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'სიმაღლე ',
              h('span', { class: 'ep-unit' }, '(მ)')),
            numInput({ value: d.h, min: 1.5, max: 10, step: 0.1, unit: 'მ',
              onInput: v => hx.onField('h', v) })
          ),
          field(
            h('label', { class: 'ep-label' }, 'ბრუნვა ',
              h('span', { class: 'ep-unit' }, '(°)')),
            slider({ value: d.rot || 0, min: 0, max: 360, step: 15, unit: '°',
              onInput: v => hx.onField('rot', v) })
          ),
          field('მასალა',
            selectInput({ value: d.material || 'concrete',
              options: [
                { value: 'concrete', label: 'ბეტონი' },
                { value: 'steel', label: 'ფოლადი' },
                { value: 'brick', label: 'აგური' }
              ],
              onChange: v => hx.onField('material', v) })
          )
        ]
      })
    );
  };

  // SEL:JETFAN
  renderers['sel:jetfan'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'ჯეტ ფანი',
        aux: d.model || (d.id ? `#${String(d.id).slice(-4)}` : null),
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn', 'data-tip': 'ბრუნვა 90°',
            onclick: () => hx.onAction('rotate') }, mkIcon('rotate', 12)),
          h('button', { class: 'ep-iconbtn', 'data-tip': 'შებრუნება',
            onclick: () => hx.onAction('flip') }, mkIcon('flip', 12)),
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          field('ფორმა',
            segControl({ value: d.shape || 'round',
              options: [
                { value: 'round', label: 'წრიული' },
                { value: 'rect', label: 'მართკუთხა' }
              ],
              onChange: v => hx.onField('shape', v) })
          ),
          d.shape === 'rect'
            ? h('div', { class: 'ep-field-grid' },
                field(
                  h('label', { class: 'ep-label' }, 'W ', h('span', { class: 'ep-unit' }, '(მმ)')),
                  numInput({ value: d.w, min: 100, max: 2000, step: 10, unit: 'მმ',
                    onInput: v => hx.onField('w', v) })
                ),
                field(
                  h('label', { class: 'ep-label' }, 'H ', h('span', { class: 'ep-unit' }, '(მმ)')),
                  numInput({ value: d.h, min: 100, max: 2000, step: 10, unit: 'მმ',
                    onInput: v => hx.onField('h', v) })
                )
              )
            : field(
                h('label', { class: 'ep-label' }, 'დიამეტრი ',
                  h('span', { class: 'ep-unit' }, '(მმ)')),
                numInput({ value: d.dia, min: 200, max: 800, step: 10, unit: 'მმ',
                  onInput: v => hx.onField('dia', v) })
              ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'ბიძგი ', h('span', { class: 'ep-unit' }, '(N)')),
              numInput({ value: d.thrust, min: 10, max: 200, step: 5, unit: 'N',
                onInput: v => hx.onField('thrust', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'სიმძლ. ', h('span', { class: 'ep-unit' }, '(kW)')),
              numInput({ value: d.kw, min: 0.1, max: 20, step: 0.1, unit: 'kW',
                onInput: v => hx.onField('kw', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'ხარჯი ',
              h('span', { class: 'ep-unit' }, '(მ³/სთ)')),
            numInput({ value: d.flow, min: 1000, max: 50000, step: 500, unit: 'მ³/სთ',
              onInput: v => hx.onField('flow', v) })
          ),
          field(
            h('label', { class: 'ep-label' }, 'სიმაღლე იატაკიდან ',
              h('span', { class: 'ep-unit' }, '(მ)')),
            numInput({ value: d.zh != null ? d.zh : 2.5, min: 0.5, max: 6, step: 0.1, unit: 'მ',
              onInput: v => hx.onField('zh', v) })
          ),
          field(
            h('label', { class: 'ep-label' }, 'ორიენტაცია ',
              h('span', { class: 'ep-unit' }, '(°)')),
            slider({ value: d.rot || 0, min: 0, max: 359, step: 15, unit: '°',
              onInput: v => hx.onField('rot', v) })
          ),
          toggle({ value: !!d.reversible, label: 'რევერსიული',
            onChange: v => hx.onField('reversible', v) })
        ].filter(Boolean)
      })
    );
  };

  // SEL:EXHAUST
  renderers['sel:exhaust'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'გამწოვი',
        aux: d.id ? `#${String(d.id).slice(-4)}` : null,
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          field('ტიპი',
            selectInput({ value: d.type || 'grille',
              options: [
                { value: 'grille', label: 'ცხაური' },
                { value: 'duct', label: 'ქურთუკი' },
                { value: 'point', label: 'წერტილოვანი' }
              ],
              onChange: v => hx.onField('type', v) })
          ),
          h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'W ', h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.w, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('w', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'H ', h('span', { class: 'ep-unit' }, '(მმ)')),
              numInput({ value: d.h, min: 100, max: 2000, step: 50, unit: 'მმ',
                onInput: v => hx.onField('h', v) })
            )
          ),
          field(
            h('label', { class: 'ep-label' }, 'ხარჯი ',
              h('span', { class: 'ep-unit' }, '(მ³/სთ)')),
            numInput({ value: d.flow, min: 100, max: 50000, step: 100, unit: 'მ³/სთ',
              onInput: v => hx.onField('flow', v) })
          )
        ]
      })
    );
  };

  // SEL:ROOM
  renderers['sel:room'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: 'ოთახი',
        aux: d.area ? d.area.toFixed(2) + ' მ²' : null,
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          field('სახელი', textInput({
            value: d.name || '',
            placeholder: 'Unnamed',
            onInput: v => hx.onField('name', v)
          })),
          field('ტიპი',
            selectInput({ value: d.type || 'generic',
              options: [
                { value: 'generic', label: 'ზოგადი' },
                { value: 'living', label: 'მისაღები' },
                { value: 'bedroom', label: 'საძინებელი' },
                { value: 'kitchen', label: 'სამზარეულო' },
                { value: 'bathroom', label: 'სველი წერტ.' },
                { value: 'corridor', label: 'დერეფანი' },
                { value: 'stair', label: 'სადარბაზო' },
                { value: 'elevator', label: 'ლიფტის უჯრედი' },
                { value: 'parking', label: 'პარკინგი' },
                { value: 'tech', label: 'სატექნიკო' }
              ],
              onChange: v => hx.onField('type', v) })
          ),
          d.perim != null ? stat('პერიმეტრი', d.perim.toFixed(2) + ' მ') : null,
          d.volume != null ? stat('მოცულობა', d.volume.toFixed(2) + ' მ³') : null,
          d.type === 'parking' ? h('div', { class: 'ep-field-grid' },
            field(
              h('label', { class: 'ep-label' }, 'მანქანები'),
              numInput({ value: d.carCount, min: 0, max: 5000, step: 1,
                onInput: v => hx.onField('carCount', v) })
            ),
            field(
              h('label', { class: 'ep-label' }, 'ციკლი/სთ'),
              numInput({ value: d.carTurnoverPerHour, min: 0, max: 10, step: 0.05,
                onInput: v => hx.onField('carTurnoverPerHour', v) })
            )
          ) : null,
          d.type === 'parking' ? field(
            h('label', { class: 'ep-label' }, 'CO ',
              h('span', { class: 'ep-unit' }, '(გ/ციკლი)')),
            numInput({ value: d.coGramsPerCycle, min: 0, max: 500, step: 1, unit: 'გ',
              onInput: v => hx.onField('coGramsPerCycle', v) })
          ) : null,
          h('div', { class: 'ep-divider' }),
          toggle({ value: !!d.labelVisible, label: 'ლეიბლი ჩანს',
            onChange: v => hx.onField('labelVisible', v) }),
          toggle({ value: !!d.areaVisible, label: 'ფართის ჩვენება',
            onChange: v => hx.onField('areaVisible', v) })
        ].filter(Boolean)
      })
    );
  };

  // SEL:MULTI
  renderers['sel:multi'] = function (container, ctx, hx) {
    const d = ctx.data || {};
    container.innerHTML = '';
    container.appendChild(
      section({
        title: `${d.count || 2} ელემენტი`,
        collapsed: false,
        iconRow: [
          h('button', { class: 'ep-iconbtn', 'data-tip': 'გასწორება',
            onclick: () => hx.onAction('align') }, mkIcon('align', 12)),
          h('button', { class: 'ep-iconbtn', 'data-tip': 'დუბლირება',
            onclick: () => hx.onAction('duplicate') }, mkIcon('duplicate', 12)),
          h('button', { class: 'ep-iconbtn danger', 'data-tip': 'წაშლა',
            onclick: () => hx.onAction('delete') }, mkIcon('delete', 12))
        ],
        children: [
          h('div', { class: 'ep-hint' },
            'რამდენიმე ელემენტი მონიშნული — ჯგუფური ოპერაციები.'),
          h('div', { class: 'ep-btn-row' },
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('group') }, 'დაჯგუფება'),
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('align-left') }, '⇤ მარცხნივ'),
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('align-right') }, '⇥ მარჯვნივ'),
            h('button', { class: 'eng-btn', onclick: () => hx.onAction('distribute-h') }, '↔ განაწილება')
          )
        ]
      })
    );
  };

  // ─────────────────────────────────────────────── library section helper ──
  function libSection(title, items, selKey, hx) {
    const grid = h('div', { class: 'ep-lib-grid' });
    for (const it of items) {
      const card = h('button', {
        class: 'ep-lib-card' + (String(it.key) === String(selKey) ? ' active' : ''),
        onclick: () => hx.onLibPick && hx.onLibPick(it.key)
      },
        it.previewSvg
          ? h('div', { class: 'ep-lib-preview', html: it.previewSvg })
          : null,
        h('div', { class: 'ep-lib-name' }, it.name),
        it.meta ? h('div', { class: 'ep-lib-meta' }, it.meta) : null
      );
      grid.appendChild(card);
    }
    return section({
      title,
      aux: `${items.length}`,
      collapsed: false,
      children: [grid]
    });
  }

  // ─────────────────────────────────────────────── public API ──
  const EditorPanels = {
    render(container, ctx, handlers) {
      if (!container) return;
      const safe = {
        onField: (handlers && handlers.onField) || (() => {}),
        onAction: (handlers && handlers.onAction) || (() => {}),
        onLibPick: (handlers && handlers.onLibPick) || (() => {})
      };
      const type = (ctx && ctx.type) || 'empty';
      const fn = renderers[type];
      if (fn) fn(container, ctx || {}, safe);
      else empty(container, `უცნობი კონტექსტი: ${type}`);
    },

    ctxMenu(container, sel, handlers) {
      if (!container) return;
      // Clear existing
      let menu = container.querySelector(':scope > .ep-ctx');
      if (!sel) { if (menu) menu.remove(); return; }

      const safe = {
        onAction: (handlers && handlers.onAction) || (() => {})
      };

      if (!menu) {
        menu = document.createElement('div');
        menu.className = 'ep-ctx';
        container.appendChild(menu);
      }
      menu.innerHTML = '';

      if (sel.label) {
        menu.appendChild(h('span', { class: 'ep-ctx-label' }, sel.label));
      }

      const btns = sel.buttons || defaultCtxButtons(sel.kind);
      for (const b of btns) {
        if (b === 'sep') {
          menu.appendChild(h('span', { class: 'ep-ctx-sep' }));
          continue;
        }
        const btn = h('button', {
          class: b.danger ? 'danger' : '',
          'data-tip': b.tip || '',
          onclick: () => safe.onAction(b.action)
        }, mkIcon(b.icon, 14));
        menu.appendChild(btn);
      }

      // Position
      menu.style.left = (sel.x || 0) + 'px';
      menu.style.top = (sel.y || 0) + 'px';
    },

    registerType(type, fn) {
      renderers[type] = fn;
    },

    // Utility for consumers to build a library-card preview SVG inline
    makePreviewSvg(kind, opts) {
      return makePreview(kind, opts || {});
    },

    // Expose icons if needed externally
    icons: ICONS,

    // Low-level builders if consumer wants to assemble custom sections
    build: { h, field, numInput, textInput, selectInput, segControl, toggle, slider, stat, section, libSection, mkIcon }
  };

  function defaultCtxButtons(kind) {
    const common = [
      { icon: 'duplicate', action: 'duplicate', tip: 'დუბლირება (Ctrl+D)' },
      { icon: 'lock', action: 'lock-toggle', tip: 'ჩაკეტვა' },
      { icon: 'visible', action: 'visibility-toggle', tip: 'დამალვა' },
      'sep',
      { icon: 'delete', action: 'delete', tip: 'წაშლა (Del)', danger: true }
    ];
    if (kind === 'door' || kind === 'window') {
      return [{ icon: 'flip', action: 'flip', tip: 'შებრუნება' }, ...common];
    }
    if (kind === 'wall') {
      return [{ icon: 'flip', action: 'reverse', tip: 'მიმართულების შებრუნება' }, ...common];
    }
    if (kind === 'column' || kind === 'jetfan' || kind === 'exhaust') {
      return [{ icon: 'rotate', action: 'rotate', tip: 'ბრუნვა 90°' }, ...common];
    }
    return common;
  }

  function makePreview(kind, o) {
    const c = '#1f6fd4';
    switch (kind) {
      case 'wall':
        return `<svg width="100%" height="100%" viewBox="0 0 60 28" preserveAspectRatio="xMidYMid meet"><rect x="2" y="11" width="56" height="${o.thk || 6}" fill="${c}" opacity=".85"/></svg>`;
      case 'door':
        return `<svg width="100%" height="100%" viewBox="0 0 40 28"><path d="M4 22h32" stroke="#8faed0" stroke-width="2"/><path d="M8 22A20 20 0 0128 6" fill="none" stroke="${c}" stroke-width="1.4"/><line x1="8" y1="22" x2="28" y2="6" stroke="${c}" stroke-width="1.6"/></svg>`;
      case 'window':
        return `<svg width="100%" height="100%" viewBox="0 0 40 28"><rect x="6" y="10" width="28" height="8" fill="none" stroke="${c}" stroke-width="1.5"/><line x1="20" y1="10" x2="20" y2="18" stroke="${c}" stroke-width="1"/></svg>`;
      case 'column':
        return o.shape === 'round'
          ? `<svg width="100%" height="100%" viewBox="0 0 28 28"><circle cx="14" cy="14" r="8" fill="${c}" opacity=".85"/></svg>`
          : o.shape === 'rect'
            ? `<svg width="100%" height="100%" viewBox="0 0 28 28"><rect x="8" y="4" width="12" height="20" fill="${c}" opacity=".85"/></svg>`
            : o.shape === 'l-shape'
              ? `<svg width="100%" height="100%" viewBox="0 0 28 28"><path d="M6 6h16v5h-11v11H6z" fill="${c}" opacity=".85"/></svg>`
          : `<svg width="100%" height="100%" viewBox="0 0 28 28"><rect x="6" y="6" width="16" height="16" fill="${c}" opacity=".85"/></svg>`;
      case 'jetfan':
        return `<svg width="100%" height="100%" viewBox="0 0 48 28"><circle cx="14" cy="14" r="9" fill="none" stroke="${c}" stroke-width="1.6"/><path d="M14 6v16M6 14h16" stroke="${c}" stroke-width="1"/><path d="M25 14h18M40 11l3 3-3 3" fill="none" stroke="${c}" stroke-width="1.4"/></svg>`;
      case 'exhaust':
        if (o.family === 'ahu') {
          return `<svg width="100%" height="100%" viewBox="0 0 36 24"><rect x="3" y="5" width="30" height="14" fill="rgba(56,85,114,.12)" stroke="#385572" stroke-width="1.2"/><path d="M9 9h18M9 12h18M9 15h18" stroke="#385572" stroke-width=".9"/><text x="18" y="21" font-size="5" text-anchor="middle" fill="#385572" font-family="monospace">AHU</text></svg>`;
        }
        if (o.family === 'smoke-fan') {
          return `<svg width="100%" height="100%" viewBox="0 0 28 28"><rect x="4" y="4" width="20" height="20" fill="rgba(212,74,60,.12)" stroke="#d44a3c" stroke-width="1.4"/><circle cx="14" cy="14" r="3.2" fill="#d44a3c" opacity=".85"/><path d="M8 14h12M14 8v12" stroke="#d44a3c" stroke-width="1"/></svg>`;
        }
        if (o.shape === 'round') {
          return o.system === 'supply'
            ? `<svg width="100%" height="100%" viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M14 8v12M8 14h12" stroke="${c}" stroke-width="1.2"/></svg>`
            : `<svg width="100%" height="100%" viewBox="0 0 28 28"><circle cx="14" cy="14" r="9" fill="none" stroke="#4d6580" stroke-width="1.5"/><path d="M9 9l10 10M19 9L9 19" stroke="#4d6580" stroke-width="1.1"/></svg>`;
        }
        if (o.shape === 'rect') {
          return o.system === 'supply'
            ? `<svg width="100%" height="100%" viewBox="0 0 32 24"><rect x="4" y="5" width="24" height="14" fill="none" stroke="${c}" stroke-width="1.4"/><path d="M16 8v8M10 12h12" stroke="${c}" stroke-width="1.1"/></svg>`
            : `<svg width="100%" height="100%" viewBox="0 0 32 24"><rect x="4" y="5" width="24" height="14" fill="none" stroke="#4d6580" stroke-width="1.4"/><path d="M10 8l12 8M22 8l-12 8" stroke="#4d6580" stroke-width="1"/></svg>`;
        }
        return o.system === 'supply'
          ? `<svg width="100%" height="100%" viewBox="0 0 28 28"><rect x="4" y="4" width="20" height="20" fill="none" stroke="${c}" stroke-width="1.5"/><path d="M14 8v12M8 14h12" stroke="${c}" stroke-width="1"/></svg>`
          : `<svg width="100%" height="100%" viewBox="0 0 28 28"><rect x="4" y="4" width="20" height="20" fill="none" stroke="#4d6580" stroke-width="1.5"/><path d="M8 8l12 12M20 8l-12 12" stroke="#4d6580" stroke-width="1"/></svg>`;
      case 'furniture': {
        const k = (o.kind || '');
        const bg = '#b8a078';
        if (k === 'bed') return `<svg width="100%" height="100%" viewBox="0 0 36 24"><rect x="3" y="4" width="30" height="16" fill="${bg}" stroke="${c}" stroke-width=".8"/><rect x="5" y="5" width="10" height="5" fill="#fff"/></svg>`;
        if (k === 'sofa') return `<svg width="100%" height="100%" viewBox="0 0 36 24"><rect x="3" y="10" width="30" height="10" fill="${bg}" stroke="${c}" stroke-width=".8"/><rect x="3" y="4" width="30" height="6" fill="#988" opacity=".7"/></svg>`;
        if (k === 'table') return `<svg width="100%" height="100%" viewBox="0 0 36 24"><rect x="5" y="5" width="26" height="14" fill="${bg}" stroke="${c}" stroke-width=".8"/><path d="M8 12h20M18 6v12" stroke="${c}" stroke-width=".5" stroke-dasharray="1 1"/></svg>`;
        if (k === 'chair') return `<svg width="100%" height="100%" viewBox="0 0 28 28"><rect x="8" y="8" width="12" height="12" fill="${bg}" stroke="${c}" stroke-width=".8"/></svg>`;
        if (k === 'kitchen') return `<svg width="100%" height="100%" viewBox="0 0 40 20"><rect x="3" y="4" width="34" height="12" fill="#d0c8b8" stroke="${c}" stroke-width=".8"/><circle cx="12" cy="10" r="2.5" fill="none" stroke="${c}" stroke-width=".6"/><circle cx="28" cy="10" r="2.5" fill="none" stroke="${c}" stroke-width=".6"/></svg>`;
        if (k === 'wc') return `<svg width="100%" height="100%" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#e8ede5" stroke="${c}" stroke-width=".8"/><ellipse cx="12" cy="14" rx="5" ry="4" fill="#fff" stroke="${c}" stroke-width=".6"/></svg>`;
        if (k === 'sink') return `<svg width="100%" height="100%" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#d4dde6" stroke="${c}" stroke-width=".8"/><circle cx="12" cy="12" r="4.5" fill="#fff" stroke="${c}" stroke-width=".6"/></svg>`;
        if (k === 'shower') return `<svg width="100%" height="100%" viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" fill="#c8d8e4" stroke="${c}" stroke-width=".8"/><circle cx="12" cy="12" r="2" fill="${c}" opacity=".5"/></svg>`;
        return `<svg width="100%" height="100%" viewBox="0 0 28 18"><rect x="3" y="4" width="22" height="10" fill="${bg}" stroke="${c}" stroke-width=".8" rx="1"/></svg>`;
      }
      default:
        return '';
    }
  }

  global.EditorPanels = EditorPanels;
})(typeof window !== 'undefined' ? window : this);
