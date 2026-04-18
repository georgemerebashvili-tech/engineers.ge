import * as THREE from 'three';
import {arcToPoints, type DxfEntity, type DxfGeometry, type DxfLoaded} from './parse';

type BuildDxfGroupOptions = {
  visibleLayers: string[];
  showText?: boolean;
};

function textKey(text: string, color: number) {
  return `${text}::${color}`;
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

function pushPolylineSegments(target: number[], points: Array<{x: number; y: number; z: number}>, closed: boolean) {
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = points[index];
    const next = points[index + 1];
    target.push(current.x, current.y, current.z, next.x, next.y, next.z);
  }

  if (closed && points.length > 2) {
    const first = points[0];
    const last = points[points.length - 1];
    target.push(last.x, last.y, last.z, first.x, first.y, first.z);
  }
}

function collectLayerSegments(entities: DxfEntity[]) {
  const map = new Map<string, number[]>();

  entities.forEach((entity) => {
    const bucket = map.get(entity.layer) ?? [];

    switch (entity.geometry.kind) {
      case 'line':
        pushPolylineSegments(bucket, entity.geometry.points, false);
        break;
      case 'polyline':
        pushPolylineSegments(bucket, entity.geometry.points, entity.geometry.closed);
        break;
      case 'circle':
      case 'arc':
        pushPolylineSegments(bucket, arcToPoints(entity), entity.geometry.kind === 'circle');
        break;
      case 'text':
        break;
    }

    map.set(entity.layer, bucket);
  });

  return map;
}

function isTextGeometry(geometry: DxfGeometry): geometry is Extract<DxfGeometry, {kind: 'text'}> {
  return geometry.kind === 'text';
}

export function buildDxfThreeGroup(model: DxfLoaded, options: BuildDxfGroupOptions) {
  const root = new THREE.Group();
  root.name = `dxf:${model.filename}`;

  const visible = new Set(options.visibleLayers);
  const layerSegments = collectLayerSegments(model.entities);
  const textureCache = new Map<string, THREE.Texture>();

  model.layers.forEach((layer) => {
    const group = new THREE.Group();
    group.name = `layer:${layer.name}`;
    group.visible = visible.has(layer.name);

    const segments = layerSegments.get(layer.name);
    if (segments?.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(segments, 3));

      const lines = new THREE.LineSegments(
        geometry,
        new THREE.LineBasicMaterial({
          color: layer.color,
          transparent: true,
          opacity: 0.9
        })
      );
      lines.raycast = () => null;
      group.add(lines);
    }

    if (options.showText) {
      model.entities
        .filter((entity) => entity.layer === layer.name && entity.geometry.kind === 'text')
        .forEach((entity) => {
          if (!isTextGeometry(entity.geometry)) return;
          const sprite = makeTextSprite(entity.geometry.text, layer.color, textureCache);
          if (!sprite) return;
          const scale = Math.max(2.8, entity.geometry.height * 10);
          sprite.position.set(entity.geometry.position.x, 0.12, entity.geometry.position.z);
          sprite.scale.set(scale * 1.4, scale * 0.46, 1);
          sprite.raycast = () => null;
          group.add(sprite);
        });
    }

    root.add(group);
  });

  return root;
}
