import Link from 'next/link';
import {ConstructionForgotForm} from './forgot-form';

export default function ConstructionForgotPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E3F2FD] to-[#BBDEFB] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-5 flex flex-col items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#1565C0] text-white">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 22 12 2l10 20H2z" /><path d="M10 14h4v8h-4z" />
            </svg>
          </div>
          <div className="text-center text-sm font-bold text-slate-900">KAYA Construction</div>
        </div>
        <h1 className="mb-1 text-center text-base font-semibold text-slate-900">
          პაროლის აღდგენა
        </h1>
        <p className="mb-6 text-center text-xs text-slate-500">
          შეიყვანე username ან ელფოსტა — გამოგიგზავნით ბმულს
        </p>
        <ConstructionForgotForm />
        <div className="mt-4 text-center text-xs">
          <Link href="/construction" className="text-slate-500 hover:text-[#1565C0] hover:underline">
            ← შესვლა
          </Link>
        </div>
      </div>
    </div>
  );
}
