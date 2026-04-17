'use client';

import {useRouter} from 'next/navigation';
import {useTransition} from 'react';

export function LogoutButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await fetch('/api/admin/logout', {method: 'POST'});
          router.replace('/admin');
          router.refresh();
        })
      }
      className="text-fg-muted hover:text-danger"
    >
      Sign out
    </button>
  );
}
