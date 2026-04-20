/**
 * engineers.ge — wall-editor rooms detection
 * Detects closed room polygons formed by wall segments
 * 
 * Algorithm:
 * 1. Build a planar graph of wall endpoints and intersections
 * 2. Find cycles (closed loops) using DFS
 * 3. Order loop points to form CCW polygon
 * 4. Compute area, centroid, bbox
 * 5. Return room metadata for UI display + physics simulation
 */

(function (global) {
  'use strict';

  class RoomsDetector {
    constructor(walls, epsilon = 0.01) {
      this.walls = walls; // Array of {id, start: [x,y], end: [x,y], thickness_m, ...}
      this.epsilon = epsilon; // Snap threshold for finding intersections
      this.graph = {};
      this.intersections = [];
      this.rooms = [];
    }

    /**
     * Main entry point: detect rooms from wall array
     */
    detect() {
      this.buildGraph();
      this.findCycles();
      return this.rooms;
    }

    /**
     * Build planar graph: vertices = endpoints + intersections
     */
    buildGraph() {
      this.graph = {};
      this.intersections = [];

      // Collect all wall endpoints
      const vertices = [];
      const wallSegments = [];

      this.walls.forEach((wall) => {
        const [sx, sy] = wall.start;
        const [ex, ey] = wall.end;
        vertices.push({ x: sx, y: sy, wallId: wall.id, type: 'endpoint', isStart: true });
        vertices.push({ x: ex, y: ey, wallId: wall.id, type: 'endpoint', isStart: false });
        wallSegments.push(wall);
      });

      // Find intersections between non-adjacent walls
      for (let i = 0; i < wallSegments.length; i++) {
        for (let j = i + 1; j < wallSegments.length; j++) {
          const w1 = wallSegments[i];
          const w2 = wallSegments[j];
          const pt = this.lineIntersection(w1.start, w1.end, w2.start, w2.end);
          if (pt) {
            vertices.push({
              x: pt[0],
              y: pt[1],
              wallId: null,
              type: 'intersection',
              walls: [w1.id, w2.id]
            });
            this.intersections.push(pt);
          }
        }
      }

      // Merge nearby vertices (snap) and build adjacency
      this.vertices = this.mergeVertices(vertices, this.epsilon);

      // Build graph: vertex → [neighbors]
      for (const v of this.vertices) {
        const key = this.vertexKey(v);
        this.graph[key] = [];
      }

      // Add edges from walls
      for (const wall of wallSegments) {
        const [sx, sy] = wall.start;
        const [ex, ey] = wall.end;

        // Find all vertices on this wall segment
        const onWall = this.vertices.filter((v) => {
          const t = this.pointOnSegment([sx, sy], [ex, ey], [v.x, v.y], this.epsilon);
          return t !== null && t > this.epsilon && t < 1 - this.epsilon; // Interior points
        });

        // Sort by distance along wall
        onWall.sort((a, b) => {
          const ta = ((a.x - sx) * (ex - sx) + (a.y - sy) * (ey - sy)) /
                     ((ex - sx) ** 2 + (ey - sy) ** 2);
          const tb = ((b.x - sx) * (ex - sx) + (b.y - sy) * (ey - sy)) /
                     ((ex - sx) ** 2 + (ey - sy) ** 2);
          return ta - tb;
        });

        // Add start → sorted points → end
        const segment = [
          { x: sx, y: sy },
          ...onWall.map((v) => ({ x: v.x, y: v.y })),
          { x: ex, y: ey }
        ];

        for (let i = 0; i < segment.length - 1; i++) {
          const v1 = this.vertices.find((v) =>
            Math.abs(v.x - segment[i].x) < this.epsilon &&
            Math.abs(v.y - segment[i].y) < this.epsilon
          );
          const v2 = this.vertices.find((v) =>
            Math.abs(v.x - segment[i + 1].x) < this.epsilon &&
            Math.abs(v.y - segment[i + 1].y) < this.epsilon
          );
          if (v1 && v2) {
            const k1 = this.vertexKey(v1);
            const k2 = this.vertexKey(v2);
            if (!this.graph[k1].some((v) => this.vertexKey(v) === k2)) {
              this.graph[k1].push(v2);
            }
            if (!this.graph[k2].some((v) => this.vertexKey(v) === k1)) {
              this.graph[k2].push(v1);
            }
          }
        }
      }
    }

    /**
     * Find all cycles in the graph using DFS
     * Extracts the innermost cycles (rooms) only
     */
    findCycles() {
      const visited = new Set();
      const cycles = [];

      for (const startKey of Object.keys(this.graph)) {
        if (visited.has(startKey)) continue;

        // DFS to find cycle
        const stack = [{ key: startKey, parent: null, path: [startKey] }];

        while (stack.length > 0) {
          const { key, parent, path } = stack.pop();

          if (visited.has(key)) continue;
          visited.add(key);

          const neighbors = this.graph[key] || [];
          for (const neighbor of neighbors) {
            const nKey = this.vertexKey(neighbor);
            if (nKey === parent) continue;

            if (path.includes(nKey)) {
              // Cycle found
              const cycleStart = path.indexOf(nKey);
              const cycle = path.slice(cycleStart).concat(nKey);
              cycles.push(cycle);
            } else {
              stack.push({ key: nKey, parent: key, path: [...path, nKey] });
            }
          }
        }
      }

      // Convert cycles to room polygons
      this.rooms = cycles
        .filter((cycle) => cycle.length >= 3) // Need at least 3 vertices
        .map((cycle) => this.cycleToRoom(cycle))
        .filter((room) => room && room.area_m2 > 0.5); // Filter out noise

      // Remove duplicate/nested rooms (keep only smallest enclosing)
      this.rooms = this.filterNestedRooms(this.rooms);
    }

    /**
     * Convert vertex key cycle to Room object
     */
    cycleToRoom(cycle) {
      const polygon = cycle.map((key) => {
        const [x, y] = key.split(',').map(Number);
        return [x, y];
      });

      // Ensure CCW order
      const area = this.polygonArea(polygon);
      if (area < 0) polygon.reverse();

      const area_m2 = Math.abs(area);
      const [cx, cy] = this.polygonCentroid(polygon);
      const bbox = this.polygonBBox(polygon);
      const height_m = 2.8; // Default (can be overridden from floor metadata)

      return {
        id: 'room-' + Date.now() + '-' + Math.random().toString(36).slice(2),
        polygon,
        name: null,
        type: this.guessRoomType(polygon, cx, cy),
        area_m2,
        volume_m3: area_m2 * height_m,
        centroid: [cx, cy],
        bbox // {minX, maxX, minY, maxY}
      };
    }

    /**
     * Guess room type based on area + position
     */
    guessRoomType(polygon, cx, cy) {
      const area = this.polygonArea(polygon);
      const aspectRatio = this.polygonAspectRatio(polygon);

      // Heuristics (overridable by user later)
      if (area < 5) return 'closet';
      if (aspectRatio > 3) return 'hallway';
      if (area > 50) return 'office';
      return 'room'; // Generic fallback
    }

    /**
     * Remove rooms nested inside other rooms
     */
    filterNestedRooms(rooms) {
      return rooms.filter((r1) => {
        return !rooms.some((r2) => {
          if (r1.id === r2.id) return false;
          // Check if r1 is completely inside r2
          return r2.area_m2 > r1.area_m2 &&
                 this.pointInPolygon(r1.centroid, r2.polygon);
        });
      });
    }

    /**
     * Geometry helpers
     */

    vertexKey(v) {
      return `${v.x.toFixed(3)},${v.y.toFixed(3)}`;
    }

    mergeVertices(vertices, epsilon) {
      const merged = [];
      for (const v of vertices) {
        const existing = merged.find((m) =>
          Math.abs(m.x - v.x) < epsilon && Math.abs(m.y - v.y) < epsilon
        );
        if (!existing) merged.push(v);
      }
      return merged;
    }

    lineIntersection(p1, p2, p3, p4) {
      const [x1, y1] = p1;
      const [x2, y2] = p2;
      const [x3, y3] = p3;
      const [x4, y4] = p4;

      const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
      if (Math.abs(denom) < 1e-10) return null; // Parallel

      const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
      const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

      if (t > 0 && t < 1 && u > 0 && u < 1) {
        return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
      }
      return null;
    }

    pointOnSegment(p1, p2, p, epsilon) {
      const [x1, y1] = p1;
      const [x2, y2] = p2;
      const [x, y] = p;

      const dx = x2 - x1;
      const dy = y2 - y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1e-10) return null;

      let t = ((x - x1) * dx + (y - y1) * dy) / len2;
      t = Math.max(0, Math.min(1, t));

      const closestX = x1 + t * dx;
      const closestY = y1 + t * dy;
      const dist = Math.hypot(x - closestX, y - closestY);

      return dist < epsilon ? t : null;
    }

    polygonArea(polygon) {
      let area = 0;
      for (let i = 0; i < polygon.length; i++) {
        const [x1, y1] = polygon[i];
        const [x2, y2] = polygon[(i + 1) % polygon.length];
        area += (x1 * y2 - x2 * y1);
      }
      return area / 2;
    }

    polygonCentroid(polygon) {
      let cx = 0, cy = 0, a = 0;
      for (let i = 0; i < polygon.length; i++) {
        const [x1, y1] = polygon[i];
        const [x2, y2] = polygon[(i + 1) % polygon.length];
        const cross = x1 * y2 - x2 * y1;
        cx += (x1 + x2) * cross;
        cy += (y1 + y2) * cross;
        a += cross;
      }
      return [cx / (3 * a), cy / (3 * a)];
    }

    polygonBBox(polygon) {
      const xs = polygon.map((p) => p[0]);
      const ys = polygon.map((p) => p[1]);
      return {
        minX: Math.min(...xs),
        maxX: Math.max(...xs),
        minY: Math.min(...ys),
        maxY: Math.max(...ys)
      };
    }

    polygonAspectRatio(polygon) {
      const bbox = this.polygonBBox(polygon);
      const w = bbox.maxX - bbox.minX;
      const h = bbox.maxY - bbox.minY;
      return Math.max(w, h) / Math.min(w, h);
    }

    pointInPolygon(p, polygon) {
      const [x, y] = p;
      let inside = false;
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const [xi, yi] = polygon[i];
        const [xj, yj] = polygon[j];
        const intersect = ((yi > y) !== (yj > y)) &&
                          (x < ((xj - xi) * (y - yi)) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    }
  }

  // Export
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = RoomsDetector;
  } else {
    global.RoomsDetector = RoomsDetector;
  }
})(typeof globalThis !== 'undefined' ? globalThis : global);
