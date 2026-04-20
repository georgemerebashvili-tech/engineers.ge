import type {DxfClassification, DxfEntity, DxfLoaded, Vec3} from './parse';

export type DxfClassificationFilter =
  | 'all'
  | 'wall'
  | 'door'
  | 'window'
  | 'furniture'
  | 'annotation'
  | 'ambiguous';

export type ClassificationStats = {
  total: number;
  wall: number;
  door: number;
  window: number;
  furniture: number;
  annotation: number;
  ambiguous: number;
};

export type ClassificationResult = {
  entities: DxfEntity[];
  classified: DxfEntity[];
  ambiguous: DxfEntity[];
  stats: ClassificationStats;
  cache: Record<string, DxfClassification>;
  layerStats: Record<string, ClassificationStats>;
};

type Segment = {
  entityId: string;
  handle: string;
  layer: string;
  start: Vec3;
  end: Vec3;
  length: number;
  angleDeg: number;
};

const WALL_LAYER_RE = /^(A[-_]?)?(WALL|WALLS|WAL|WND|კედ|СТЕН|MUR|WAND|MURO|PAR[-_]?EXT)/i;
const DOOR_LAYER_RE = /^(A[-_]?)?(DOOR|DRS|კარ|ДВЕР|PORTE|TUR|PUERTA)/i;
const WINDOW_LAYER_RE = /^(A[-_]?)?(WIN|GLZ|ფან|ОКН|FENETRE|FENSTER|VENTANA)/i;
const FURN_LAYER_RE = /^(A[-_]?)?(FURN|EQUIP|ავ|МЕБ|MOBIL|MOBEL)/i;
const DIM_LAYER_RE = /^(A[-_]?)?(DIM|ANNO|TEXT|NOTE|ნიშ|РАЗМ)/i;

const PARALLEL_ANGLE_TOLERANCE = 1;
const MIN_WALL_THICKNESS = 0.05;
const MAX_WALL_THICKNESS = 0.5;
const MIN_OVERLAP_RATIO = 0.6;
const MIN_DOOR_LINE = 0.2;
const MAX_DOOR_LINE = 1.5;
const DOOR_WALL_DISTANCE = 0.35;
const DOOR_ANGLE_TOLERANCE = 20;
const MIN_DOOR_ARC_RADIUS = 0.25;
const MAX_DOOR_ARC_RADIUS = 1.5;

function emptyStats(): ClassificationStats {
  return {
    total: 0,
    wall: 0,
    door: 0,
    window: 0,
    furniture: 0,
    annotation: 0,
    ambiguous: 0
  };
}

function classificationFromLayer(layer: string): DxfClassification {
  if (WALL_LAYER_RE.test(layer)) return 'wall';
  if (DOOR_LAYER_RE.test(layer)) return 'door';
  if (WINDOW_LAYER_RE.test(layer)) return 'window';
  if (FURN_LAYER_RE.test(layer)) return 'furniture';
  if (DIM_LAYER_RE.test(layer)) return 'annotation';
  return null;
}

function entityMatchesFilter(entity: DxfEntity, filter: DxfClassificationFilter) {
  if (filter === 'all') return true;
  if (filter === 'ambiguous') return !entity.classification;
  return entity.classification === filter;
}

function withClassification(entity: DxfEntity, classification: DxfClassification): DxfEntity {
  return {
    ...entity,
    classification
  };
}

function normalizeAngle(angleDeg: number) {
  let normalized = angleDeg % 180;
  if (normalized < 0) normalized += 180;
  return normalized;
}

function angleDelta(left: number, right: number) {
  const diff = Math.abs(normalizeAngle(left) - normalizeAngle(right));
  return Math.min(diff, 180 - diff);
}

function subtract(a: Vec3, b: Vec3): Vec3 {
  return {x: a.x - b.x, y: a.y - b.y, z: a.z - b.z};
}

function dot(a: Vec3, b: Vec3) {
  return a.x * b.x + a.z * b.z;
}

function length(vector: Vec3) {
  return Math.hypot(vector.x, vector.z);
}

function distance(a: Vec3, b: Vec3) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function midpoint(a: Vec3, b: Vec3): Vec3 {
  return {
    x: (a.x + b.x) / 2,
    y: 0,
    z: (a.z + b.z) / 2
  };
}

function makeSegment(entity: DxfEntity, start: Vec3, end: Vec3): Segment | null {
  const vector = subtract(end, start);
  const segmentLength = length(vector);
  if (segmentLength <= 0.0001) return null;

  return {
    entityId: entity.id,
    handle: entity.handle,
    layer: entity.layer,
    start,
    end,
    length: segmentLength,
    angleDeg: normalizeAngle((Math.atan2(vector.z, vector.x) * 180) / Math.PI)
  };
}

function entitySegments(entity: DxfEntity): Segment[] {
  if (entity.geometry.kind === 'line') {
    const [start, end] = entity.geometry.points;
    return start && end ? [makeSegment(entity, start, end)].filter(Boolean) as Segment[] : [];
  }

  if (entity.geometry.kind !== 'polyline') {
    return [];
  }

  const points = entity.geometry.points;
  const segments: Segment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    const segment = makeSegment(entity, points[index], points[index + 1]);
    if (segment) segments.push(segment);
  }
  if (entity.geometry.closed && points.length > 2) {
    const segment = makeSegment(entity, points[points.length - 1], points[0]);
    if (segment) segments.push(segment);
  }
  return segments;
}

function pointToSegmentDistance(point: Vec3, segment: Segment) {
  const base = subtract(segment.end, segment.start);
  const span = dot(base, base);
  if (span <= 0.000001) {
    return distance(point, segment.start);
  }

  const ratio = Math.max(0, Math.min(1, dot(subtract(point, segment.start), base) / span));
  const closest = {
    x: segment.start.x + base.x * ratio,
    y: 0,
    z: segment.start.z + base.z * ratio
  };
  return distance(point, closest);
}

function lineIntervalsOverlap(left: Segment, right: Segment) {
  const direction = subtract(left.end, left.start);
  const directionLength = length(direction);
  if (directionLength <= 0.000001) return 0;

  const unit = {
    x: direction.x / directionLength,
    y: 0,
    z: direction.z / directionLength
  };

  const leftRange = [dot(left.start, unit), dot(left.end, unit)].sort((a, b) => a - b);
  const rightRange = [dot(right.start, unit), dot(right.end, unit)].sort((a, b) => a - b);
  return Math.max(0, Math.min(leftRange[1], rightRange[1]) - Math.max(leftRange[0], rightRange[0]));
}

function segmentSeparation(left: Segment, right: Segment) {
  return pointToSegmentDistance(midpoint(right.start, right.end), left);
}

function gatherLineSegments(entities: DxfEntity[], predicate?: (entity: DxfEntity) => boolean) {
  return entities.flatMap((entity) => {
    if (entity.geometry.kind !== 'line') return [];
    if (predicate && !predicate(entity)) return [];
    return entitySegments(entity);
  });
}

function applyLayerRules(entities: DxfEntity[], overrides: Record<string, DxfClassification>) {
  return entities.map((entity) => {
    const hasOverride = Object.prototype.hasOwnProperty.call(overrides, entity.handle);
    const classification = hasOverride
      ? overrides[entity.handle]
      : entity.classification ?? classificationFromLayer(entity.layer) ?? (entity.geometry.kind === 'text' ? 'annotation' : null);
    return withClassification(entity, classification);
  });
}

function applyClosedPolylineWalls(entities: DxfEntity[], lockedHandles: Set<string>) {
  return entities.map((entity) => {
    if (lockedHandles.has(entity.handle)) return entity;
    if (entity.classification) return entity;
    if (entity.geometry.kind !== 'polyline') return entity;
    if (!entity.geometry.closed || entity.geometry.points.length < 3) return entity;
    return withClassification(entity, 'wall');
  });
}

function applyParallelWallPairs(entities: DxfEntity[], lockedHandles: Set<string>) {
  const nextEntities = [...entities];
  const byId = new Map(nextEntities.map((entity, index) => [entity.id, index]));
  const groups = new Map<string, Segment[]>();

  gatherLineSegments(
    nextEntities,
    (entity) =>
      !lockedHandles.has(entity.handle) && (!entity.classification || entity.classification === 'wall')
  ).forEach((segment) => {
    const bucket = `${segment.layer}:${Math.round(segment.angleDeg)}`;
    const list = groups.get(bucket) ?? [];
    list.push(segment);
    groups.set(bucket, list);
  });

  groups.forEach((segments) => {
    for (let leftIndex = 0; leftIndex < segments.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < segments.length; rightIndex += 1) {
        const left = segments[leftIndex];
        const right = segments[rightIndex];

        if (angleDelta(left.angleDeg, right.angleDeg) > PARALLEL_ANGLE_TOLERANCE) continue;

        const separation = segmentSeparation(left, right);
        if (separation < MIN_WALL_THICKNESS || separation > MAX_WALL_THICKNESS) continue;

        const overlap = lineIntervalsOverlap(left, right);
        const overlapRatio = overlap / Math.min(left.length, right.length);
        if (overlapRatio < MIN_OVERLAP_RATIO) continue;

        const leftIndexInEntities = byId.get(left.entityId);
        const rightIndexInEntities = byId.get(right.entityId);
        if (leftIndexInEntities != null && !lockedHandles.has(nextEntities[leftIndexInEntities].handle)) {
          nextEntities[leftIndexInEntities] = withClassification(nextEntities[leftIndexInEntities], 'wall');
        }
        if (rightIndexInEntities != null && !lockedHandles.has(nextEntities[rightIndexInEntities].handle)) {
          nextEntities[rightIndexInEntities] = withClassification(nextEntities[rightIndexInEntities], 'wall');
        }
      }
    }
  });

  return nextEntities;
}

function applyDoorLineHeuristic(entities: DxfEntity[], lockedHandles: Set<string>) {
  const nextEntities = [...entities];
  const byId = new Map(nextEntities.map((entity, index) => [entity.id, index]));
  const wallSegments = nextEntities.flatMap((entity) => (entity.classification === 'wall' ? entitySegments(entity) : []));
  const candidates = gatherLineSegments(
    nextEntities,
    (entity) => !lockedHandles.has(entity.handle) && !entity.classification && entity.geometry.kind === 'line'
  );

  candidates.forEach((candidate) => {
    if (candidate.length < MIN_DOOR_LINE || candidate.length > MAX_DOOR_LINE) return;

    const matchesWall = wallSegments.some((wallSegment) => {
      const angle = angleDelta(candidate.angleDeg, wallSegment.angleDeg);
      if (Math.abs(angle - 90) > DOOR_ANGLE_TOLERANCE) return false;

      const midDistance = pointToSegmentDistance(midpoint(candidate.start, candidate.end), wallSegment);
      if (midDistance > DOOR_WALL_DISTANCE) return false;

      const startDistance = pointToSegmentDistance(candidate.start, wallSegment);
      const endDistance = pointToSegmentDistance(candidate.end, wallSegment);
      return Math.min(startDistance, endDistance, midDistance) <= DOOR_WALL_DISTANCE;
    });

    if (!matchesWall) return;
    const index = byId.get(candidate.entityId);
    if (index != null) {
      nextEntities[index] = withClassification(nextEntities[index], 'door');
    }
  });

  return nextEntities;
}

function applyDoorArcHeuristic(entities: DxfEntity[], lockedHandles: Set<string>) {
  const nextEntities = [...entities];
  const byId = new Map(nextEntities.map((entity, index) => [entity.id, index]));
  const wallSegments = nextEntities.flatMap((entity) => (entity.classification === 'wall' ? entitySegments(entity) : []));

  nextEntities.forEach((entity) => {
    if (lockedHandles.has(entity.handle)) return;
    if (entity.classification || entity.geometry.kind !== 'arc') return;
    const geometry = entity.geometry;
    if (geometry.radius < MIN_DOOR_ARC_RADIUS || geometry.radius > MAX_DOOR_ARC_RADIUS) return;

    const sweep = Math.abs(geometry.endAngle - geometry.startAngle);
    if (sweep < Math.PI / 8 || sweep > (3 * Math.PI) / 4) return;

    const nearWall = wallSegments.some(
      (segment) => pointToSegmentDistance(geometry.center, segment) <= DOOR_WALL_DISTANCE
    );
    if (!nearWall) return;

    const index = byId.get(entity.id);
    if (index != null) {
      nextEntities[index] = withClassification(nextEntities[index], 'door');
    }
  });

  return nextEntities;
}

function buildStats(entities: DxfEntity[]) {
  const stats = emptyStats();
  stats.total = entities.length;

  entities.forEach((entity) => {
    if (entity.classification === 'wall') stats.wall += 1;
    else if (entity.classification === 'door') stats.door += 1;
    else if (entity.classification === 'window') stats.window += 1;
    else if (entity.classification === 'furniture') stats.furniture += 1;
    else if (entity.classification === 'annotation') stats.annotation += 1;
    else stats.ambiguous += 1;
  });

  return stats;
}

function buildLayerStats(entities: DxfEntity[]) {
  const layerStats: Record<string, ClassificationStats> = {};

  entities.forEach((entity) => {
    if (!layerStats[entity.layer]) {
      layerStats[entity.layer] = emptyStats();
    }
    const stats = layerStats[entity.layer];
    stats.total += 1;

    if (entity.classification === 'wall') stats.wall += 1;
    else if (entity.classification === 'door') stats.door += 1;
    else if (entity.classification === 'window') stats.window += 1;
    else if (entity.classification === 'furniture') stats.furniture += 1;
    else if (entity.classification === 'annotation') stats.annotation += 1;
    else stats.ambiguous += 1;
  });

  return layerStats;
}

function buildCache(entities: DxfEntity[]) {
  return entities.reduce<Record<string, DxfClassification>>((acc, entity) => {
    if (entity.classification) {
      acc[entity.handle] = entity.classification;
    }
    return acc;
  }, {});
}

export function applyClassificationResult(dxf: DxfLoaded, result: ClassificationResult): DxfLoaded {
  return {
    ...dxf,
    entities: result.entities
  };
}

export function classifyEntities(
  dxf: DxfLoaded,
  overrides: Record<string, DxfClassification> = {}
): ClassificationResult {
  const lockedHandles = new Set(Object.keys(overrides));
  const withLayers = applyLayerRules(dxf.entities, overrides);
  const withClosedPolylines = applyClosedPolylineWalls(withLayers, lockedHandles);
  const withParallelWalls = applyParallelWallPairs(withClosedPolylines, lockedHandles);
  const withDoorLines = applyDoorLineHeuristic(withParallelWalls, lockedHandles);
  const nextEntities = applyDoorArcHeuristic(withDoorLines, lockedHandles);
  const classified = nextEntities.filter((entity) => Boolean(entity.classification));
  const ambiguous = nextEntities.filter((entity) => !entity.classification);

  return {
    entities: nextEntities,
    classified,
    ambiguous,
    stats: buildStats(nextEntities),
    cache: buildCache(nextEntities),
    layerStats: buildLayerStats(nextEntities)
  };
}

export function matchesClassificationFilter(entity: DxfEntity, filter: DxfClassificationFilter) {
  return entityMatchesFilter(entity, filter);
}
