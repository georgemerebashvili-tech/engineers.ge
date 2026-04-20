import type {Metadata} from 'next';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {ReferralsWorkspace} from './workspace';

export const metadata: Metadata = {
  title: 'მოწვევები',
  description: 'მოიწვიე ინჟინერი კოლეგები · 10₾ თითოეული რეგისტრაციაზე · 3000₾-მდე ერთ მონაწილეზე',
  alternates: {canonical: '/dashboard/referrals'},
  robots: {index: false, follow: true},
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'მოწვევები — engineers.ge',
    description: 'referral კაბინეტი — კონტაქტების დამატება, WhatsApp მოწვევა, ბალანსი',
    url: '/dashboard/referrals'
  }
};

export default function ReferralsPage() {
  return (
    <div className="mx-auto w-full max-w-[1120px] px-4 py-8 md:px-5 md:py-10">
      <Breadcrumbs
        className="mb-3"
        items={[{label: 'Dashboard', href: '/dashboard'}, {label: 'მოწვევები'}]}
      />
      <ReferralsWorkspace />
    </div>
  );
}
