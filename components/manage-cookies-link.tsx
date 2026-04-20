'use client';

import {Cookie} from 'lucide-react';
import {openCookieConsent} from './cookie-consent';

/** Footer link that re-opens the CookieConsent banner at any time. */
export function ManageCookiesLink() {
  return (
    <button
      type="button"
      onClick={() => openCookieConsent()}
      className="inline-flex items-center gap-1 font-mono text-[10px] text-text-3 transition-colors hover:text-blue"
    >
      <Cookie size={11} strokeWidth={2} />
      Cookie პრეფერენციები
    </button>
  );
}
