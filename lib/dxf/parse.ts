import type {
  IDxf,
  IArcEntity,
  ICircleEntity,
  IEntity,
  IInsertEntity,
  ILineEntity,
  ILwpolylineEntity,
  IMtextEntity,
  IPoint,
  IPolylineEntity,
  ITextEntity
} from 'dxf-parser';

export type DxfUnit = 'unitless' | 'mm' | 'cm' | 'm' | 'in' | 'ft';
export type DxfClassification =
  | 'wall'
  | 'door'
  | 'window'
  | 'furniture'
  | 'annotation'
  | null;

export type Vec3 = {x: number; y: number; z: number};

export type DxfGeometry =
  | {
      kind: 'line';
      points: Vec3[];
    }
  | {
      kind: 'polyline';
      points: Vec3[];
      closed: boolean;
    }
  | {
      kind: 'circle';
      center: Vec3;
      radius: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
    }
  | {
      kind: 'arc';
      center: Vec3;
      radius: number;
      startAngle: number;
      endAngle: number;
      rotation: number;
      scaleX: number;
      scaleY: number;
    }
  | {
      kind: 'text';
      position: Vec3;
      text: string;
      height: number;
      rotation: number;
    };

export type DxfEntityType =
  | 'LINE'
  | 'LWPOLYLINE'
  | 'POLYLINE'
  | 'CIRCLE'
  | 'ARC'
  | 'TEXT'
  | 'MTEXT';

export type DxfEntity = {
  id: string;
  type: DxfEntityType;
  layer: string;
  handle: string;
  color: number;
  geometry: DxfGeometry;
  classification?: DxfClassification;
};

export type DxfLayer = {
  name: string;
  color: number;
  colorHex: string;
  visible: boolean;
  count: number;
};

export type DxfLoaded = {
  hash: string;
  filename: string;
  bounds: {min: Vec3; max: Vec3};
  entities: DxfEntity[];
  layers: DxfLayer[];
  unit: DxfUnit;
  warnings: string[];
};

type InsertTransform = {
  tx: number;
  ty: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
};

type ClassificationCache = Record<string, DxfClassification>;
type ClassificationCacheStore = Record<string, ClassificationCache>;

const CLASSIFICATION_CACHE_KEY = 'eng_dxf_classifications_v1';
const INSUNITS_TO_UNIT: Record<number, DxfUnit> = {
  0: 'unitless',
  1: 'in',
  2: 'ft',
  4: 'mm',
  5: 'cm',
  6: 'm'
};
const UNIT_TO_METERS: Record<DxfUnit, number> = {
  unitless: 1,
  mm: 0.001,
  cm: 0.01,
  m: 1,
  in: 0.0254,
  ft: 0.3048
};

function emptyBounds() {
  return {
    min: {x: Number.POSITIVE_INFINITY, y: Number.POSITIVE_INFINITY, z: Number.POSITIVE_INFINITY},
    max: {x: Number.NEGATIVE_INFINITY, y: Number.NEGATIVE_INFINITY, z: Number.NEGATIVE_INFINITY}
  };
}

function touchBounds(bounds: {min: Vec3; max: Vec3}, point: Vec3) {
  bounds.min.x = Math.min(bounds.min.x, point.x);
  bounds.min.y = Math.min(bounds.min.y, point.y);
  bounds.min.z = Math.min(bounds.min.z, point.z);
  bounds.max.x = Math.max(bounds.max.x, point.x);
  bounds.max.y = Math.max(bounds.max.y, point.y);
  bounds.max.z = Math.max(bounds.max.z, point.z);
}

function finalizeBounds(bounds: {min: Vec3; max: Vec3}) {
  if (!Number.isFinite(bounds.min.x)) {
    return {
      min: {x: -10, y: 0, z: -10},
      max: {x: 10, y: 0, z: 10}
    };
  }

  return bounds;
}

function round(value: number) {
  return Number(value.toFixed(4));
}

function colorToHex(color: number) {
  const safe = Number.isFinite(color) && color >= 0 ? color : 0x7c90b1;
  return `#${safe.toString(16).padStart(6, '0')}`;
}

function readClassificationStore(): ClassificationCacheStore {
  if (typeof window === 'undefined') return {};

  try {
    const raw = window.localStorage.getItem(CLASSIFICATION_CACHE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as ClassificationCacheStore;
  } catch {
    return {};
  }
}

export function readDxfClassificationCache(hash: string): ClassificationCache {
  return readClassificationStore()[hash] ?? {};
}

export function writeDxfClassificationCache(hash: string, next: ClassificationCache) {
  if (typeof window === 'undefined') return;

  try {
    const store = readClassificationStore();
    store[hash] = next;
    window.localStorage.setItem(CLASSIFICATION_CACHE_KEY, JSON.stringify(store));
  } catch {
    // Ignore storage failures and keep DXF parsing functional.
  }
}

function stripMText(value: string) {
  return value
    .replaceAll('\\P', ' ')
    .replaceAll('{', '')
    .replaceAll('}', '')
    .replaceAll('\\~', ' ')
    .trim();
}

function nextId(prefix: string, index: number, handle: string) {
  return `${prefix.toLowerCase()}-${handle || 'anon'}-${index}`;
}

function rotatePoint(x: number, y: number, rotation: number) {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: x * cos - y * sin,
    y: x * sin + y * cos
  };
}

function applyTransform(point: IPoint, transform: InsertTransform, scaleToMeters: number): Vec3 {
  const scaledX = point.x * transform.scaleX;
  const scaledY = point.y * transform.scaleY;
  const rotated = rotatePoint(scaledX, scaledY, transform.rotation);

  return {
    x: round((rotated.x + transform.tx) * scaleToMeters),
    y: 0,
    z: round((rotated.y + transform.ty) * scaleToMeters)
  };
}

function combineTransform(base: InsertTransform, insert: IInsertEntity): InsertTransform {
  const origin = rotatePoint(
    (insert.position?.x ?? 0) * base.scaleX,
    (insert.position?.y ?? 0) * base.scaleY,
    base.rotation
  );

  return {
    tx: base.tx + origin.x,
    ty: base.ty + origin.y,
    scaleX: base.scaleX * (insert.xScale || 1),
    scaleY: base.scaleY * (insert.yScale || 1),
    rotation: base.rotation + ((insert.rotation || 0) * Math.PI) / 180
  };
}

function sampleArcPoints(
  center: Vec3,
  radius: number,
  startAngle: number,
  endAngle: number,
  rotation: number,
  scaleX: number,
  scaleY: number,
  closed: boolean
) {
  const points: Vec3[] = [];
  const total = Math.abs(endAngle - startAngle) || Math.PI * 2;
  const steps = Math.max(16, Math.ceil((total / (Math.PI * 2)) * 64));

  for (let index = 0; index <= steps; index += 1) {
    if (closed && index === steps) break;
    const angle = startAngle + (total * index) / steps;
    const local = rotatePoint(
      Math.cos(angle) * radius * scaleX,
      Math.sin(angle) * radius * scaleY,
      rotation
    );
    points.push({
      x: round(center.x + local.x),
      y: 0,
      z: round(center.z + local.y)
    });
  }

  return points;
}

async function sha256Hex(value: string) {
  if (typeof crypto?.subtle !== 'undefined') {
    const bytes = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(index);
    hash |= 0;
  }
  return `fallback-${Math.abs(hash)}`;
}

function inferUnit(raw: IDxf) {
  const code = Number(raw.header?.$INSUNITS ?? 0);
  const unit = INSUNITS_TO_UNIT[code] ?? 'unitless';

  return {
    unit,
    scaleToMeters: UNIT_TO_METERS[unit]
  };
}

function pushWarning(list: string[], message: string) {
  if (list.includes(message)) return;
  list.push(message);
  console.warn(`[dxf] ${message}`);
}

function explodeInsert(
  entity: IInsertEntity,
  raw: IDxf,
  transform: InsertTransform,
  scaleToMeters: number,
  warnings: string[],
  classify: ClassificationCache,
  ids: {value: number}
): DxfEntity[] {
  const block = raw.blocks?.[entity.name];
  if (!block) {
    pushWarning(warnings, `BLOCK "${entity.name}" ვერ მოიძებნა INSERT "${entity.handle}"-ისთვის.`);
    return [];
  }

  const baseTransform = combineTransform(transform, entity);
  const rows = Math.max(1, entity.rowCount || 1);
  const cols = Math.max(1, entity.columnCount || 1);
  const flattened: DxfEntity[] = [];

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const offsetDelta = rotatePoint(
        col * (entity.columnSpacing || 0) * baseTransform.scaleX,
        row * (entity.rowSpacing || 0) * baseTransform.scaleY,
        baseTransform.rotation
      );
      const offset = {
        ...baseTransform,
        tx: baseTransform.tx + offsetDelta.x,
        ty: baseTransform.ty + offsetDelta.y
      };
      block.entities.forEach((child) => {
        flattened.push(
          ...normalizeEntity(child, raw, offset, scaleToMeters, warnings, classify, ids, entity.layer || child.layer)
        );
      });
    }
  }

  return flattened;
}

function normalizeEntity(
  entity: IEntity,
  raw: IDxf,
  transform: InsertTransform,
  scaleToMeters: number,
  warnings: string[],
  classify: ClassificationCache,
  ids: {value: number},
  forcedLayer?: string
): DxfEntity[] {
  const handle = String(entity.handle ?? `anon-${ids.value}`);
  const layer = forcedLayer || entity.layer || '0';
  const color = Number.isFinite(entity.color) && entity.color > 0 ? entity.color : raw.tables?.layer?.layers?.[layer]?.color || 0x7c90b1;
  const classification = classify[handle] ?? null;
  const base = {
    layer,
    handle,
    color,
    classification
  };

  switch (entity.type) {
    case 'LINE': {
      const line = entity as ILineEntity;
      return [
        {
          ...base,
          id: nextId('line', ids.value++, handle),
          type: 'LINE',
          geometry: {
            kind: 'line',
            points: line.vertices.map((point) => applyTransform(point, transform, scaleToMeters))
          }
        }
      ];
    }
    case 'LWPOLYLINE': {
      const polyline = entity as ILwpolylineEntity;
      return [
        {
          ...base,
          id: nextId('lwpolyline', ids.value++, handle),
          type: 'LWPOLYLINE',
          geometry: {
            kind: 'polyline',
            points: polyline.vertices.map((point) =>
              applyTransform({x: point.x, y: point.y, z: point.z ?? 0}, transform, scaleToMeters)
            ),
            closed: Boolean(polyline.shape)
          }
        }
      ];
    }
    case 'POLYLINE': {
      const polyline = entity as IPolylineEntity;
      return [
        {
          ...base,
          id: nextId('polyline', ids.value++, handle),
          type: 'POLYLINE',
          geometry: {
            kind: 'polyline',
            points: polyline.vertices.map((point) => applyTransform(point, transform, scaleToMeters)),
            closed: Boolean(polyline.shape)
          }
        }
      ];
    }
    case 'CIRCLE': {
      const circle = entity as ICircleEntity;
      return [
        {
          ...base,
          id: nextId('circle', ids.value++, handle),
          type: 'CIRCLE',
          geometry: {
            kind: 'circle',
            center: applyTransform(circle.center, transform, scaleToMeters),
            radius: round(circle.radius * scaleToMeters),
            rotation: transform.rotation,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY
          }
        }
      ];
    }
    case 'ARC': {
      const arc = entity as IArcEntity;
      return [
        {
          ...base,
          id: nextId('arc', ids.value++, handle),
          type: 'ARC',
          geometry: {
            kind: 'arc',
            center: applyTransform(arc.center, transform, scaleToMeters),
            radius: round(arc.radius * scaleToMeters),
            startAngle: arc.startAngle,
            endAngle: arc.endAngle,
            rotation: transform.rotation,
            scaleX: transform.scaleX,
            scaleY: transform.scaleY
          }
        }
      ];
    }
    case 'TEXT': {
      const text = entity as ITextEntity;
      return [
        {
          ...base,
          id: nextId('text', ids.value++, handle),
          type: 'TEXT',
          geometry: {
            kind: 'text',
            position: applyTransform(text.startPoint, transform, scaleToMeters),
            text: text.text.trim(),
            height: round(Math.max(0.2, text.textHeight * scaleToMeters)),
            rotation: transform.rotation + ((text.rotation || 0) * Math.PI) / 180
          }
        }
      ];
    }
    case 'MTEXT': {
      const text = entity as IMtextEntity;
      return [
        {
          ...base,
          id: nextId('mtext', ids.value++, handle),
          type: 'MTEXT',
          geometry: {
            kind: 'text',
            position: applyTransform(text.position, transform, scaleToMeters),
            text: stripMText(text.text),
            height: round(Math.max(0.2, text.height * scaleToMeters)),
            rotation: transform.rotation + ((text.rotation || 0) * Math.PI) / 180
          }
        }
      ];
    }
    case 'INSERT':
      return explodeInsert(
        entity as IInsertEntity,
        raw,
        transform,
        scaleToMeters,
        warnings,
        classify,
        ids
      );
    default:
      pushWarning(warnings, `Entity "${entity.type}" ჯერ არ არის მხარდაჭერილი და გამოტოვდა.`);
      return [];
  }
}

function updateBoundsForEntity(bounds: {min: Vec3; max: Vec3}, entity: DxfEntity) {
  switch (entity.geometry.kind) {
    case 'line':
    case 'polyline':
      entity.geometry.points.forEach((point) => touchBounds(bounds, point));
      break;
    case 'circle':
      sampleArcPoints(
        entity.geometry.center,
        entity.geometry.radius,
        0,
        Math.PI * 2,
        entity.geometry.rotation,
        entity.geometry.scaleX,
        entity.geometry.scaleY,
        true
      ).forEach((point) => touchBounds(bounds, point));
      break;
    case 'arc':
      sampleArcPoints(
        entity.geometry.center,
        entity.geometry.radius,
        entity.geometry.startAngle,
        entity.geometry.endAngle,
        entity.geometry.rotation,
        entity.geometry.scaleX,
        entity.geometry.scaleY,
        false
      ).forEach((point) => touchBounds(bounds, point));
      break;
    case 'text':
      touchBounds(bounds, entity.geometry.position);
      break;
  }
}

export function arcToPoints(entity: DxfEntity) {
  if (entity.geometry.kind === 'circle') {
    return sampleArcPoints(
      entity.geometry.center,
      entity.geometry.radius,
      0,
      Math.PI * 2,
      entity.geometry.rotation,
      entity.geometry.scaleX,
      entity.geometry.scaleY,
      true
    );
  }

  if (entity.geometry.kind !== 'arc') {
    return [];
  }

  return sampleArcPoints(
    entity.geometry.center,
    entity.geometry.radius,
    entity.geometry.startAngle,
    entity.geometry.endAngle,
    entity.geometry.rotation,
    entity.geometry.scaleX,
    entity.geometry.scaleY,
    false
  );
}

export async function parseDxfText(source: string, filename: string): Promise<DxfLoaded> {
  const [{default: DxfParser}, hash] = await Promise.all([import('dxf-parser'), sha256Hex(source)]);
  const parser = new DxfParser();
  const raw = parser.parseSync(source);

  if (!raw) {
    throw new Error('DXF ვერ დაიპარსა.');
  }

  const {unit, scaleToMeters} = inferUnit(raw);
  const classificationCache = readDxfClassificationCache(hash);
  const warnings: string[] = [];
  const ids = {value: 0};
  const entities = raw.entities.flatMap((entity) =>
    normalizeEntity(
      entity,
      raw,
      {tx: 0, ty: 0, scaleX: 1, scaleY: 1, rotation: 0},
      scaleToMeters,
      warnings,
      classificationCache,
      ids
    )
  );
  const bounds = emptyBounds();

  entities.forEach((entity) => updateBoundsForEntity(bounds, entity));

  const layerCounts = new Map<string, number>();
  entities.forEach((entity) => {
    layerCounts.set(entity.layer, (layerCounts.get(entity.layer) ?? 0) + 1);
  });

  const rawLayers = raw.tables?.layer?.layers ?? {};
  const layers = Array.from(
    new Set([...Object.keys(rawLayers), ...entities.map((entity) => entity.layer)])
  )
    .map((name) => {
      const layer = rawLayers[name];
      return {
        name,
        color: layer?.color ?? 0x7c90b1,
        colorHex: colorToHex(layer?.color ?? 0x7c90b1),
        visible: layer?.visible ?? true,
        count: layerCounts.get(name) ?? 0
      };
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  return {
    hash,
    filename,
    bounds: finalizeBounds(bounds),
    entities,
    layers,
    unit,
    warnings
  };
}
