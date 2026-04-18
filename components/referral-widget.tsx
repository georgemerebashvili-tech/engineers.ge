'use client';

import {useEffect, useState} from 'react';
import Link from 'next/link';
import {
  X,
  Coins,
  Users,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Facebook,
  Linkedin,
  Send,
  Link as LinkIcon,
  Check,
  Share2
} from 'lucide-react';

const DISMISS_KEY = 'eng_referral_widget_dismissed';
const DISMISS_DAYS = 30;

const DEFAULT_LONG = 'იშოვე 3000 ლარამდე';
const DEFAULT_SHORT = '3000 ₾';

export function ReferralWidget() {
  const [hidden, setHidden] = useState(true);
  const [open, setOpen] = useState(false);
  const [adEnabled, setAdEnabled] = useState(true);
  const [longText, setLongText] = useState(DEFAULT_LONG);
  const [shortText, setShortText] = useState(DEFAULT_SHORT);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw) {
        const ts = Number(raw);
        if (Date.now() - ts < DISMISS_DAYS * 86400 * 1000) return;
      }
    } catch {}
    setHidden(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/donate/info')
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data) return;
        if (typeof data.ad_visible === 'boolean') setAdEnabled(data.ad_visible);
        if (typeof data.ad_text_long === 'string' && data.ad_text_long.trim()) {
          setLongText(data.ad_text_long);
        }
        if (typeof data.ad_text_short === 'string' && data.ad_text_short.trim()) {
          setShortText(data.ad_text_short);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setHidden(true);
  };

  if (hidden || !adEnabled) return null;

  return (
    <>
      <div className="fixed bottom-4 right-4 z-[90] flex items-stretch gap-1 md:bottom-5 md:right-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="group relative inline-flex items-center gap-2 rounded-full border border-blue-bd bg-blue pl-2.5 pr-3.5 py-2 text-[12.5px] font-semibold text-white shadow-[0_4px_14px_rgba(31,111,212,0.35)] transition-colors hover:bg-navy-2"
          aria-label={`სარეკლამო აქცია — ${longText}`}
        >
          <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-white/20">
            <Coins size={14} strokeWidth={2} />
          </span>
          <span className="hidden md:inline">{longText}</span>
          <span className="inline md:hidden">{shortText}</span>
          <span className="ml-1 hidden md:inline-flex items-center gap-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-white/80">
            <Sparkles size={10} /> აქცია
          </span>
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label="დახურვა"
          title="30 დღით დამალვა"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-bdr bg-sur text-text-3 shadow-sticky transition-colors hover:border-blue hover:text-blue"
        >
          <X size={14} />
        </button>
      </div>

      {open && <RulesModal onClose={() => setOpen(false)} />}
    </>
  );
}

function RulesModal({onClose}: {onClose: () => void}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="მოიწვიე ინჟინრები — წესები"
      onClick={onClose}
      className="fixed inset-0 z-[200] flex items-start justify-center bg-navy/40 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative my-auto w-full max-w-[640px] overflow-hidden rounded-[var(--radius-card)] border border-bdr bg-sur shadow-[var(--shadow-modal)]"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="დახურვა"
          className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full text-text-3 transition-colors hover:bg-sur-2 hover:text-navy"
        >
          <X size={16} />
        </button>

        <div className="border-b border-bdr bg-sur-2 px-6 pt-6 pb-5 md:px-8 md:pt-8">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.08em] text-blue">
            <Coins size={12} />
            REFERRAL · აქცია
          </span>
          <h2 className="mt-3 text-[22px] font-bold leading-snug text-navy md:text-[24px]">
            მოიწვიე ინჟინრები, იშოვე <span className="text-blue">3000 ლარამდე</span>
          </h2>
          <p className="mt-1.5 text-[13px] leading-relaxed text-text-2">
            ჩვენ დაგეხმარებით და გაგიმარტივებთ — მოიწვიე ინჟინერი კოლეგები
            engineers.ge-ზე და ყოველი რეგისტრაციისთვის დაგერიცხება გასამრჯელო.
          </p>
        </div>

        <div className="space-y-4 px-6 py-5 md:px-8 md:py-6 max-h-[60vh] overflow-y-auto">
          <Rule
            icon={<Coins size={15} className="text-blue" />}
            title="რას მიიღებ"
          >
            გიორგი მერებაშვილი, კეთილი საქმის პოპულარიზაციის მიზნით, გარკვეულ
            პერიოდში დახმარების სანაცვლოდ მზადაა გადაიხადოს გასამრჯელო:{' '}
            <strong>10 ლარი</strong> თითოეულ უნიკალურ, რეგისტრირებულ კონტაქტზე.
            მაქსიმალური თანხა ერთ მონაწილეზე — <strong>3000 ლარი</strong> (300
            კონტაქტი).
          </Rule>

          <Rule
            icon={<Users size={15} className="text-blue" />}
            title="როგორ მუშაობს"
          >
            <ol className="list-decimal pl-5 space-y-1">
              <li>შედიხარ „მოწვევის კაბინეტში" და ამატებ კონტაქტებს (სახელი, კატეგორია, ტელეფონი, ელფოსტა).</li>
              <li>სისტემა გიმზადებს WhatsApp-ის ლინკს პერსონალიზებული მოწვევით.</li>
              <li>კონტაქტი რეგისტრირდება engineers.ge-ზე → სტატუსი ავტომატურად იცვლება <span className="font-semibold text-grn">რეგისტრირებულზე</span>.</li>
              <li>ყოველი რეგისტრაცია = +10 ლარი შენს ბალანსზე.</li>
            </ol>
          </Rule>

          <Rule
            icon={<ShieldCheck size={15} className="text-blue" />}
            title="უნიკალურობის შემოწმება"
          >
            სისტემა ჯვარედინად ამოწმებს ელფოსტასა და ტელეფონის ნომერს
            რეგისტრირებული მომხმარებლების ბაზაში. ერთი და იგივე კონტაქტი
            რამდენიმე მონაწილისთვის არ ჩაითვლება — აღრიცხულია, ვინ მოიწვია{' '}
            <strong>პირველად</strong>. მოწვეულმა უნდა გაიაროს რეგისტრაცია და
            დაეთანხმოს სამომხმარებლო წესებს (ეს უკვე სტანდარტია engineers.ge-ზე).
          </Rule>

          <div className="rounded-[var(--radius-card)] border border-bdr bg-sur-2 p-3.5">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-wider text-text-3">
              მონაცემთა დაცვა
            </p>
            <p className="mt-1 text-[12.5px] leading-relaxed text-text-2">
              კონტაქტის ტელეფონი ნაგულისხმევად <strong>ერთჯერადია</strong> —
              WhatsApp-ით მოწვევის გაგზავნის შემდეგ იშლება ბაზიდან. სურვილის
              შემთხვევაში შეგიძლია მოხსნა მონიშვნა „ერთჯერადი ტელეფონისთვის" —
              ამ შემთხვევაში ძალაში შედის პერსონალური მონაცემების დამუშავების
              პოლიტიკა.
            </p>
          </div>
        </div>

        <div className="border-t border-bdr bg-sur px-6 py-4 md:px-8">
          <ShareSection />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-bdr bg-sur-2 px-6 py-4 md:px-8">
          <span className="font-mono text-[10px] text-text-3">
            წესები ძალაშია 2026-04-18-დან. პირობები შეიძლება შეიცვალოს —
            წინასწარ გაცნობებთ.
          </span>
          <Link
            href="/dashboard/referrals"
            onClick={onClose}
            className="inline-flex h-10 items-center gap-1.5 rounded-md bg-blue px-4 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2"
          >
            მოიწვიე ახლა
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Rule({
  icon,
  title,
  children
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex items-start gap-3">
      <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] border border-blue-bd bg-blue-lt">
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-[13px] font-bold text-navy">{title}</h3>
        <div className="mt-1 text-[13px] leading-relaxed text-text-2">{children}</div>
      </div>
    </section>
  );
}

function ShareSection() {
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState('https://engineers.ge');

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      setShareUrl(window.location.origin);
    }
  }, []);

  const title =
    'engineers.ge — მოიწვიე ინჟინრები და იშოვე 3000 ლარამდე. უფასო საინჟინრო კალკულატორები და აქცია.';
  const encoded = encodeURIComponent(shareUrl);
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
  ];

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <section className="rounded-[var(--radius-card)] border border-blue-bd bg-blue-lt p-3.5">
      <div className="flex items-center gap-2">
        <Share2 size={14} className="text-blue" />
        <h3 className="text-[13px] font-bold text-navy">გააზიარე აქცია</h3>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed text-text-2">
        რაც უფრო მეტი ადამიანი შემოვა — მით უფრო მეტი კონტაქტი დარეგისტრირდება
        და გაიზრდება შენი შემოსავალი. გააზიარე ფეისბუქზე, ლინკდინზე, ჯგუფებში.
      </p>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {targets.map(({name, icon: Icon, href}) => (
          <a
            key={name}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={name}
            title={name}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-blue-bd bg-sur text-text-2 transition-colors hover:border-blue hover:text-blue"
          >
            <Icon size={16} />
          </a>
        ))}
        <button
          type="button"
          onClick={copy}
          aria-label="ლინკის კოპირება"
          title={copied ? 'დაკოპირდა' : 'ლინკის კოპირება'}
          className={`inline-flex h-9 items-center gap-1.5 rounded-md border px-2.5 text-[11.5px] font-semibold transition-colors ${
            copied
              ? 'border-grn-bd bg-grn-lt text-grn'
              : 'border-blue-bd bg-sur text-text-2 hover:border-blue hover:text-blue'
          }`}
        >
          {copied ? <Check size={14} /> : <LinkIcon size={14} />}
          {copied ? 'დაკოპირდა' : 'ლინკი'}
        </button>
      </div>
    </section>
  );
}

function XIcon({size = 16}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M18.244 2H21l-6.52 7.454L22 22h-6.844l-4.77-6.24L4.8 22H2l7-8.02L2 2h6.98l4.3 5.69L18.244 2Zm-1.196 18h1.86L7.03 4H5.06l11.988 16Z" />
    </svg>
  );
}

function WhatsAppIcon({size = 16}: {size?: number}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M19.11 4.9A9.82 9.82 0 0 0 12.04 2C6.58 2 2.13 6.45 2.13 11.9c0 1.75.46 3.46 1.33 4.96L2 22l5.26-1.38a9.9 9.9 0 0 0 4.77 1.22h.01c5.46 0 9.9-4.45 9.9-9.9 0-2.64-1.03-5.12-2.83-7.04Zm-7.07 15.25h-.01a8.22 8.22 0 0 1-4.18-1.15l-.3-.18-3.12.82.83-3.04-.19-.31a8.22 8.22 0 0 1-1.26-4.39c0-4.54 3.7-8.23 8.23-8.23a8.19 8.19 0 0 1 5.82 2.41 8.18 8.18 0 0 1 2.4 5.82c0 4.54-3.69 8.25-8.22 8.25Zm4.5-6.15c-.25-.12-1.46-.72-1.68-.8-.23-.08-.39-.12-.56.12-.17.25-.64.8-.78.96-.14.17-.29.19-.54.06-.25-.12-1.04-.38-1.97-1.22-.73-.65-1.22-1.45-1.36-1.7-.14-.25-.02-.38.11-.5.11-.11.25-.29.37-.43.12-.14.16-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.35-.77-1.85-.2-.48-.41-.42-.57-.43-.15-.01-.32-.01-.48-.01-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.6.12.17 1.77 2.7 4.3 3.79.6.26 1.07.41 1.43.53.6.19 1.15.16 1.58.1.48-.07 1.46-.6 1.67-1.18.21-.58.21-1.07.15-1.17-.06-.1-.23-.17-.48-.3Z" />
    </svg>
  );
}
