import {NextResponse} from 'next/server';
import {z} from 'zod';
import {resolveAnthropicKey, resolveAiModel, isAiEnabled} from '@/lib/ai-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  prompt: z.string().min(3).max(2000)
});

const SYSTEM = `You generate floor-plan geometry as JSON compatible with the NREL FloorspaceJS v0.8 schema (https://github.com/NREL/floorspace.js). The user describes an apartment/office in Georgian; you return a SINGLE valid JSON object that FloorspaceJS can File→Import.

REQUIRED TOP-LEVEL SHAPE:
{
  "application": { "currentSelections": { "story_id": "s1", "story": null, "subselection_ids_by_story": {}, "component_definition_id": null, "component_instance_id": null, "space_property_id": null, "tool": "Rectangle", "mode": "spaces" }, "scale": { "x": null, "y": null } },
  "project": {
    "config": { "units": "m", "unitsEditable": true, "language": "EN-US", "north_axis": 0 },
    "grid": { "visible": true, "spacing": 1 },
    "view": { "min_x": -20, "min_y": -20, "max_x": 20, "max_y": 20 },
    "map": { "initialized": false, "enabled": false, "visible": false, "latitude": 0, "longitude": 0, "zoom": 4.5, "rotation": 0, "elevation": 0 },
    "ground": { "floor_offset": 0, "azimuth_angle": 0, "tilt_slope": 0 },
    "previous_story": { "visible": true, "opacity": 0.3, "extend_opacity_to_all_layers": false },
    "show_import_export": true
  },
  "stories": [
    {
      "id": "s1", "handle": null, "name": "Story 1",
      "image_visible": true, "below_floor_plenum_height": 0, "floor_to_ceiling_height": 3,
      "multiplier": 1, "color": "#88ccee",
      "geometry": {
        "id": "g1", "vertices": [ {"id":"v1","x":0,"y":0,"edge_ids":["e1","e4"]}, {"id":"v2","x":8,"y":0,"edge_ids":["e1","e2"]}, {"id":"v3","x":8,"y":5,"edge_ids":["e2","e3"]}, {"id":"v4","x":0,"y":5,"edge_ids":["e3","e4"]} ],
        "edges":   [ {"id":"e1","vertex_ids":["v1","v2"],"face_ids":["f1"]}, {"id":"e2","vertex_ids":["v2","v3"],"face_ids":["f1"]}, {"id":"e3","vertex_ids":["v3","v4"],"face_ids":["f1"]}, {"id":"e4","vertex_ids":["v4","v1"],"face_ids":["f1"]} ],
        "faces":   [ {"id":"f1","edge_ids":["e1","e2","e3","e4"],"edge_order":[1,1,1,1]} ]
      },
      "images": [], "spaces": [ {"id":"sp1","name":"Living","color":"#f8cbad","handle":null,"face_id":"f1","daylighting_controls":[],"building_unit_id":null,"thermal_zone_id":null,"space_type_id":null,"construction_set_id":null,"pitched_roof_id":null,"type":"space","below_floor_plenum_height":null,"floor_to_ceiling_height":null,"above_ceiling_plenum_height":null,"floor_offset":null,"open_to_below":false} ],
      "shading": [], "windows": [], "doors": [], "daylighting_controls": []
    }
  ],
  "library": { "building_units": [], "thermal_zones": [], "space_types": [], "construction_sets": [], "constructions": [], "materials": [], "window_definitions": [], "door_definitions": [], "daylighting_control_definitions": [], "pitched_roofs": [], "schedules": [] }
}

RULES:
- Units are METERS. All x/y in meters.
- Make ONE story with one face per SPACE (room). Each room = its own face with 4+ vertices + its own space entry.
- Rooms must be rectilinear (right angles). Place rooms adjacent, sharing edges when they share a wall.
- Use stable IDs: vertices v1..vN, edges e1..eN, faces f1..fN (one per room), spaces sp1..spN.
- Each edge's vertex_ids must point to valid vertices; each edge must list ALL faces it belongs to in face_ids (shared walls belong to 2 faces).
- Colors: kitchen "#c0e0b8", bedroom "#b8cce0", bathroom "#e8c0c0", living "#f8cbad", hallway "#e6dcc0", office "#d0d0e8".
- Space names: translate Georgian room name to concise English (e.g. "საძინებელი"→"Bedroom", "სამზარეულო"→"Kitchen", "საერთო ოთახი"→"Living", "აბაზანა"→"Bathroom", "კორიდორი"/"დერეფანი"→"Hallway", "ოფისი"→"Office").
- Aim to match total area ± 10%. If the user gives per-room m², respect them.
- Output ONLY the JSON. No markdown, no code fences, no commentary.`;

export async function POST(req: Request) {
  if (!(await isAiEnabled())) {
    return NextResponse.json(
      {error: 'ai_disabled', message: 'AI სერვისი გათიშულია admin-ში.'},
      {status: 503}
    );
  }
  const apiKey = await resolveAnthropicKey();
  if (!apiKey) {
    return NextResponse.json(
      {
        error: 'ai_not_configured',
        message: 'ANTHROPIC_API_KEY არ არის დაყენებული. Admin → AI → დაამატე key.'
      },
      {status: 503}
    );
  }
  const model = await resolveAiModel();

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {error: 'bad_request', issues: parsed.error.flatten()},
      {status: 400}
    );
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: 8000,
        system: SYSTEM,
        messages: [{role: 'user', content: parsed.data.prompt}]
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        {error: 'upstream_failed', status: res.status, message: errText},
        {status: 502}
      );
    }

    const data = (await res.json()) as {
      content?: {type: string; text?: string}[];
      usage?: {input_tokens: number; output_tokens: number};
    };

    const text =
      data.content
        ?.filter((c) => c.type === 'text')
        .map((c) => c.text ?? '')
        .join('')
        .trim() ?? '';

    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    const jsonSlice =
      firstBrace >= 0 && lastBrace > firstBrace
        ? text.slice(firstBrace, lastBrace + 1)
        : text;

    let plan: unknown;
    try {
      plan = JSON.parse(jsonSlice);
    } catch {
      return NextResponse.json(
        {
          error: 'parse_failed',
          message: 'AI-მ დააბრუნა არა-JSON. სცადე სხვა prompt.',
          raw: text.slice(0, 2000)
        },
        {status: 502}
      );
    }

    return NextResponse.json({plan, tokens: data.usage});
  } catch (e) {
    return NextResponse.json(
      {
        error: 'exception',
        message: e instanceof Error ? e.message : 'unknown'
      },
      {status: 500}
    );
  }
}
