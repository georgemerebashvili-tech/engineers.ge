import Link from 'next/link';
import {ArrowLeft, Home, Search} from 'lucide-react';
import type {Metadata} from 'next';
import {NotFoundReporter} from '@/components/not-found-reporter';

export const metadata: Metadata = {
  title: 'გვერდი ვერ მოიძებნა — engineers.ge',
  description: 'მოთხოვნილი გვერდი არ არსებობს ან გადატანილია. დაბრუნდი მთავარზე ან ხელსაწყოებზე.'
};

export default function NotFound() {
  return (
    <main className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <NotFoundReporter />
      <div className="w-full max-w-md text-center">
        <div className="mx-auto mb-6 inline-flex h-20 w-20 items-center justify-center rounded-full border border-dashed border-bdr bg-sur-2 text-text-3">
          <Search size={34} strokeWidth={1.5} />
        </div>

        <div className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.15em] text-ora">
          404 · NOT FOUND
        </div>
        <h1 className="mb-3 text-2xl font-bold text-navy md:text-3xl">
          გვერდი ვერ მოიძებნა
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-text-2">
          მოთხოვნილი მისამართი არ არსებობს ან გვერდი გადატანილია.
          შეამოწმე URL-ი, ან დაბრუნდი მთავარზე.
        </p>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Link
            href="/"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full bg-blue px-5 text-[13px] font-semibold text-white transition-colors hover:bg-navy-2"
          >
            <Home size={14} /> მთავარზე დაბრუნება
          </Link>
          <Link
            href="/#calculators"
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-bdr bg-sur px-5 text-[13px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
          >
            <ArrowLeft size={14} /> ხელსაწყოებზე
          </Link>
        </div>

        <p className="mt-8 font-mono text-[10px] text-text-3">
          engineers.ge · საინჟინრო ხელსაწყოები
        </p>
      </div>
    </main>
  );
}
