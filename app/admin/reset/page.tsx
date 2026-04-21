import {redirect} from 'next/navigation';
import {getSession} from '@/lib/auth';
import {peekAdminResetToken} from '@/lib/admin-password-reset';
import {ResetForm} from './form';

export const metadata = {title: 'პაროლის შეცვლა — engineers.ge admin'};

export const dynamic = 'force-dynamic';

export default async function AdminResetPage({
  searchParams
}: {
  searchParams: Promise<{token?: string}>;
}) {
  const session = await getSession();
  if (session) redirect('/admin/stats');

  const {token} = await searchParams;
  const invalid = !token;
  const peek = token ? await peekAdminResetToken(token) : null;
  const reasonMsg: Record<string, string> = {
    not_found: 'ბმული არ მოიძებნა.',
    already_used: 'ბმული უკვე გამოყენებულია.',
    expired: 'ბმულს ვადა გაუვიდა — მოითხოვე ახალი.'
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <div className="font-semibold text-lg">engineers.ge</div>
          <div className="text-sm text-fg-muted">ახალი პაროლის დაყენება</div>
        </div>
        {invalid ? (
          <p className="text-sm text-danger text-center">ბმული არასწორია.</p>
        ) : peek && !peek.ok ? (
          <div className="space-y-4 text-center">
            <p className="text-sm text-danger">
              {reasonMsg[peek.reason] ?? 'ბმული არავალიდურია.'}
            </p>
            <a
              href="/admin/forgot"
              className="inline-block text-xs text-accent hover:underline"
            >
              ახალი ბმულის მოთხოვნა →
            </a>
          </div>
        ) : (
          <ResetForm token={token!} />
        )}
      </div>
    </div>
  );
}
