// engineers.ge — seed templates for project gate
// Each template is { slug, name, description, state } where `state` matches
// the target editor's saved shape (same structure autosave writes).
// Consumers (ProjectGate) copy template.state into a fresh project entry.

export type ProjectTemplate = {
  key: string;
  slug: string;
  name: string;
  description: string;
  icon: string;           // emoji
  state: unknown;
};

// ---------- wall-editor templates ----------
// State shape mirrors wall-editor's autosave: walls, columns, openings, etc.
// with {meta, scale, floor, floors, ...}. Coordinates in meters.

function uidStub(prefix: string, n: number): string {
  return prefix + n.toString(36).padStart(6, '0');
}

// 1-bedroom apartment, ~42 m²
function apt1Bedroom(): unknown {
  const wid = (i: number) => uidStub('w-', i);
  const oid = (i: number) => uidStub('o-', i);
  // Rectangular outer walls with 1 interior partition + 3 openings
  const walls = [
    {id: wid(1), start: [-4, -3], end: [4, -3], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(2), start: [4, -3], end: [4, 3], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(3), start: [4, 3], end: [-4, 3], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(4), start: [-4, 3], end: [-4, -3], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    // interior partition splitting room
    {id: wid(5), start: [0, -3], end: [0, 1], thickness: 0.12, height: 2.8, material: 'gypsum', type: 'partition'}
  ];
  const openings = [
    {id: oid(1), wallId: wid(1), offset: 2, type: 'door', subtype: 'single', width: 0.9, height: 2.1, swing: 'inner-right'},
    {id: oid(2), wallId: wid(3), offset: 2, type: 'window', subtype: 'casement', width: 1.2, height: 1.4, sillHeight: 0.9},
    {id: oid(3), wallId: wid(2), offset: 3, type: 'window', subtype: 'casement', width: 1.2, height: 1.4, sillHeight: 0.9}
  ];
  const furniture = [
    {id: uidStub('f-', 1), model: 'fur-bed-d', kind: 'bed', name: 'საწოლი', position: [2, -1.5], w: 2, d: 1.8, rotation: 0, color: '#b8a078'},
    {id: uidStub('f-', 2), model: 'fur-sofa', kind: 'sofa', name: 'დივანი', position: [-2, 1.5], w: 2.2, d: 0.95, rotation: 0, color: '#a8928a'},
    {id: uidStub('f-', 3), model: 'fur-table-w', kind: 'table', name: 'სამუშაო მაგ.', position: [-3, -1.8], w: 1.2, d: 0.6, rotation: 0, color: '#c0a074'}
  ];
  return {
    version: 1,
    meta: {name: '1-ოთახიანი ბინა', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()},
    scale: {metersPerUnit: 1, gridStep: 0.25},
    floor: {height: 3.0, slabThickness: 0.2, ceilingHeight: 2.8},
    walls, columns: [], openings, fixtures: [], furniture, rooms: [], dimensions: [], fires: []
  };
}

// 3-bedroom apartment, ~85 m²
function apt3Bedroom(): unknown {
  const wid = (i: number) => uidStub('w-', i);
  const oid = (i: number) => uidStub('o-', i);
  const walls = [
    // outer
    {id: wid(1), start: [-6, -4], end: [6, -4], thickness: 0.25, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(2), start: [6, -4], end: [6, 4], thickness: 0.25, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(3), start: [6, 4], end: [-6, 4], thickness: 0.25, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(4), start: [-6, 4], end: [-6, -4], thickness: 0.25, height: 2.8, material: 'brick', type: 'facade'},
    // interior partitions
    {id: wid(5), start: [-2, -4], end: [-2, 1], thickness: 0.12, height: 2.8, material: 'gypsum', type: 'partition'},
    {id: wid(6), start: [2, -4], end: [2, 1], thickness: 0.12, height: 2.8, material: 'gypsum', type: 'partition'},
    {id: wid(7), start: [-2, 1], end: [6, 1], thickness: 0.12, height: 2.8, material: 'gypsum', type: 'partition'}
  ];
  const openings = [
    {id: oid(1), wallId: wid(4), offset: 6, type: 'door', subtype: 'single', width: 0.9, height: 2.1, swing: 'inner-right'},
    {id: oid(2), wallId: wid(1), offset: 3, type: 'window', subtype: 'casement', width: 1.2, height: 1.4, sillHeight: 0.9},
    {id: oid(3), wallId: wid(1), offset: 9, type: 'window', subtype: 'casement', width: 1.2, height: 1.4, sillHeight: 0.9},
    {id: oid(4), wallId: wid(3), offset: 4, type: 'window', subtype: 'casement', width: 1.5, height: 1.4, sillHeight: 0.9},
    {id: oid(5), wallId: wid(3), offset: 9, type: 'window', subtype: 'bay', width: 2.4, height: 1.8, sillHeight: 0.4},
    // interior doors
    {id: oid(6), wallId: wid(5), offset: 2, type: 'door', subtype: 'single', width: 0.8, height: 2.1, swing: 'inner-left'},
    {id: oid(7), wallId: wid(6), offset: 2, type: 'door', subtype: 'single', width: 0.8, height: 2.1, swing: 'inner-right'},
    {id: oid(8), wallId: wid(7), offset: 3, type: 'door', subtype: 'double', width: 1.6, height: 2.1, swing: 'inner-left'}
  ];
  const columns = [
    {id: uidStub('c-', 1), position: [-2, 1], shape: 'square', size: 0.3, rotation: 0, height: 2.8},
    {id: uidStub('c-', 2), position: [2, 1], shape: 'square', size: 0.3, rotation: 0, height: 2.8}
  ];
  const furniture = [
    {id: uidStub('f-', 1), model: 'fur-bed-d', kind: 'bed', name: 'მთავარი საწოლი', position: [-4, -2], w: 2, d: 1.8, rotation: 0, color: '#b8a078'},
    {id: uidStub('f-', 2), model: 'fur-bed-s', kind: 'bed', name: 'ერთადგ. საწოლი', position: [0, -2.5], w: 2, d: 0.9, rotation: 0, color: '#b8a078'},
    {id: uidStub('f-', 3), model: 'fur-bed-s', kind: 'bed', name: 'საბავშვო', position: [4, -2.5], w: 2, d: 0.9, rotation: 0, color: '#b8a078'},
    {id: uidStub('f-', 4), model: 'fur-sofa', kind: 'sofa', name: 'დივანი', position: [0, 2.5], w: 2.2, d: 0.95, rotation: 0, color: '#a8928a'},
    {id: uidStub('f-', 5), model: 'fur-table-d', kind: 'table', name: 'სადილის მაგ.', position: [3.5, 2.5], w: 1.6, d: 0.9, rotation: 0, color: '#c0a074'},
    {id: uidStub('f-', 6), model: 'fur-kitchen', kind: 'kitchen', name: 'სამზარეულო', position: [5, 2.2], w: 2.4, d: 0.65, rotation: 90, color: '#d0c8b8'}
  ];
  return {
    version: 1,
    meta: {name: '3-ოთახიანი ბინა', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()},
    scale: {metersPerUnit: 1, gridStep: 0.25},
    floor: {height: 3.0, slabThickness: 0.2, ceilingHeight: 2.8},
    walls, columns, openings, fixtures: [], furniture, rooms: [], dimensions: [], fires: []
  };
}

// Parking level, ~600 m² with jet fans + exhausts
function parkingBlock(): unknown {
  const wid = (i: number) => uidStub('w-', i);
  const walls = [
    {id: wid(1), start: [-15, -10], end: [15, -10], thickness: 0.3, height: 3.0, material: 'concrete', type: 'loadbearing'},
    {id: wid(2), start: [15, -10], end: [15, 10], thickness: 0.3, height: 3.0, material: 'concrete', type: 'loadbearing'},
    {id: wid(3), start: [15, 10], end: [-15, 10], thickness: 0.3, height: 3.0, material: 'concrete', type: 'loadbearing'},
    {id: wid(4), start: [-15, 10], end: [-15, -10], thickness: 0.3, height: 3.0, material: 'concrete', type: 'loadbearing'}
  ];
  // Grid of columns
  const columns: Array<Record<string, unknown>> = [];
  let cn = 0;
  for (let i = -10; i <= 10; i += 5) {
    for (let j = -5; j <= 5; j += 5) {
      columns.push({id: uidStub('c-', ++cn), position: [i, j], shape: 'square', size: 0.5, rotation: 0, height: 3.0});
    }
  }
  // Jet fans along the central spine
  const fixtures = [
    {id: uidStub('jf-', 1), position: [-10, 0], rotation: 0, type: 'jet-fan', model: 'jfr-d400', params: {thrust_N: 60, flow_m3h: 3400}, diameter: 0.5, zh: 2.5},
    {id: uidStub('jf-', 2), position: [0, 0], rotation: 0, type: 'jet-fan', model: 'jfr-d400', params: {thrust_N: 60, flow_m3h: 3400}, diameter: 0.5, zh: 2.5},
    {id: uidStub('jf-', 3), position: [10, 0], rotation: 0, type: 'jet-fan', model: 'jfr-d400', params: {thrust_N: 60, flow_m3h: 3400}, diameter: 0.5, zh: 2.5},
    {id: uidStub('ex-', 1), position: [-14, 0], rotation: 0, type: 'exhaust', model: 'ex-600', size: 0.6, params: {flow_m3h: 8000}},
    {id: uidStub('ex-', 2), position: [14, 0], rotation: 0, type: 'exhaust', model: 'ex-600', size: 0.6, params: {flow_m3h: 8000}}
  ];
  const openings = [
    {id: uidStub('o-', 1), wallId: wid(4), offset: 10, type: 'door', subtype: 'double', width: 3.0, height: 2.4, swing: 'outer-left'}
  ];
  return {
    version: 1,
    meta: {name: 'პარკინგი 600 მ²', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()},
    scale: {metersPerUnit: 1, gridStep: 0.5},
    floor: {height: 3.2, slabThickness: 0.25, ceilingHeight: 3.0},
    walls, columns, openings, fixtures, furniture: [], rooms: [], dimensions: [], fires: []
  };
}

// Office with meeting room
function officeFloor(): unknown {
  const wid = (i: number) => uidStub('w-', i);
  const walls = [
    {id: wid(1), start: [-8, -5], end: [8, -5], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(2), start: [8, -5], end: [8, 5], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(3), start: [8, 5], end: [-8, 5], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    {id: wid(4), start: [-8, 5], end: [-8, -5], thickness: 0.2, height: 2.8, material: 'brick', type: 'facade'},
    // meeting room partition
    {id: wid(5), start: [3, -5], end: [3, 0], thickness: 0.1, height: 2.8, material: 'gypsum', type: 'partition'},
    {id: wid(6), start: [3, 0], end: [8, 0], thickness: 0.1, height: 2.8, material: 'gypsum', type: 'partition'}
  ];
  const openings = [
    {id: uidStub('o-', 1), wallId: wid(4), offset: 5, type: 'door', subtype: 'single', width: 1.0, height: 2.1, swing: 'inner-right'},
    {id: uidStub('o-', 2), wallId: wid(5), offset: 2.5, type: 'door', subtype: 'single', width: 0.9, height: 2.1, swing: 'inner-left'},
    {id: uidStub('o-', 3), wallId: wid(1), offset: 4, type: 'window', subtype: 'casement', width: 1.5, height: 1.4, sillHeight: 0.9},
    {id: uidStub('o-', 4), wallId: wid(1), offset: 12, type: 'window', subtype: 'casement', width: 1.5, height: 1.4, sillHeight: 0.9},
    {id: uidStub('o-', 5), wallId: wid(3), offset: 5, type: 'window', subtype: 'panoramic', width: 2.4, height: 2.4, sillHeight: 0.1}
  ];
  const furniture = [
    {id: uidStub('f-', 1), model: 'fur-table-w', kind: 'table', name: 'დესკი 1', position: [-5, -2], w: 1.2, d: 0.6, rotation: 0, color: '#c0a074'},
    {id: uidStub('f-', 2), model: 'fur-table-w', kind: 'table', name: 'დესკი 2', position: [-5, 0], w: 1.2, d: 0.6, rotation: 0, color: '#c0a074'},
    {id: uidStub('f-', 3), model: 'fur-table-w', kind: 'table', name: 'დესკი 3', position: [-5, 2], w: 1.2, d: 0.6, rotation: 0, color: '#c0a074'},
    {id: uidStub('f-', 4), model: 'fur-table-d', kind: 'table', name: 'მეეთინგი', position: [5.5, -2.5], w: 1.6, d: 0.9, rotation: 90, color: '#c0a074'},
    {id: uidStub('f-', 5), model: 'fur-sofa', kind: 'sofa', name: 'დივანი', position: [0, 3.5], w: 2.2, d: 0.95, rotation: 0, color: '#a8928a'}
  ];
  return {
    version: 1,
    meta: {name: 'ოფისი 160 მ²', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()},
    scale: {metersPerUnit: 1, gridStep: 0.25},
    floor: {height: 3.2, slabThickness: 0.2, ceilingHeight: 2.8},
    walls, columns: [], openings, fixtures: [], furniture, rooms: [], dimensions: [], fires: []
  };
}

export const WALL_EDITOR_TEMPLATES: ProjectTemplate[] = [
  {
    key: 'apt-1br',
    slug: 'wall-editor',
    name: '1-ოთახიანი ბინა · 42 მ²',
    description: 'სამარტივო layout 1 საძინებლით + სამზარეულო-მისაღები',
    icon: '🏠',
    state: apt1Bedroom()
  },
  {
    key: 'apt-3br',
    slug: 'wall-editor',
    name: '3-ოთახიანი ბინა · 85 მ²',
    description: '3 საძინებელი + მისაღები + კოლონები',
    icon: '🏡',
    state: apt3Bedroom()
  },
  {
    key: 'parking',
    slug: 'wall-editor',
    name: 'პარკინგი · 600 მ²',
    description: 'ქვესართულ. პარკინგი, ჯეტ ფანი + გამწოვები, კოლონების ბადე',
    icon: '🅿',
    state: parkingBlock()
  },
  {
    key: 'office',
    slug: 'wall-editor',
    name: 'ოფისი · 160 მ²',
    description: 'Open space + შეხვედრის ოთახი, 5 desk',
    icon: '🏢',
    state: officeFloor()
  }
];

export function getTemplatesForSlug(slug: string): ProjectTemplate[] {
  return WALL_EDITOR_TEMPLATES.filter((t) => t.slug === slug);
}
