import 'server-only';
import {supabaseAdmin} from '@/lib/supabase/admin';
import {getCurrentDmtUser, type DmtRole} from '@/lib/dmt/auth';

export type DmtAuditAction =
  | 'login.success'
  | 'login.fail'
  | 'logout'
  | 'register.bootstrap'
  | 'register.invite'
  | 'user.update'
  | 'user.delete'
  | 'user.delete.denied'
  | 'password.reset.request'
  | 'password.reset.complete'
  | 'page.view'
  | 'fb_webhook.reveal'
  | 'fb_webhook.reveal_failed'
  | 'fb_webhook.update'
  | 'fb_webhook.update_failed';

export type DmtAuditEntity = 'dmt_user' | 'session' | 'system' | 'page' | 'secret';

export type DmtAuditInput = {
  action: DmtAuditAction;
  entity_type: DmtAuditEntity;
  entity_id?: string | null;
  payload?: Record<string, unknown>;
  // Actor overrides — needed for login/register where session doesn't exist yet.
  actor_id?: string | null;
  actor_email?: string | null;
  actor_role?: DmtRole | null;
  // Request metadata
  ip?: string | null;
  user_agent?: string | null;
};

export type DmtAuditRow = {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  actor_role: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  payload: Record<string, unknown>;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export function extractRequestMeta(req: Request): {ip: string | null; user_agent: string | null} {
  const h = req.headers;
  const fwd = h.get('x-forwarded-for');
  const ip = (fwd ? fwd.split(',')[0].trim() : h.get('x-real-ip')) || null;
  const user_agent = h.get('user-agent') || null;
  return {ip, user_agent};
}

export async function logDmtAudit(input: DmtAuditInput): Promise<void> {
  try {
    let actor_id = input.actor_id ?? null;
    let actor_email = input.actor_email ?? null;
    let actor_role = input.actor_role ?? null;

    if (!actor_id && !actor_email) {
      const me = await getCurrentDmtUser();
      if (me) {
        actor_id = me.id;
        actor_email = me.email;
        actor_role = me.role;
      }
    }

    const {error} = await supabaseAdmin()
      .from('dmt_audit_log')
      .insert({
        actor_id,
        actor_email,
        actor_role,
        action: input.action,
        entity_type: input.entity_type,
        entity_id: input.entity_id ?? null,
        payload: (input.payload ?? {}) as never,
        ip: input.ip ?? null,
        user_agent: input.user_agent ?? null
      });

    if (error) {
      // Don't throw — audit must not block the primary action. Log to server console.
      console.error('[dmt_audit_log] insert failed:', error.message, input.action);
    }
  } catch (e) {
    console.error('[dmt_audit_log] unexpected:', e instanceof Error ? e.message : e);
  }
}

export type ListAuditParams = {
  limit?: number;
  offset?: number;
  actor_id?: string;
  action?: string;
  entity_type?: string;
  from?: string; // ISO timestamp
  to?: string;
};

export async function listDmtAudit(p: ListAuditParams = {}): Promise<{
  rows: DmtAuditRow[];
  total: number;
}> {
  const limit = Math.min(Math.max(p.limit ?? 50, 1), 500);
  const offset = Math.max(p.offset ?? 0, 0);

  let q = supabaseAdmin()
    .from('dmt_audit_log')
    .select(
      'id,actor_id,actor_email,actor_role,action,entity_type,entity_id,payload,ip,user_agent,created_at',
      {count: 'exact'}
    )
    .order('created_at', {ascending: false})
    .range(offset, offset + limit - 1);

  if (p.actor_id) q = q.eq('actor_id', p.actor_id);
  if (p.action) q = q.eq('action', p.action);
  if (p.entity_type) q = q.eq('entity_type', p.entity_type);
  if (p.from) q = q.gte('created_at', p.from);
  if (p.to) q = q.lte('created_at', p.to);

  const {data, count, error} = await q;
  if (error || !data) return {rows: [], total: 0};
  return {rows: data as DmtAuditRow[], total: count ?? data.length};
}
