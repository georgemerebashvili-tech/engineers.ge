import {redirect} from 'next/navigation';
import {getTbcSession} from '@/lib/tbc/auth';
import {TbcLoginForm} from './login-form';

export default async function TbcLoginPage() {
  const session = await getTbcSession();
  if (session) redirect('/tbc/app');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E6F2FB] to-[#E0F7F3] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-6 flex items-center justify-center gap-3">
          <div className="rounded-md border-2 border-[#0071CE] px-2.5 py-0.5 text-sm font-extrabold tracking-tight text-[#0071CE]">
            TBC
          </div>
          <span className="text-xl text-slate-300">×</span>
          <div className="flex items-center gap-1.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-gradient-to-br from-[#00AA8D] to-[#008A73] font-mono text-sm font-extrabold text-white">
              D
            </span>
            <span className="font-sans text-base font-bold text-slate-900">
              DMT
            </span>
          </div>
        </div>
        <h1 className="mb-1 text-center text-lg font-semibold text-slate-900">
          ფილიალების ინვენტარიზაცია
        </h1>
        <p className="mb-6 text-center text-xs text-slate-500">
          შესვლისთვის გამოიყენე შენი მომხმარებელი და პაროლი
        </p>
        <TbcLoginForm />
      </div>
    </div>
  );
}
