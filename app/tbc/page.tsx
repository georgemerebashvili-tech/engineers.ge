import {redirect} from 'next/navigation';
import {getTbcSession} from '@/lib/tbc/auth';
import {TbcLoginForm} from './login-form';

export default async function TbcLoginPage() {
  const session = await getTbcSession();
  if (session) redirect('/tbc/app');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E6F2FB] to-[#E0F7F3] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <div className="mb-5 flex items-center justify-center gap-4">
          <img src="/tbc/logos/tbc.svg" alt="TBC" className="h-8 w-auto" />
          <span className="text-xl text-slate-300">×</span>
          <img src="/tbc/logos/dmt.png" alt="DMT" className="h-7 w-auto" />
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
