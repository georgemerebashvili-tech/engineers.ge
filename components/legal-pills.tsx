'use client';

import {useEffect, useState, type ReactNode} from 'react';
import {Shield, UserCog, X} from 'lucide-react';
import {Container} from './container';

type ModalKey = 'privacy' | 'data' | null;

type Section = {heading: string; body: ReactNode};

type ModalContent = {
  icon: typeof Shield;
  title: string;
  subtitle: string;
  sections: Section[];
};

const CONTENT: Record<Exclude<ModalKey, null>, ModalContent> = {
  privacy: {
    icon: Shield,
    title: 'კონფიდენციალურობის პოლიტიკა',
    subtitle: 'engineers.ge',
    sections: [
      {
        heading: 'რას არ ვინახავთ',
        body: (
          <>
            პერსონალურ მონაცემებს არ ვინახავთ. ჩვენი ანალიტიკა აღრიცხავს
            მხოლოდ <strong>ანონიმურ</strong> მეტრიკებს (page views, visitor hash,
            country). IP მისამართი <strong>არ ინახება</strong> — ვიყენებთ
            SHA-256(IP + User-Agent) ჰეშს, რომელიც ვერ გადაიხსნება უკან.
          </>
        )
      },
      {
        heading: 'ყველაფერი იანგარიშება შენს ბრაუზერში',
        body: (
          <>
            კალკულატორები მუშაობენ <strong>client-side</strong>. შეყვანილი
            მნიშვნელობები შენი ბრაუზერის cookie/localStorage-ში ინახება —
            ჩვენს სერვერზე არასოდეს მოდის. შეგიძლია ინტერნეტი გათიშო და
            გამოთვლა მაინც გააგრძელო (გარდა PDF-ის გენერაციისა, რომელიც
            სერვერულ ხელსაწყოს იყენებს).
          </>
        )
      },
      {
        heading: 'რეგისტრაცია არასავალდებულოა',
        body: (
          <>
            ავტორიზაცია საჭიროა <strong>მხოლოდ</strong> PDF რეპორტის
            დასაბეჭდად, სასურველ კონფიგურაციებს cloud-ზე შენახვისთვის,
            ან Pro ფუნქციების გახსნისთვის. ძირითადი კალკულატორები
            უფასო და ღიაა ყველასთვის.
          </>
        )
      },
      {
        heading: 'Third-party tracking არ არის',
        body: (
          <>
            Google Analytics, Facebook Pixel, advertising cookies — არც ერთი
            არ გვაქვს. მხოლოდ first-party visitor_id cookie (UUID v4, 1 წელი),
            რომელიც აუცილებელია unique visitor-ის დასადგენად.
          </>
        )
      },
      {
        heading: 'კითხვებზე',
        body: (
          <>
            კონფიდენციალურობასთან დაკავშირებული ნებისმიერი კითხვა —{' '}
            <a className="text-blue underline" href="mailto:georgemerebashvili@gmail.com">
              georgemerebashvili@gmail.com
            </a>
          </>
        )
      }
    ]
  },
  data: {
    icon: UserCog,
    title: 'პერსონალური მონაცემები',
    subtitle: 'რას ვაკეთებთ და რას არა',
    sections: [
      {
        heading: 'რას ვაგროვებთ (მხოლოდ რეგისტრირებული მომხმარებლისთვის)',
        body: (
          <>
            მხოლოდ <strong>მინიმუმი</strong>: სახელი, ელ.ფოსტა და არჩეული ენა.
            რეგისტრაცია არის <strong>გასაღები</strong> რომელიც გიხსნის PDF / XLS
            ექსპორტის ფუნქციას. თავად ფაილებს (PDF, Excel, ანგარიშები) ჩვენ{' '}
            <strong>არ ვინახავთ არსად</strong> — ისინი რეალურ დროში გენერდება
            შენს ბრაუზერში, ჩამოგერთვა და ქრება. სერვერზე არაფერი რჩება.{' '}
            <strong>რეკლამისთვის არც ერთ მესამე მხარეს არ ვაძლევთ</strong>.
          </>
        )
      },
      {
        heading: 'სად ინახება',
        body: (
          <>
            Supabase (EU region, eu-central-1) — GDPR-compliant დატაბაზა +
            Vercel (EU edge). მონაცემები იცავება encryption-ით
            transit + at-rest (TLS + AES-256).
          </>
        )
      },
      {
        heading: 'ადგილობრივი მონაცემები',
        body: (
          <>
            კალკულატორის input state შენი ბრაუზერის cookie-ში (1 წელი).
            კონფიგურაციების JSON ფაილები შეგიძლია ჩამოწერო შენს
            კომპიუტერში — ისინი ჩვენს სერვერზე არ იგზავნება.
          </>
        )
      },
      {
        heading: 'შენი უფლებები (GDPR)',
        body: (
          <>
            ნებისმიერ დროს შეგიძლია მოითხოვო: მონაცემების გადმოწერა (JSON),
            კორექცია, წაშლა (right to be forgotten), მიწოდება სხვა
            სერვისზე. მოთხოვნა გააკეთე{' '}
            <a className="text-blue underline" href="mailto:georgemerebashvili@gmail.com">
              georgemerebashvili@gmail.com
            </a>
            -ზე; 30 დღის ვადაში ვპასუხობთ.
          </>
        )
      },
      {
        heading: 'cookie კონტროლი',
        body: (
          <>
            ბრაუზერში ნებისმიერ დროს შეგიძლია წაშალო ყველა cookie —
            ამის შემდეგ ფუნქციონალი შენარჩუნებულია, მაგრამ კალკულატორები
            გადააგდებს დამახსოვრებულ input-ებს.
          </>
        )
      },
    ]
  }
};

export function LegalPills() {
  const [modal, setModal] = useState<ModalKey>(null);

  useEffect(() => {
    if (!modal) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setModal(null);
    };
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [modal]);

  const active = modal ? CONTENT[modal] : null;
  const Icon = active?.icon;

  return (
    <>
      <div className="py-3 md:py-4">
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => setModal('privacy')}
              className="inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur px-3 py-1.5 font-medium text-text-2 transition-colors hover:border-blue hover:text-blue"
            >
              <Shield size={13} />
              კონფიდენციალურობის პოლიტიკა
            </button>
            <button
              type="button"
              onClick={() => setModal('data')}
              className="inline-flex items-center gap-1.5 rounded-full border border-bdr bg-sur px-3 py-1.5 font-medium text-text-2 transition-colors hover:border-blue hover:text-blue"
            >
              <UserCog size={13} />
              პერსონალური მონაცემები
            </button>
          </div>
        </Container>
      </div>

      {modal && active && Icon && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.title}
          onClick={() => setModal(null)}
          className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 backdrop-blur-sm p-4 md:p-8 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative my-auto w-full max-w-[620px] rounded-2xl bg-sur shadow-2xl overflow-hidden"
          >
            <button
              type="button"
              onClick={() => setModal(null)}
              aria-label="დახურვა"
              className="absolute top-3 right-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-sur-2 border text-text-2 hover:border-blue hover:text-blue transition-colors"
            >
              <X size={16} />
            </button>

            <div className="px-6 pt-6 pb-4 md:px-8 md:pt-8 border-b border-bdr">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[10px] border border-blue-bd bg-blue-lt text-blue">
                  <Icon size={20} strokeWidth={1.75} />
                </span>
                <div className="min-w-0">
                  <h2 className="text-xl md:text-2xl font-bold text-navy leading-tight">
                    {active.title}
                  </h2>
                  <p className="mt-0.5 font-mono text-[11px] uppercase tracking-[0.06em] text-text-3">
                    {active.subtitle}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-5 md:px-8 md:py-6 space-y-5 max-h-[70vh] overflow-y-auto">
              {active.sections.map((s, i) => (
                <section key={i}>
                  <h3 className="text-[13px] font-bold text-navy mb-1.5">
                    {s.heading}
                  </h3>
                  <p className="text-[13px] leading-relaxed text-text-2">
                    {s.body}
                  </p>
                </section>
              ))}
            </div>

            <div className="px-6 py-3.5 md:px-8 border-t border-bdr bg-sur-2 text-[11px] font-mono text-text-3">
              ბოლო განახლება: 2026-04-17 · engineers.ge
            </div>
          </div>
        </div>
      )}
    </>
  );
}
