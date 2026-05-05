import 'server-only';
import {resolveAnthropicKey} from '@/lib/ai-settings';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {photoFromDb} from '@/lib/dmt/shared-state-server';

const HAIKU_MODEL = 'claude-haiku-4-5-20251001';
const SONNET_MODEL = 'claude-sonnet-4-5-20250929';

function textFromAnthropicMessage(value: unknown) {
  const record = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const content = Array.isArray(record.content) ? record.content : [];
  return content
    .map((part) => {
      const p = part && typeof part === 'object' ? part as Record<string, unknown> : {};
      return p.type === 'text' && typeof p.text === 'string' ? p.text : '';
    })
    .filter(Boolean)
    .join('\n')
    .trim();
}

function parseJsonBlock(text: string) {
  const clean = text
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(clean) as Record<string, unknown>;
  } catch {}

  const match = clean.match(/\{[\s\S]*\}/);
  if (match) {
    try {
      return JSON.parse(match[0]) as Record<string, unknown>;
    } catch {}
  }

  return {raw: text};
}

export async function analyzeLeadInventoryPhoto(input: {
  leadId: string;
  photoId: string;
  modelHint?: 'haiku' | 'sonnet' | null;
}) {
  const db = supabaseAdmin();
  const {data: photo, error: photoError} = await db
    .from('dmt_lead_inventory_photos')
    .select('*')
    .eq('id', input.photoId)
    .eq('lead_id', input.leadId)
    .is('deleted_at', null)
    .maybeSingle();

  if (photoError) throw photoError;
  if (!photo) throw new Error('photo not found');

  const model = input.modelHint === 'sonnet' ? SONNET_MODEL : HAIKU_MODEL;
  const apiKey = await resolveAnthropicKey();
  if (!apiKey) {
    const {data, error} = await db
      .from('dmt_lead_inventory_photos')
      .update({
        ai_error: 'Anthropic API key is not configured',
        ai_model: model,
        updated_at: new Date().toISOString(),
        updated_by: String(photo.updated_by ?? photo.created_by ?? 'DMT')
      })
      .eq('id', input.photoId)
      .select()
      .single();
    if (error) throw error;
    return photoFromDb(data);
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        messages: [{
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'url',
                url: String(photo.photo_url)
              }
            },
            {
              type: 'text',
              text: `Analyze this site inventory photo and return only JSON in this exact shape:
{
  "items": [
    {
      "name": "item name in Georgian when possible",
      "category": "HVAC | radiator | pipe | valve | tool | other",
      "qty": 1,
      "condition": "new | used | damaged",
      "description": "short description",
      "suggested_sku_keywords": ["inventory search terms"]
    }
  ],
  "scene_description": "short scene description",
  "confidence": 0.0
}
No markdown and no explanation.`
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => '');
      throw new Error(errorText || `Anthropic request failed: ${response.status}`);
    }

    const raw = await response.json();
    const text = textFromAnthropicMessage(raw);
    const analysis = {...parseJsonBlock(text), raw: text};
    const now = new Date().toISOString();

    const {data, error} = await db
      .from('dmt_lead_inventory_photos')
      .update({
        ai_analyzed: true,
        ai_analysis: analysis,
        ai_model: model,
        ai_analyzed_at: now,
        ai_error: null,
        updated_at: now,
        updated_by: String(photo.updated_by ?? photo.created_by ?? 'DMT')
      })
      .eq('id', input.photoId)
      .select()
      .single();

    if (error) throw error;
    return photoFromDb(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error || 'analysis failed');
    const {data, error: updateError} = await db
      .from('dmt_lead_inventory_photos')
      .update({
        ai_analyzed: false,
        ai_error: message.slice(0, 1000),
        ai_model: model,
        updated_at: new Date().toISOString(),
        updated_by: String(photo.updated_by ?? photo.created_by ?? 'DMT')
      })
      .eq('id', input.photoId)
      .select()
      .single();
    if (updateError) throw updateError;
    return photoFromDb(data);
  }
}
