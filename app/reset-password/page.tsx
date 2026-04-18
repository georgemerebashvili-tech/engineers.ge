import {Suspense} from 'react';
import {ResetPasswordForm} from './form';

export const metadata = {title: 'პაროლის აღდგენა · engineers.ge'};
export const dynamic = 'force-dynamic';

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-56px)] max-w-md flex-col items-center justify-center px-4 py-10">
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
