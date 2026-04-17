'use client';

import {useEffect, useState} from 'react';
import {Facebook, Linkedin, Send, Link as LinkIcon, Check} from 'lucide-react';
import {useTranslations} from 'next-intl';

type Props = {
  url?: string;
  title?: string;
};

export function ShareBar({url, title = ''}: Props) {
  const [copied, setCopied] = useState(false);
  const [href, setHref] = useState(url ?? '');
  const t = useTranslations('share');

  useEffect(() => {
    if (!url && typeof window !== 'undefined') {
      setHref(window.location.href);
    }
  }, [url]);

  const encoded = encodeURIComponent(href);
  const encodedTitle = encodeURIComponent(title);

  const targets = [
    {
      name: 'Facebook',
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
    },
    {
      name: 'X',
      icon: XIcon,
      href: `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
    },
    {
      name: 'Telegram',
      icon: Send,
      href: `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`
    },
    {
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      href: `https://wa.me/?text=${encodedTitle}%20${encoded}`
    }
  ] as const;

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="flex items-center gap-2" aria-label={t('label')}>
      {targets.map(({name, icon: Icon, href}) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={name}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-surface-alt transition-colors"
        >
          <Icon size={18} />
        </a>
      ))}
      <button
        type="button"
        onClick={copy}
        aria-label={t('copy')}
        title={copied ? t('copied') : t('copy')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border hover:bg-surface-alt transition-colors"
      >
        {copied ? <Check size={18} /> : <LinkIcon size={18} />}
      </button>
    </div>
  );
}

function XIcon({size = 18}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.454L22 22h-6.844l-4.77-6.24L4.8 22H2l7-8.02L2 2h6.98l4.3 5.69L18.244 2Zm-1.196 18h1.86L7.03 4H5.06l11.988 16Z" />
    </svg>
  );
}

function WhatsAppIcon({size = 18}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.11 4.9A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.9c0 1.75.46 3.46 1.33 4.96L2 22l5.26-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.46 0 9.9-4.45 9.9-9.9 0-2.64-1.03-5.12-2.83-7.04Zm-7.07 15.25h-.01a8.22 8.22 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.22 8.22 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.23-8.23a8.19 8.19 0 0 1 5.82 2.41 8.18 8.18 0 0 1 2.4 5.82c0 4.54-3.69 8.25-8.22 8.25Zm4.5-6.15c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.97-1.22-.73-.65-1.22-1.45-1.36-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.57-.43-.15-.01-.32-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.17-.06-.1-.23-.17-.48-.3Z" />
    </svg>
  );
}
