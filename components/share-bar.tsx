'use client';

import {useEffect, useState, useSyncExternalStore} from 'react';
import {Facebook, Linkedin, Send, Link as LinkIcon, Check} from 'lucide-react';
import {useTranslations} from 'next-intl';

type Props = {
  url?: string;
  title?: string;
};

type ShareSettings = {
  visible: boolean;
  intro_text: string;
  facebook: boolean;
  x: boolean;
  linkedin: boolean;
  telegram: boolean;
  whatsapp: boolean;
  copy_link: boolean;
  facebook_url: string;
  x_url: string;
  linkedin_url: string;
  telegram_url: string;
  whatsapp_url: string;
};

const DEFAULT_INTRO = 'აცნობე ყველას 👉';

const ALL_ON: ShareSettings = {
  visible: true,
  intro_text: DEFAULT_INTRO,
  facebook: true,
  x: true,
  linkedin: true,
  telegram: true,
  whatsapp: true,
  copy_link: true,
  facebook_url: '',
  x_url: '',
  linkedin_url: '',
  telegram_url: '',
  whatsapp_url: ''
};

export function ShareBar({url, title = ''}: Props) {
  const [copied, setCopied] = useState(false);
  const [settings, setSettings] = useState<ShareSettings>(ALL_ON);
  const t = useTranslations('share');

  const windowHref = useSyncExternalStore(
    subscribeNoop,
    () => window.location.href,
    () => ''
  );
  const href = url ?? windowHref;

  useEffect(() => {
    let cancelled = false;
    fetch('/api/share/settings')
      .then((r) => (r.ok ? r.json() : null))
      .then((data: ShareSettings | null) => {
        if (!cancelled && data) setSettings(data);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const encoded = encodeURIComponent(href);
  const encodedTitle = encodeURIComponent(title);

  const pick = (override: string, fallback: string) =>
    override.trim() ? override.trim() : fallback;

  const allTargets = [
    {
      key: 'facebook' as const,
      name: 'Facebook',
      icon: Facebook,
      href: pick(
        settings.facebook_url,
        `https://www.facebook.com/sharer/sharer.php?u=${encoded}`
      )
    },
    {
      key: 'x' as const,
      name: 'X',
      icon: XIcon,
      href: pick(
        settings.x_url,
        `https://twitter.com/intent/tweet?url=${encoded}&text=${encodedTitle}`
      )
    },
    {
      key: 'linkedin' as const,
      name: 'LinkedIn',
      icon: Linkedin,
      href: pick(
        settings.linkedin_url,
        `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}`
      )
    },
    {
      key: 'telegram' as const,
      name: 'Telegram',
      icon: Send,
      href: pick(
        settings.telegram_url,
        `https://t.me/share/url?url=${encoded}&text=${encodedTitle}`
      )
    },
    {
      key: 'whatsapp' as const,
      name: 'WhatsApp',
      icon: WhatsAppIcon,
      href: pick(settings.whatsapp_url, `https://wa.me/?text=${encodedTitle}%20${encoded}`)
    }
  ] as const;

  const targets = allTargets.filter((tg) => settings[tg.key]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  if (!settings.visible) return null;

  const intro = settings.intro_text?.trim() || DEFAULT_INTRO;

  return (
    <div
      className="flex items-center gap-1.5 md:gap-2"
      aria-label={t('label')}
    >
      {intro && (
        <span className="hidden items-center text-xs font-semibold text-text-2 xl:inline-flex">
          {intro}
        </span>
      )}
      <div className="flex items-center gap-1 md:gap-2">
        {targets.map(({name, icon: Icon, href}) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg border hover:bg-surface-alt transition-colors"
          >
            <Icon size={16} />
          </a>
        ))}
        {settings.copy_link && (
          <button
            type="button"
            onClick={copy}
            aria-label={t('copy')}
            title={copied ? t('copied') : t('copy')}
            className="inline-flex h-7 w-7 md:h-9 md:w-9 items-center justify-center rounded-lg border hover:bg-surface-alt transition-colors"
          >
            {copied ? <Check size={16} /> : <LinkIcon size={16} />}
          </button>
        )}
      </div>
    </div>
  );
}

function subscribeNoop() {
  return () => {};
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
