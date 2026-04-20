import Link from 'next/link';
import {ForgotForm} from './forgot-form';

export const metadata = {
  title: 'პაროლის აღდგენა — TBC ინვენტარიზაცია',
  robots: {index: false, follow: false}
};

export default function TbcForgotPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E6F2FB] to-[#E0F7F3] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <h1 className="mb-1 text-center text-lg font-semibold text-slate-900">
          პაროლის აღდგენა
        </h1>
        <p className="mb-5 text-center text-xs text-slate-500">
          შეიყვანე username ან ელფოსტა — გამოგიგზავნით აღდგენის ბმულს
        </p>
        <ForgotForm />
        <div className="mt-5 text-center text-xs">
          <Link href="/tbc" className="text-[#0071CE] hover:underline">
            ← დაბრუნდი შესვლის გვერდზე
          </Link>
        </div>
      </div>
    </div>
  );
}
