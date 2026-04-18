import {NextResponse} from 'next/server';
import {listCountries, upsertCountryByName} from '@/lib/users';
import {FALLBACK_COUNTRIES} from '@/lib/countries-fallback';
import {z} from 'zod';
import {getSession} from '@/lib/auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const countries = await listCountries();
    return NextResponse.json({countries, source: 'supabase'});
  } catch {
    // Supabase unreachable — serve the seeded list so the country picker
    // still works (names match migration 0007 seed data).
    return NextResponse.json({countries: FALLBACK_COUNTRIES, source: 'fallback'});
  }
}

const CreateBody = z.object({
  name_ka: z.string().min(2).max(120),
  name_en: z.string().min(2).max(120).optional(),
  code: z
    .string()
    .regex(/^[A-Z]{2}$/)
    .optional(),
  flag_emoji: z.string().max(8).optional()
});

// Allow creating a new country during registration (public) or admin.
// Public case is rate-limited by the register endpoint.
export async function POST(req: Request) {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  const parsed = CreateBody.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({error: 'bad_request'}, {status: 400});
  }
  try {
    const country = await upsertCountryByName(parsed.data);
    return NextResponse.json({country});
  } catch (e) {
    const isAdmin = !!(await getSession().catch(() => null));
    return NextResponse.json(
      {
        error: 'failed',
        message: isAdmin && e instanceof Error ? e.message : undefined
      },
      {status: 500}
    );
  }
}
