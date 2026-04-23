import {redirect} from 'next/navigation';
import {getConstructionSession} from '@/lib/construction/auth';
import {ConstructionLoginForm} from './login-form';

export default async function ConstructionLoginPage() {
  const session = await getConstructionSession();
  if (session) redirect('/construction/app');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#475569] text-white shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 2l10 20H2z" />
              <path d="M10 14h4v8h-4z" />
            </svg>
          </div>
          <div className="text-center">
            <div className="text-lg font-extrabold tracking-tight text-slate-900">KAYA Construction</div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">× DMT</div>
          </div>
        </div>
        <h1 className="mb-1 text-center text-base font-semibold text-slate-900">
          ობიექტების ინვენტარიზაცია
        </h1>
        <p className="mb-6 text-center text-xs text-slate-500">
          შესვლისთვის გამოიყენე შენი მომხმარებელი და პაროლი
        </p>
        <ConstructionLoginForm />

        <div className="mt-6 space-y-2 rounded-lg bg-slate-50 p-3 text-[11px] leading-relaxed text-slate-600 ring-1 ring-slate-200">
          <div className="flex items-start gap-2">
            <span className="shrink-0">🔒</span>
            <div>
              <b>პაროლი დაშიფრულია bcrypt-ით</b> (cost 10, salted hash).
              ორიგინალი პაროლი ბაზაში არ ინახება და მისი აღდგენა
              მათემატიკურად შეუძლებელია.
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="shrink-0">📋</span>
            <div>
              შესვლით ეთანხმები{' '}
              <a href="/construction/nda" className="font-semibold text-[#475569] hover:underline">
                კონფიდენციალურობის (NDA)
              </a>{' '}
              წესებს.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
