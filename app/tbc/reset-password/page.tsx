import Link from 'next/link';
import {ResetForm} from './reset-form';

export const metadata = {
  title: 'ახალი პაროლი — TBC ინვენტარიზაცია',
  robots: {index: false, follow: false}
};

export default async function TbcResetPage({
  searchParams
}: {
  searchParams: Promise<{token?: string}>;
}) {
  const {token} = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#E6F2FB] to-[#E0F7F3] p-6">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl ring-1 ring-slate-200">
        <h1 className="mb-1 text-center text-lg font-semibold text-slate-900">
          ახალი პაროლის დაყენება
        </h1>
        {!token ? (
          <p className="mt-4 rounded-md bg-red-50 px-3 py-2 text-center text-xs text-red-600 ring-1 ring-red-100">
            ბმული არასწორია ან ვადა გასული.
          </p>
        ) : (
          <>
            <p className="mb-5 text-center text-xs text-slate-500">
              შეიყვანე ახალი პაროლი — მინიმუმ 6 სიმბოლო
            </p>
            <ResetForm token={token} />
          </>
        )}
        <div className="mt-5 text-center text-xs">
          <Link href="/tbc" className="text-[#0071CE] hover:underline">
            ← შესვლის გვერდი
          </Link>
        </div>
      </div>
    </div>
  );
}
