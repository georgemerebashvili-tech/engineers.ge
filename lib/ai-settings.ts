import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';

export type AiSettings = {
  anthropic_api_key: string | null;
  default_model: string;
  enabled: boolean;
  updated_at: string;
};

export async function getAiSettings(): Promise<AiSettings | null> {
  try {
    const {data, error} = await supabaseAdmin()
      .from('ai_settings')
      .select('anthropic_api_key,default_model,enabled,updated_at')
      .eq('id', 1)
      .maybeSingle();
    if (error) throw error;
    return (data as AiSettings) ?? null;
  } catch {
    return null;
  }
}

export async function updateAiSettings(patch: Partial<AiSettings>) {
  const {data, error} = await supabaseAdmin()
    .from('ai_settings')
    .update({...patch, updated_at: new Date().toISOString()})
    .eq('id', 1)
    .select('anthropic_api_key,default_model,enabled,updated_at')
    .single();
  if (error) throw error;
  return data as AiSettings;
}

export async function resolveAnthropicKey(): Promise<string | null> {
  const settings = await getAiSettings();
  if (settings?.anthropic_api_key) return settings.anthropic_api_key;
  return process.env.ANTHROPIC_API_KEY ?? null;
}

export async function resolveAiModel(): Promise<string> {
  const settings = await getAiSettings();
  return settings?.default_model ?? 'claude-haiku-4-5-20251001';
}

export async function isAiEnabled(): Promise<boolean> {
  const settings = await getAiSettings();
  return settings?.enabled ?? true;
}
