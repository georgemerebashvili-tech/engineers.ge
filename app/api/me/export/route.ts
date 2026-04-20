import {NextResponse, type NextRequest} from 'next/server';
import {z} from 'zod';
import {authenticateBody} from '@/lib/me-auth';
import {supabaseAdmin} from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const Body = z.object({
  email: z.string().email().max(200),
  password: z.string().min(1).max(200)
});

/**
 * GDPR "Right to Data Portability" (Art. 20) endpoint.
 *
 * POST /api/me/export — verifies password, returns all personal data we hold
 * as a single JSON payload (profile + referrals + contacts). No third-party
 * data included (analytics are aggregated / hashed, not personally-attributable).
 *
 * Returns `Content-Disposition: attachment` so browsers save the file directly.
 */
export async function POST(req: NextRequest) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }

  const auth = await authenticateBody(body);
  if (!auth.ok) {
    return NextResponse.json(
      {error: auth.error, message: auth.message},
      {status: auth.status}
    );
  }

  const userId = auth.user.id;
  const sb = supabaseAdmin();

  const [referredByRes, referralContactsRes, rewardsRes] = await Promise.all([
    sb.from('users').select('id, email, name').eq('referred_by_user_id', userId),
    sb.from('referral_contacts').select('*').eq('referrer_user_id', userId).is('deleted_at', null).limit(1000),
    sb.from('referral_rewards').select('*').eq('user_id', userId).limit(1000)
  ]);

  const payload = {
    export_generated_at: new Date().toISOString(),
    export_version: 1,
    gdpr_article: 'GDPR Article 20 — Right to data portability',
    self_service: 'https://engineers.ge/dashboard/profile',
    account: {
      id: auth.user.id,
      email: auth.user.email,
      name: auth.user.name,
      profession: auth.user.profession,
      language: auth.user.language,
      country_id: auth.user.country_id,
      interests: auth.user.interests,
      source: auth.user.source,
      ref_code: auth.user.ref_code,
      registered_at: auth.user.registered_at,
      last_login_at: auth.user.last_login_at,
      email_verified: auth.user.email_verified,
      verified_engineer: auth.user.verified_engineer ?? false,
      project_count: auth.user.project_count,
      notes: auth.user.notes,
      deleted_at: auth.user.deleted_at
    },
    referred_users: (referredByRes.data ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name
    })),
    referral_contacts: referralContactsRes.data ?? [],
    referral_rewards: rewardsRes.data ?? [],
    notes: {
      page_views:
        'აგრეგირებული სტატისტიკა (IP+UA hash, რომელიც personally-identifiable არ არის) — არ ექცევა ამ ექსპორტში',
      rate_limits: 'shorth-lived, ანონიმიზებული — არ ექცევა',
      admin_audit_log: 'წვდომა გვაქვს მხოლოდ admin-ს; ცხადი personal data არ ინახება'
    }
  };

  const json = JSON.stringify(payload, null, 2);
  return new NextResponse(json, {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Disposition': `attachment; filename="engineers-ge-export-${userId}.json"`,
      'Cache-Control': 'no-store'
    }
  });
}
