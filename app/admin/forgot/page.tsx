import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';
import {ForgotForm} from './form';

export const metadata = {title: 'პაროლის აღდგენა — engineers.ge admin'};

export default async function AdminForgotPage() {
  const session = await getSession();
  if (session) redirect('/admin/stats');
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="font-semibold text-lg">engineers.ge</div>
          <div className="text-sm text-fg-muted">ადმინის პაროლის აღდგენა</div>
        </div>
        <ForgotForm />
      </div>
    </div>
  );
}
