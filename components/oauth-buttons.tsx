'use client';

import {useState} from 'react';
import {supabaseBrowser} from '@/lib/supabase/browser';

type Provider = 'google' | 'facebook' | 'linkedin_oidc';

const PROVIDERS: {
  id: Provider;
  label: string;
  color: string;
  svg: React.ReactNode;
}[] = [
  {
    id: 'google',
    label: 'Google',
    color: 'border-bdr bg-sur text-navy hover:bg-sur-2',
    svg: (
      <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.77.42 3.44 1.18 4.93l3.66-2.83z"
        />
        <path
          fill="#EA4335"
          d="M12 5.38c1.62 0 3.07.56 4.2 1.64l3.15-3.15C17.45 2.1 14.97 1 12 1A11 11 0 0 0 2.18 7.07l3.66 2.83C6.71 7.3 9.14 5.38 12 5.38z"
        />
      </svg>
    )
  },
  {
    id: 'facebook',
    label: 'Facebook',
    color: 'border-[#1877F2] bg-[#1877F2] text-white hover:opacity-90',
    svg: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.51 1.5-3.9 3.78-3.9 1.1 0 2.24.2 2.24.2v2.46H15.2c-1.24 0-1.63.77-1.63 1.57V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
      </svg>
    )
  },
  {
    id: 'linkedin_oidc',
    label: 'LinkedIn',
    color: 'border-[#0A66C2] bg-[#0A66C2] text-white hover:opacity-90',
    svg: (
      <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden>
        <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5zM3 9h4v12H3zM9 9h3.8v1.7h.06c.53-1 1.82-2.05 3.75-2.05C20.6 8.65 21 11 21 14.26V21h-4v-5.99c0-1.43-.03-3.27-2-3.27-2 0-2.3 1.56-2.3 3.17V21H9z" />
      </svg>
    )
  }
];

export function OAuthButtons({
  next = '/',
  onError
}: {
  next?: string;
  onError?: (msg: string) => void;
}) {
  const [loading, setLoading] = useState<Provider | null>(null);

  async function signIn(provider: Provider) {
    setLoading(provider);
    try {
      const sb = supabaseBrowser();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;
      const {error} = await sb.auth.signInWithOAuth({
        provider,
        options: {redirectTo}
      });
      if (error) throw error;
    } catch (e) {
      setLoading(null);
      const msg =
        e instanceof Error ? e.message : 'OAuth provider-თან კავშირი ვერ დამყარდა';
      onError?.(msg);
    }
  }

  return (
    <div className="space-y-2">
      {PROVIDERS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => signIn(p.id)}
          disabled={loading !== null}
          className={`inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border px-4 text-[13px] font-semibold transition-colors disabled:opacity-50 ${p.color}`}
        >
          {p.svg}
          <span>
            {loading === p.id ? 'იტვირთება…' : `${p.label}-ით შესვლა`}
          </span>
        </button>
      ))}
    </div>
  );
}
