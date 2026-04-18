# Task 020 — Claude API Wall Detection (Ambiguous Cases)

**Delegated to:** Codex + Claude (prompt engineering)
**Created:** 2026-04-18
**Parent:** [`PLAN-ventilation-suite.md`](../PLAN-ventilation-suite.md) · Phase 3
**Depends on:** 019
**User action required:** Anthropic API key

## მიზანი

Task 019-ის ambiguous entities გადაეგზავნოს Claude API-ს, მიიღოს classification. Cost-sensitive: batch + cache + Haiku-4.5.

## API endpoint

**File:** `app/api/detect-walls/route.ts`

```ts
// POST /api/detect-walls
// Body:
{
  entities: Array<{
    id: string;
    type: 'LINE' | 'LWPOLYLINE' | 'ARC' | 'TEXT' | ...;
    layer: string;
    geometry: { /* coords */ };
    context?: {
      nearbyLayers: string[];
      lengthMm: number;
      nearbyWalls: number;  // count
    }
  }>;
  drawingMeta: {
    unit: 'mm' | 'm' | ...;
    bounds: [minX, minY, maxX, maxY];
    totalEntities: number;
  };
  dxfHash: string;  // for caching
}

// Response:
{
  classifications: Array<{
    id: string;
    class: 'wall' | 'door' | 'window' | 'furniture' | 'annotation';
    confidence: number;  // 0-1
    reasoning?: string;  // short
  }>;
  model: 'claude-haiku-4-5';
  cached: boolean;
  cost: { inputTokens: number, outputTokens: number, dollars: number };
}
```

## Implementation

```ts
// app/api/detect-walls/route.ts
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import { checkCache, writeCache } from '@/lib/dxf/wall-cache';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

export async function POST(req: NextRequest) {
  const body = await req.json();
  // validate with Zod

  // Cache check by dxfHash + entity ids
  const cached = await checkCache(body.dxfHash, body.entities.map(e => e.id));
  if (cached) return NextResponse.json({ ...cached, cached: true });

  // Batch entities (50 per API call max)
  const batches = chunk(body.entities, 50);
  const results = [];

  for (const batch of batches) {
    const resp = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,  // with prompt caching
      messages: [{
        role: 'user',
        content: JSON.stringify({ entities: batch, drawingMeta: body.drawingMeta })
      }]
    });
    const parsed = parseClassificationResponse(resp);
    results.push(...parsed);
  }

  await writeCache(body.dxfHash, results);
  return NextResponse.json({
    classifications: results,
    model: 'claude-haiku-4-5',
    cached: false,
    cost: computeCost(...)
  });
}
```

## System prompt (drafted by Claude, reviewed by user)

```
You are an expert at analyzing CAD drawing entities to classify them as architectural elements.

Given a list of DXF entities (lines, polylines, arcs, text) with their geometry, layer name, and context,
classify each as one of:
- wall: structural or partition wall
- door: door leaf, frame, or swing arc
- window: window frame or glazing
- furniture: non-architectural elements (desks, beds, equipment)
- annotation: dimensions, notes, labels, grids

Rules:
1. Short lines (< 200mm) are usually annotations or door frames, not walls
2. Arcs with radius 700-1200mm near a gap in wall are door swings
3. Text entities are always annotations
4. Closed polylines on furniture layers are furniture outlines
5. Isolated single lines without pairs are usually annotations or detail lines

Respond with valid JSON array:
[
  { "id": "...", "class": "wall|door|window|furniture|annotation", "confidence": 0.0-1.0, "reasoning": "brief" }
]

No preamble. Only JSON.
```

Use prompt caching: system prompt gets `cache_control: { type: 'ephemeral' }` per Anthropic docs.

## Cache strategy

- Key: `sha256(dxfHash + sorted(entityIds).join(','))`
- Storage: Supabase table `dxf_classifications` (user_id NOT needed, shared cache)
- TTL: 30 days
- Cache hit rate target: >40% (repeat uploads common)

## Acceptance

- [ ] API endpoint live + tested
- [ ] Input validated with Zod
- [ ] Batches correctly (50/call)
- [ ] Prompt caching active (confirmed in response usage field)
- [ ] Supabase cache table created + RLS off (public read)
- [ ] Client-side consumer in `components/composer/dxf-panel.tsx`: after Task 019 runs, send ambiguous batch → update classifications
- [ ] Progress UI: "AI ანალიზი: 50/114 entities..."
- [ ] Cost displayed per call: "~$0.003 · 50 entities"
- [ ] Error handling: API failure → user can manually classify remaining
- [ ] Rate limit: 5 calls/min per user IP (prevent abuse)

## Env vars

```
ANTHROPIC_API_KEY=sk-ant-...
```

→ Add to Vercel env in preview + production scopes.

## Testing

- Test on 3 fixture DXFs (Task 019 fixtures)
- Benchmark: avg cost per plan
- Compare with manual classification (accuracy > 85% target)

---

**Status:** pending · blocks on Anthropic API key
