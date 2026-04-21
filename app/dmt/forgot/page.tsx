'use client';

import Link from 'next/link';
import {Mail, ArrowLeft} from 'lucide-react';

export default function DmtForgotPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-2.5">
          <span className="inline-flex h-10 w-10 items-center justify-center rounded-md bg-navy text-[15px] font-bold text-white">
            D
          </span>
          <span className="text-xl font-bold tracking-tight text-navy">DMT</span>
        </div>

        <h1 className="mb-1 text-xl font-bold text-navy">პაროლის აღდგენა</h1>
        <p className="mb-5 text-[13px] text-text-2">
          ეს ფიჩა ჯერ არ არის აქტიური. დაუკავშირდი owner/admin-ს — ის შეუძლია შენი პაროლი გადააყენოს <Link href="/dmt/users" className="text-blue hover:underline">/dmt/users</Link>-დან.
        </p>

        <div className="rounded-[12px] border border-ora-bd bg-ora-lt p-5 text-[13px] text-ora">
          <div className="mb-2 flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase">
            <Mail size={12} /> email reset pending
          </div>
          <p className="leading-relaxed">
            Email-ით reset link-ის გაგზავნა დაემატება მაშინ, როცა SMTP კრედენციალები კონფიგურირდება (`EMAIL_*` env vars). ამ ფაზისთვის admin პირდაპირ ცვლის პაროლს user-management panel-იდან.
          </p>
        </div>

        <div className="mt-4 text-center">
          <Link
            href="/dmt/login"
            className="inline-flex items-center gap-1 text-[12px] text-text-3 hover:text-blue"
          >
            <ArrowLeft size={12} /> login-ზე დაბრუნება
          </Link>
        </div>
      </div>
    </div>
  );
}
