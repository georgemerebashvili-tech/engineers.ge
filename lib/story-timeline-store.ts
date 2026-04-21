import 'server-only';

import {supabaseAdmin} from '@/lib/supabase/admin';
import {DEFAULT_STORY_EVENTS, type StoryEvent} from './story-timeline';

type Row = {
  id: string;
  year: number;
  title: string;
  description: string;
  image_url: string;
  accent: string;
  sort_order: number;
};

function rowToEvent(row: Row): StoryEvent {
  return {
    id: row.id,
    year: row.year,
    title: row.title ?? '',
    description: row.description ?? '',
    image_url: row.image_url || undefined,
    accent: row.accent || '#1f6fd4',
    sort_order: row.sort_order ?? 0
  };
}

export async function getStoryEvents(): Promise<StoryEvent[]> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('hero_owner_story_events')
      .select('id,year,title,description,image_url,accent,sort_order')
      .order('year', {ascending: false})
      .order('sort_order', {ascending: true});

    if (error) throw error;
    const rows = (data ?? []) as Row[];
    if (rows.length === 0) return DEFAULT_STORY_EVENTS;
    return rows.map(rowToEvent);
  } catch {
    return DEFAULT_STORY_EVENTS;
  }
}

export type StoryEventUpsert = {
  id?: string;
  year: number;
  title: string;
  description: string;
  image_url?: string;
  accent?: string;
  sort_order?: number;
};

export async function upsertStoryEvent(input: StoryEventUpsert) {
  const payload = {
    ...(input.id ? {id: input.id} : {}),
    year: input.year,
    title: input.title,
    description: input.description,
    image_url: input.image_url ?? '',
    accent: input.accent ?? '#1f6fd4',
    sort_order: input.sort_order ?? 0,
    updated_at: new Date().toISOString()
  };
  const {data, error} = await supabaseAdmin()
    .from('hero_owner_story_events')
    .upsert(payload, {onConflict: 'id'})
    .select('id,year,title,description,image_url,accent,sort_order')
    .single();
  if (error) throw error;
  return rowToEvent(data as Row);
}

export async function deleteStoryEvent(id: string) {
  const {error} = await supabaseAdmin()
    .from('hero_owner_story_events')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function reorderStoryEvents(orders: Array<{id: string; sort_order: number}>) {
  for (const item of orders) {
    const {error} = await supabaseAdmin()
      .from('hero_owner_story_events')
      .update({sort_order: item.sort_order, updated_at: new Date().toISOString()})
      .eq('id', item.id);
    if (error) throw error;
  }
}
