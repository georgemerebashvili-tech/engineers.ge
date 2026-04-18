/* engineers.ge — minimal DXF exporter (ASCII, AutoCAD R2000 / AC1015)
 *
 * Inverse of _dxf-parser.js. Takes wall-editor state and emits a DXF text
 * blob that AutoCAD, Revit, LibreCAD, QCAD can open.
 *
 * Emitted sections: HEADER (units, $EXTMIN/$EXTMAX), TABLES (LAYER table),
 * ENTITIES, EOF. Block/BlockRecord tables are intentionally omitted — we
 * emit all geometry as primitive entities (LINE / LWPOLYLINE / CIRCLE /
 * ARC / TEXT) so the file is parser-friendly and round-trips through our
 * own parser.
 *
 * Public API (attached to window.DxfExport):
 *   DxfExport.generate(state, opts) -> string
 *   DxfExport.triggerDownload(state, filename, opts)
 *
 * Units:
 *   opts.units = 'm' | 'mm' | 'cm'   → $INSUNITS 6 / 4 / 5
 *   opts.scale overrides the auto unit multiplier.
 *
 * Layer names default to WALLS/COLUMNS/OPENINGS/DOORS/WINDOWS/ROOMS/DIMS/
 * FURNITURE and can be overridden via opts.layers.
 */

(function (global) {
  'use strict';

  // ── DXF writer helpers ────────────────────────────────────────────────
  function W() { this.lines = []; }
  W.prototype.pair = function (code, value) {
    // group code: 3-char right-justified int per DXF spec (tolerant parsers
    // accept un-padded too). We emit plain int — matches our parser.
    this.lines.push(String(code));
    this.lines.push(String(value));
  };
  W.prototype.toString = function () {
    // DXF uses CRLF line endings; most parsers accept LF too. We use CRLF
    // for max compat.
    return this.lines.join('\r\n') + '\r\n';
  };

  function fmt(n) {
    if (!isFinite(n)) return '0';
    // 6 decimal places — enough for mm precision at km scale.
    const s = (+n).toFixed(6);
    // strip trailing zeros but keep at least one decimal
    return s.replace(/0+$/, '').replace(/\.$/, '.0');
  }

  // ── Geometry helpers ──────────────────────────────────────────────────
  function perpOffset(a, b, dist) {
    // Returns [a', b'] offset perpendicular by `dist` on the left side.
    const dx = b[0] - a[0], dy = b[1] - a[1];
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len, ny = dx / len;
    return [
      [a[0] + nx * dist, a[1] + ny * dist],
      [b[0] + nx * dist, b[1] + ny * dist],
    ];
  }

  function circleFrom3Points(a, b, c) {
    // For arc walls with apex — same math the parser uses.
    const ax = a[0], ay = a[1], bx = b[0], by = b[1], cx = c[0], cy = c[1];
    const d = 2 * (ax * (by - cy) + bx * (cy - ay) + cx * (ay - by));
    if (Math.abs(d) < 1e-9) return null;
    const ux = ((ax * ax + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d;
    const uy = ((ax * ax + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax - cx) + (cx * cx + cy * cy) * (bx - ax)) / d;
    const r = Math.hypot(ax - ux, ay - uy);
    const sa = Math.atan2(ay - uy, ax - ux) * 180 / Math.PI;
    const ea = Math.atan2(cy - uy, cx - ux) * 180 / Math.PI;
    return { cx: ux, cy: uy, r, sa, ea };
  }

  // ── Layer palette (AutoCAD Color Index) ───────────────────────────────
  const DEFAULT_LAYERS = {
    walls:     { name: 'WALLS',     aci: 7  }, // white/black
    columns:   { name: 'COLUMNS',   aci: 8  }, // dark grey
    openings:  { name: 'OPENINGS',  aci: 3  }, // green
    doors:     { name: 'DOORS',     aci: 4  }, // cyan
    windows:   { name: 'WINDOWS',   aci: 5  }, // blue
    rooms:     { name: 'ROOMS',     aci: 1  }, // red
    dims:      { name: 'DIMS',      aci: 2  }, // yellow
    furniture: { name: 'FURNITURE', aci: 6  }, // magenta
    fixtures:  { name: 'FIXTURES',  aci: 140 },
    fires:     { name: 'FIRES',     aci: 1  },
  };

  function resolveLayers(opts) {
    const out = {};
    for (const key of Object.keys(DEFAULT_LAYERS)) {
      const d = DEFAULT_LAYERS[key];
      const override = (opts && opts.layers && opts.layers[key]) || null;
      out[key] = {
        name: (typeof override === 'string' ? override : d.name),
        aci: d.aci,
      };
    }
    return out;
  }

  // ── Section writers ───────────────────────────────────────────────────
  function writeHeader(w, unitsCode, extmin, extmax) {
    w.pair(0, 'SECTION');
    w.pair(2, 'HEADER');
    w.pair(9, '$ACADVER'); w.pair(1, 'AC1015');
    w.pair(9, '$INSUNITS'); w.pair(70, unitsCode);
    w.pair(9, '$MEASUREMENT'); w.pair(70, 1); // 0=english, 1=metric
    w.pair(9, '$EXTMIN');
    w.pair(10, fmt(extmin[0])); w.pair(20, fmt(extmin[1])); w.pair(30, fmt(0));
    w.pair(9, '$EXTMAX');
    w.pair(10, fmt(extmax[0])); w.pair(20, fmt(extmax[1])); w.pair(30, fmt(0));
    w.pair(0, 'ENDSEC');
  }

  function writeTables(w, layers) {
    w.pair(0, 'SECTION');
    w.pair(2, 'TABLES');

    // LAYER table
    w.pair(0, 'TABLE');
    w.pair(2, 'LAYER');
    w.pair(70, Object.keys(layers).length + 1);

    // Default layer "0" — always present
    w.pair(0, 'LAYER');
    w.pair(2, '0');
    w.pair(70, 0);
    w.pair(62, 7);
    w.pair(6, 'CONTINUOUS');

    for (const key of Object.keys(layers)) {
      const L = layers[key];
      w.pair(0, 'LAYER');
      w.pair(2, L.name);
      w.pair(70, 0);
      w.pair(62, L.aci);
      w.pair(6, 'CONTINUOUS');
    }

    w.pair(0, 'ENDTAB');
    w.pair(0, 'ENDSEC');
  }

  // ── Entity writers ────────────────────────────────────────────────────
  function writeLine(w, layer, a, b, lineweight) {
    w.pair(0, 'LINE');
    w.pair(8, layer);
    if (lineweight != null) w.pair(370, lineweight); // 1/100 mm
    w.pair(10, fmt(a[0])); w.pair(20, fmt(a[1])); w.pair(30, fmt(0));
    w.pair(11, fmt(b[0])); w.pair(21, fmt(b[1])); w.pair(31, fmt(0));
  }

  function writeLwPolyline(w, layer, vertices, closed) {
    w.pair(0, 'LWPOLYLINE');
    w.pair(8, layer);
    w.pair(90, vertices.length);
    w.pair(70, closed ? 1 : 0);
    for (const v of vertices) {
      w.pair(10, fmt(v[0]));
      w.pair(20, fmt(v[1]));
    }
  }

  function writeCircle(w, layer, c, r) {
    w.pair(0, 'CIRCLE');
    w.pair(8, layer);
    w.pair(10, fmt(c[0])); w.pair(20, fmt(c[1])); w.pair(30, fmt(0));
    w.pair(40, fmt(r));
  }

  function writeArc(w, layer, c, r, sa, ea) {
    w.pair(0, 'ARC');
    w.pair(8, layer);
    w.pair(10, fmt(c[0])); w.pair(20, fmt(c[1])); w.pair(30, fmt(0));
    w.pair(40, fmt(r));
    w.pair(50, fmt(sa));
    w.pair(51, fmt(ea));
  }

  function writeText(w, layer, pos, height, text) {
    w.pair(0, 'TEXT');
    w.pair(8, layer);
    w.pair(10, fmt(pos[0])); w.pair(20, fmt(pos[1])); w.pair(30, fmt(0));
    w.pair(40, fmt(height));
    w.pair(1, String(text == null ? '' : text));
  }

  function writePoint(w, layer, pos) {
    w.pair(0, 'POINT');
    w.pair(8, layer);
    w.pair(10, fmt(pos[0])); w.pair(20, fmt(pos[1])); w.pair(30, fmt(0));
  }

  // ── Entity builders (from wall-editor state) ──────────────────────────
  function emitWalls(w, state, layers, S) {
    const walls = state.walls || [];
    for (const wall of walls) {
      if (!wall || !wall.start || !wall.end) continue;
      const a = [wall.start[0] * S, wall.start[1] * S];
      const b = [wall.end[0] * S, wall.end[1] * S];
      const thicknessM = +wall.thickness || 0.15;
      // lineweight is 1/100 mm (DXF spec) — thickness meters → *100000 would
      // be absurd; cap at real-world plotting values. AutoCAD uses values
      // like 25 (0.25mm), 50 (0.5mm). We'll map wall thickness to ~2.11 mm
      // max (code 211) which is the largest standard lineweight value.
      const lw = Math.min(211, Math.max(0, Math.round(thicknessM * 100))); // mm*100→code
      if (wall.kind === 'arc' && wall.apex) {
        const apex = [wall.apex[0] * S, wall.apex[1] * S];
        const c = circleFrom3Points(a, apex, b);
        if (c) {
          // Ensure arc goes the short way through the apex. DXF ARC sweeps
          // CCW from startAngle → endAngle. Compute apex angle; if not in
          // the CCW range, swap.
          const toDeg = (rad) => (rad * 180 / Math.PI);
          const apAngle = toDeg(Math.atan2(apex[1] - c.cy, apex[0] - c.cx));
          const norm = (x) => { x = x % 360; return x < 0 ? x + 360 : x; };
          let sa = norm(c.sa), ea = norm(c.ea), ap = norm(apAngle);
          // CCW sweep from sa to ea
          const inCCW = (sa <= ea) ? (ap >= sa && ap <= ea) : (ap >= sa || ap <= ea);
          if (!inCCW) { const t = sa; sa = ea; ea = t; }
          writeArc(w, layers.walls.name, [c.cx, c.cy], c.r, sa, ea);
          continue;
        }
      }
      writeLine(w, layers.walls.name, a, b, lw);
    }
  }

  function emitColumns(w, state, layers, S) {
    const columns = state.columns || [];
    for (const col of columns) {
      if (!col || !col.position) continue;
      const p = [col.position[0] * S, col.position[1] * S];
      const size = (+col.size || 0.4) * S;
      const rot = (+col.rotation || 0);
      const shape = col.shape || 'square';
      if (shape === 'round') {
        writeCircle(w, layers.columns.name, p, size / 2);
      } else if (shape === 'l-shape') {
        // L-shape: two overlapping rects forming an L (leg thickness ≈ 40%)
        const h = size, t = size * 0.4;
        const local = [
          [-h / 2, -h / 2],
          [ h / 2, -h / 2],
          [ h / 2, -h / 2 + t],
          [-h / 2 + t, -h / 2 + t],
          [-h / 2 + t,  h / 2],
          [-h / 2,  h / 2],
        ];
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const verts = local.map(([x, y]) => [
          p[0] + x * cos - y * sin,
          p[1] + x * sin + y * cos,
        ]);
        writeLwPolyline(w, layers.columns.name, verts, true);
      } else {
        // square
        const h = size / 2;
        const local = [[-h, -h], [h, -h], [h, h], [-h, h]];
        const cos = Math.cos(rot), sin = Math.sin(rot);
        const verts = local.map(([x, y]) => [
          p[0] + x * cos - y * sin,
          p[1] + x * sin + y * cos,
        ]);
        writeLwPolyline(w, layers.columns.name, verts, true);
      }
    }
  }

  function emitOpenings(w, state, layers, S) {
    const openings = state.openings || [];
    const walls = state.walls || [];
    const wallMap = new Map(walls.map(x => [x.id, x]));
    for (const op of openings) {
      if (!op || !op.wallId) continue;
      const wall = wallMap.get(op.wallId);
      if (!wall || !wall.start || !wall.end) continue;
      const a = wall.start, b = wall.end;
      const dx = b[0] - a[0], dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      if (len < 1e-6) continue;
      const ux = dx / len, uy = dy / len;
      const nx = -uy, ny = ux;
      const offset = +op.offset || 0;
      const width = +op.width || 0.9;
      const thick = (+wall.thickness || 0.15) / 2;
      // Opening endpoints along the wall centerline
      const p1 = [a[0] + ux * offset, a[1] + uy * offset];
      const p2 = [a[0] + ux * (offset + width), a[1] + uy * (offset + width)];
      // Wall edges at the opening
      const eA1 = [(p1[0] + nx * thick) * S, (p1[1] + ny * thick) * S];
      const eA2 = [(p1[0] - nx * thick) * S, (p1[1] - ny * thick) * S];
      const eB1 = [(p2[0] + nx * thick) * S, (p2[1] + ny * thick) * S];
      const eB2 = [(p2[0] - nx * thick) * S, (p2[1] - ny * thick) * S];

      const isDoor = (op.type === 'door');
      const layer = isDoor ? layers.doors.name : layers.windows.name;

      // Cap lines at both ends of opening
      writeLine(w, layer, eA1, eA2);
      writeLine(w, layer, eB1, eB2);

      if (isDoor) {
        // Door swing arc — 90° from hinge at p1, radius = width
        const hinge = [p1[0] * S, p1[1] * S];
        const radius = width * S;
        const baseAngle = Math.atan2(uy, ux) * 180 / Math.PI;
        // swing counter-clockwise from wall direction
        const sa = baseAngle;
        const ea = baseAngle + 90;
        writeArc(w, layer, hinge, radius, sa, ea);
        // leaf line (door blade) from hinge to end of swing
        const endLeaf = [
          hinge[0] + Math.cos(ea * Math.PI / 180) * radius,
          hinge[1] + Math.sin(ea * Math.PI / 180) * radius,
        ];
        writeLine(w, layer, hinge, endLeaf);
      } else {
        // Window: parallel lines down the middle of the wall (frame)
        const mid1 = [p1[0] * S, p1[1] * S];
        const mid2 = [p2[0] * S, p2[1] * S];
        writeLine(w, layer, mid1, mid2);
        // thin offset lines either side (glass panes)
        const innerT = thick * 0.4;
        writeLine(w, layer,
          [(p1[0] + nx * innerT) * S, (p1[1] + ny * innerT) * S],
          [(p2[0] + nx * innerT) * S, (p2[1] + ny * innerT) * S]);
        writeLine(w, layer,
          [(p1[0] - nx * innerT) * S, (p1[1] - ny * innerT) * S],
          [(p2[0] - nx * innerT) * S, (p2[1] - ny * innerT) * S]);
      }
    }
  }

  function emitRooms(w, state, layers, S) {
    const rooms = state.rooms || [];
    for (const room of rooms) {
      if (!room) continue;
      if (Array.isArray(room.polygon) && room.polygon.length >= 3) {
        const verts = room.polygon.map(v => [v[0] * S, v[1] * S]);
        writeLwPolyline(w, layers.rooms.name, verts, true);
      }
      const label = [
        room.name || room.type || 'Room',
        (room.area != null) ? `${(+room.area).toFixed(1)} m²` : null,
      ].filter(Boolean).join(' · ');
      let cx, cy;
      if (Array.isArray(room.centroid)) {
        cx = room.centroid[0]; cy = room.centroid[1];
      } else if (Array.isArray(room.polygon) && room.polygon.length) {
        cx = 0; cy = 0;
        for (const v of room.polygon) { cx += v[0]; cy += v[1]; }
        cx /= room.polygon.length; cy /= room.polygon.length;
      } else {
        continue;
      }
      writeText(w, layers.rooms.name, [cx * S, cy * S], 0.25 * S, label);
    }
  }

  function emitFurniture(w, state, layers, S) {
    const items = state.furniture || [];
    for (const it of items) {
      if (!it || !it.position) continue;
      const p = [it.position[0] * S, it.position[1] * S];
      const sx = ((+it.width) || 0.6) * S;
      const sy = ((+it.depth) || (+it.height) || 0.4) * S;
      const rot = +it.rotation || 0;
      const hx = sx / 2, hy = sy / 2;
      const local = [[-hx, -hy], [hx, -hy], [hx, hy], [-hx, hy]];
      const cos = Math.cos(rot), sin = Math.sin(rot);
      const verts = local.map(([x, y]) => [
        p[0] + x * cos - y * sin,
        p[1] + x * sin + y * cos,
      ]);
      writeLwPolyline(w, layers.furniture.name, verts, true);
      if (it.name || it.type) {
        writeText(w, layers.furniture.name, p, 0.15 * S, it.name || it.type);
      }
    }
  }

  function emitFixtures(w, state, layers, S) {
    const items = state.fixtures || [];
    for (const it of items) {
      if (!it || !it.position) continue;
      const p = [it.position[0] * S, it.position[1] * S];
      writePoint(w, layers.fixtures.name, p);
      if (it.name || it.type) {
        writeText(w, layers.fixtures.name, [p[0], p[1] + 0.1 * S], 0.12 * S, it.name || it.type);
      }
    }
  }

  function emitFires(w, state, layers, S) {
    const items = state.fires || [];
    for (const it of items) {
      if (!it || !it.position) continue;
      const p = [it.position[0] * S, it.position[1] * S];
      writePoint(w, layers.fires.name, p);
      writeText(w, layers.fires.name, [p[0], p[1] + 0.1 * S], 0.12 * S, it.name || it.type || 'fire');
    }
  }

  // ── Bounds computation ────────────────────────────────────────────────
  function computeBounds(state, S) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const push = (x, y) => {
      if (!isFinite(x) || !isFinite(y)) return;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    };
    for (const wall of (state.walls || [])) {
      if (wall.start) push(wall.start[0] * S, wall.start[1] * S);
      if (wall.end)   push(wall.end[0] * S,   wall.end[1] * S);
      if (wall.apex)  push(wall.apex[0] * S,  wall.apex[1] * S);
    }
    for (const c of (state.columns || [])) {
      if (c.position) push(c.position[0] * S, c.position[1] * S);
    }
    for (const r of (state.rooms || [])) {
      if (Array.isArray(r.polygon)) for (const v of r.polygon) push(v[0] * S, v[1] * S);
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }
    return { min: [minX, minY], max: [maxX, maxY] };
  }

  // ── Public API ────────────────────────────────────────────────────────
  function generate(state, opts) {
    state = state || {};
    opts = opts || {};
    const units = (opts.units || 'm').toLowerCase();
    const unitsCode = units === 'mm' ? 4 : units === 'cm' ? 5 : 6;
    // If scale not supplied, derive from units
    let S = (opts.scale != null)
      ? +opts.scale
      : (units === 'mm' ? 1000 : units === 'cm' ? 100 : 1);
    if (!isFinite(S) || S === 0) S = 1;

    const layers = resolveLayers(opts);
    const w = new W();

    const b = computeBounds(state, S);
    writeHeader(w, unitsCode, b.min, b.max);
    writeTables(w, layers);

    // ENTITIES section
    w.pair(0, 'SECTION');
    w.pair(2, 'ENTITIES');

    emitWalls(w, state, layers, S);
    emitColumns(w, state, layers, S);
    emitOpenings(w, state, layers, S);
    emitRooms(w, state, layers, S);
    emitFurniture(w, state, layers, S);
    emitFixtures(w, state, layers, S);
    emitFires(w, state, layers, S);

    w.pair(0, 'ENDSEC');
    w.pair(0, 'EOF');

    return w.toString();
  }

  function triggerDownload(state, filename, opts) {
    const text = generate(state, opts);
    const name = filename || 'floorplan.dxf';
    if (typeof global.Blob !== 'function' || typeof global.document === 'undefined') {
      return text; // headless context — just return
    }
    const blob = new global.Blob([text], { type: 'application/dxf' });
    const url = global.URL.createObjectURL(blob);
    const a = global.document.createElement('a');
    a.href = url;
    a.download = name;
    a.style.display = 'none';
    global.document.body.appendChild(a);
    a.click();
    global.setTimeout(() => {
      try { global.document.body.removeChild(a); } catch (_) {}
      try { global.URL.revokeObjectURL(url); } catch (_) {}
    }, 500);
    return text;
  }

  global.DxfExport = { generate, triggerDownload };
})(typeof window !== 'undefined' ? window : this);
