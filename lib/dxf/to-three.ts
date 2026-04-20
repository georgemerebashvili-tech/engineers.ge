import * as THREE from 'three';
import {arcToPoints, type DxfEntity, type DxfGeometry, type DxfLoaded} from './parse';
import {
  matchesClassificationFilter,
  type DxfClassificationFilter
} from './wall-heuristic';

type BuildDxfGroupOptions = {
  visibleLayers: string[];
  showText?: boolean;
  selectedEntityId?: string | null;
  classificationFilter?: DxfClassificationFilter;
};

function textKey(text: string, color: number) {
  return `${text}::${color}`;
}

function classificationColor(entity: DxfEntity, fallback: number, selected: boolean) {
  if (selected) return 0xc0201a;
  if (entity.classification === 'wall') return 0x1f6fd4;
  if (entity.classification === 'door') return 0xc05010;
  if (entity.classification === 'window') return 0x0f6e3a;
  if (entity.classification === 'furniture') return 0x6d84a3;
  if (entity.classification === 'annotation') return 0x7a96b8;
  return fallback;
}

function lineMaterialKey(color: number, selected: boolean, classified: boolean) {
  return `${color}:${selected ? '1' : '0'}:${classified ? '1' : '0'}`;
}

function makeTextSprite(text: string, color: number, cache: Map<string, THREE.Texture>) {
  const key = textKey(text, color);
  const existing = cache.get(key);
  if (existing) {
    return new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: existing,
        transparent: true,
        depthWrite: false,
        sizeAttenuation: false
      })
    );
  }

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) {
    return null;
  }

  const fontSize = 36;
  context.font = `700 ${fontSize}px sans-serif`;
  const width = Math.max(96, Math.ceil(context.measureText(text).width + 28));
  canvas.width = width;
  canvas.height = 72;

  context.font = `700 ${fontSize}px sans-serif`;
  context.fillStyle = 'rgba(242,245,250,0.92)';
  context.strokeStyle = 'rgba(15,23,36,0.24)';
  context.lineWidth = 10;
  context.strokeText(text, 14, 48);
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`;
  context.fillText(text, 14, 48);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  cache.set(key, texture);

  return new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: false
    })
  );
}

function isTextGeometry(geometry: DxfGeometry): geometry is Extract<DxfGeometry, {kind: 'text'}> {
  return geometry.kind === 'text';
}

function geometryPoints(entity: DxfEntity) {
  switch (entity.geometry.kind) {
    case 'line':
      return {
        points: entity.geometry.points,
        closed: false
      };
    case 'polyline':
      return {
        points: entity.geometry.points,
        closed: entity.geometry.closed
      };
    case 'circle':
      return {
        points: arcToPoints(entity),
        closed: true
      };
    case 'arc':
      return {
        points: arcToPoints(entity),
        closed: false
      };
    case 'text':
      return null;
  }
}

function makeLineObject(
  entity: DxfEntity,
  color: number,
  selected: boolean,
  materialCache: Map<string, THREE.LineBasicMaterial>
) {
  const geometryData = geometryPoints(entity);
  if (!geometryData || geometryData.points.length < 2) return null;

  const key = lineMaterialKey(color, selected, Boolean(entity.classification));
  let material = materialCache.get(key);
  if (!material) {
    material = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: selected ? 1 : entity.classification ? 0.96 : 0.78
    });
    materialCache.set(key, material);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(
      geometryData.points.flatMap((point) => [point.x, selected ? 0.035 : 0.02, point.z]),
      3
    )
  );

  const line = geometryData.closed
    ? new THREE.LineLoop(geometry, material)
    : new THREE.Line(geometry, material);
  line.userData.entityId = entity.id;
  line.userData.entityHandle = entity.handle;
  line.userData.entityType = entity.type;
  return line;
}

export function buildDxfThreeGroup(model: DxfLoaded, options: BuildDxfGroupOptions) {
  const root = new THREE.Group();
  root.name = `dxf:${model.filename}`;

  const visible = new Set(options.visibleLayers);
  const textureCache = new Map<string, THREE.Texture>();
  const materialCache = new Map<string, THREE.LineBasicMaterial>();
  const classificationFilter = options.classificationFilter ?? 'all';

  model.layers.forEach((layer) => {
    const group = new THREE.Group();
    group.name = `layer:${layer.name}`;
    group.visible = visible.has(layer.name);
    const layerEntities = model.entities.filter(
      (entity) =>
        entity.layer === layer.name && matchesClassificationFilter(entity, classificationFilter)
    );

    layerEntities.forEach((entity) => {
      const selected = entity.id === options.selectedEntityId;
      const color = classificationColor(entity, layer.color, selected);

      if (options.showText && entity.geometry.kind === 'text') {
        if (!isTextGeometry(entity.geometry)) return;
        const sprite = makeTextSprite(entity.geometry.text, color, textureCache);
        if (!sprite) return;
        const scale = Math.max(2.8, entity.geometry.height * 10) * (selected ? 1.12 : 1);
        sprite.position.set(entity.geometry.position.x, selected ? 0.2 : 0.12, entity.geometry.position.z);
        sprite.scale.set(scale * 1.4, scale * 0.46, 1);
        sprite.userData.entityId = entity.id;
        sprite.userData.entityHandle = entity.handle;
        sprite.userData.entityType = entity.type;
        group.add(sprite);
        return;
      }

      if (entity.geometry.kind === 'text') return;

      const line = makeLineObject(entity, color, selected, materialCache);
      if (line) {
        group.add(line);
      }
    });

    root.add(group);
  });

  return root;
}
