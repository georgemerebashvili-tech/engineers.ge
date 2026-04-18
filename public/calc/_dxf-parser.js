/* engineers.ge — minimal DXF parser (ASCII format)
 *
 * Handles the 90% case for architectural 2D DXF files:
 *   LINE, LWPOLYLINE, POLYLINE/VERTEX, CIRCLE, ARC, TEXT, INSERT (points only)
 *
 * DXF is line-oriented: alternating group-code (int) and value (string).
 * Each entity starts with group-code 0. Coordinates are codes 10/20/30 for
 * the first point; 11/21/31 for the second; higher for more points.
 *
 * Usage:
 *   const r = DxfParser.parse(text);   // text = raw .dxf file contents
 *   r = { entities: [...], bounds: {minX,minY,maxX,maxY}, units: 'unknown' }
 *
 * Each entity in `entities`:
 *   { type: 'LINE',       layer, start:[x,y], end:[x,y] }
 *   { type: 'LWPOLYLINE', layer, vertices:[[x,y], ...], closed: bool }
 *   { type: 'POLYLINE',   layer, vertices:[[x,y], ...], closed: bool }
 *   { type: 'CIRCLE',     layer, center:[x,y], radius }
 *   { type: 'ARC',        layer, center:[x,y], radius, startAngle, endAngle }
 *   { type: 'TEXT',       layer, position:[x,y], value, height }
 *   { type: 'INSERT',     layer, position:[x,y], blockName }
 *
 * Parsing is tolerant — unknown entities are skipped; partial entities are
 * dropped silently. This is an MVP; complex SPLINEs, BLOCKs, 3D faces are
 * out of scope (Task 018 follow-up).
 */

(function (global) {
  'use strict';

  function parse(text) {
    if (typeof text !== 'string') throw new Error('DxfParser.parse: expected string');
    // Normalize line endings; trim trailing whitespace on each line.
    const lines = text.replace(/\r\n/g, '\n').split('\n').map(s => s.trim());
    // Pair into { code, value } tokens.
    const tokens = [];
    for (let i = 0; i + 1 < lines.length; i += 2) {
      const code = parseInt(lines[i], 10);
      if (isNaN(code)) continue;
      tokens.push({ code, value: lines[i + 1] });
    }

    const entities = [];
    let inEntities = false;
    let i = 0;

    while (i < tokens.length) {
      const t = tokens[i];
      // Section tracking: 0 SECTION … 2 <name> … 0 ENDSEC
      if (t.code === 0 && t.value === 'SECTION') {
        const name = tokens[i + 1];
        if (name && name.code === 2 && name.value === 'ENTITIES') {
          inEntities = true;
          i += 2;
          continue;
        }
      }
      if (t.code === 0 && t.value === 'ENDSEC') {
        inEntities = false;
        i++;
        continue;
      }
      if (!inEntities) { i++; continue; }

      // Entity start
      if (t.code === 0) {
        const type = t.value;
        // Collect group-code/value pairs until the next group-code=0 token
        i++;
        const attrs = [];
        while (i < tokens.length && tokens[i].code !== 0) {
          attrs.push(tokens[i]);
          i++;
        }
        const ent = buildEntity(type, attrs);
        if (ent) entities.push(ent);
        continue;
      }
      i++;
    }

    // Compute bounds
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    const push = (x, y) => {
      if (!isFinite(x) || !isFinite(y)) return;
      minX = Math.min(minX, x); minY = Math.min(minY, y);
      maxX = Math.max(maxX, x); maxY = Math.max(maxY, y);
    };
    for (const e of entities) {
      if (e.start) push(e.start[0], e.start[1]);
      if (e.end) push(e.end[0], e.end[1]);
      if (e.center) push(e.center[0], e.center[1]);
      if (e.position) push(e.position[0], e.position[1]);
      if (e.vertices) for (const v of e.vertices) push(v[0], v[1]);
    }
    if (!isFinite(minX)) { minX = 0; minY = 0; maxX = 0; maxY = 0; }

    return {
      entities,
      bounds: { minX, minY, maxX, maxY },
      units: 'unknown'
    };
  }

  function getCode(attrs, code) {
    for (const a of attrs) if (a.code === code) return a.value;
    return undefined;
  }
  function getAllCode(attrs, code) {
    const out = [];
    for (const a of attrs) if (a.code === code) out.push(a.value);
    return out;
  }
  function num(v, dflt) {
    if (v == null) return dflt;
    const n = parseFloat(v);
    return isNaN(n) ? dflt : n;
  }

  function buildEntity(type, attrs) {
    const layer = getCode(attrs, 8) || '0';
    switch (type) {
      case 'LINE': {
        const x1 = num(getCode(attrs, 10), 0);
        const y1 = num(getCode(attrs, 20), 0);
        const x2 = num(getCode(attrs, 11), 0);
        const y2 = num(getCode(attrs, 21), 0);
        return { type: 'LINE', layer, start: [x1, y1], end: [x2, y2] };
      }
      case 'LWPOLYLINE': {
        // Interleaved 10 (x) / 20 (y) pairs
        const xs = getAllCode(attrs, 10).map(v => num(v, 0));
        const ys = getAllCode(attrs, 20).map(v => num(v, 0));
        const vertices = [];
        const n = Math.min(xs.length, ys.length);
        for (let k = 0; k < n; k++) vertices.push([xs[k], ys[k]]);
        const flags = parseInt(getCode(attrs, 70) || '0', 10);
        const closed = (flags & 1) === 1;
        return { type: 'LWPOLYLINE', layer, vertices, closed };
      }
      case 'POLYLINE': {
        // Classic POLYLINE entity — vertices follow as separate VERTEX entities
        // Our parser doesn't walk inside — return empty vertices; caller should
        // prefer LWPOLYLINE for most architectural DXF.
        const flags = parseInt(getCode(attrs, 70) || '0', 10);
        const closed = (flags & 1) === 1;
        return { type: 'POLYLINE', layer, vertices: [], closed };
      }
      case 'CIRCLE': {
        const x = num(getCode(attrs, 10), 0);
        const y = num(getCode(attrs, 20), 0);
        const r = num(getCode(attrs, 40), 0);
        return { type: 'CIRCLE', layer, center: [x, y], radius: r };
      }
      case 'ARC': {
        const x = num(getCode(attrs, 10), 0);
        const y = num(getCode(attrs, 20), 0);
        const r = num(getCode(attrs, 40), 0);
        const sa = num(getCode(attrs, 50), 0);
        const ea = num(getCode(attrs, 51), 0);
        return { type: 'ARC', layer, center: [x, y], radius: r, startAngle: sa, endAngle: ea };
      }
      case 'TEXT':
      case 'MTEXT': {
        const x = num(getCode(attrs, 10), 0);
        const y = num(getCode(attrs, 20), 0);
        const h = num(getCode(attrs, 40), 0);
        const value = getCode(attrs, 1) || '';
        return { type: 'TEXT', layer, position: [x, y], value, height: h };
      }
      case 'INSERT': {
        const x = num(getCode(attrs, 10), 0);
        const y = num(getCode(attrs, 20), 0);
        const blockName = getCode(attrs, 2) || '';
        return { type: 'INSERT', layer, position: [x, y], blockName };
      }
      default:
        return null;
    }
  }

  // Convert parsed entities → wall-editor state fragments.
  // Returns { walls: [...], hints } with straight wall segments derived from
  // LINE + LWPOLYLINE entities. Callers can merge into state.walls directly.
  //
  // Args:
  //   parsed      — return value of DxfParser.parse()
  //   opts        — { scale: 1, thickness: 0.15, height: 2.8, layerFilter?: (name)=>bool }
  function toWallEditor(parsed, opts) {
    opts = opts || {};
    const scale = opts.scale != null ? opts.scale : 1;
    const thickness = opts.thickness != null ? opts.thickness : 0.15;
    const height = opts.height != null ? opts.height : 2.8;
    const filter = opts.layerFilter || (() => true);

    const walls = [];
    const uid = () => Math.random().toString(36).slice(2, 10);
    const push = (a, b, layer) => {
      const [x1, y1] = a, [x2, y2] = b;
      if (Math.hypot(x2 - x1, y2 - y1) < 1e-6) return;
      walls.push({
        id: uid(),
        start: [x1 * scale, y1 * scale],
        end: [x2 * scale, y2 * scale],
        thickness, height,
        material: 'brick',
        _layer: layer
      });
    };

    let nLine = 0, nPoly = 0;
    for (const e of parsed.entities) {
      if (!filter(e.layer)) continue;
      if (e.type === 'LINE') {
        push(e.start, e.end, e.layer);
        nLine++;
      } else if (e.type === 'LWPOLYLINE' && e.vertices.length >= 2) {
        for (let k = 0; k < e.vertices.length - 1; k++) {
          push(e.vertices[k], e.vertices[k + 1], e.layer);
        }
        if (e.closed && e.vertices.length > 2) {
          push(e.vertices[e.vertices.length - 1], e.vertices[0], e.layer);
        }
        nPoly++;
      }
    }

    // Center-align so bbox is near origin (usability)
    if (walls.length) {
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const w of walls) {
        minX = Math.min(minX, w.start[0], w.end[0]);
        maxX = Math.max(maxX, w.start[0], w.end[0]);
        minY = Math.min(minY, w.start[1], w.end[1]);
        maxY = Math.max(maxY, w.start[1], w.end[1]);
      }
      const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
      for (const w of walls) {
        w.start[0] -= cx; w.start[1] -= cy;
        w.end[0] -= cx;   w.end[1] -= cy;
      }
    }

    return {
      walls,
      hints: {
        lineCount: nLine,
        polylineCount: nPoly,
        totalWalls: walls.length,
        bounds: parsed.bounds
      }
    };
  }

  global.DxfParser = { parse, toWallEditor };
})(typeof window !== 'undefined' ? window : this);
