import type {Metadata} from 'next';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {Container} from '@/components/container';
import {AdsSimulator} from '@/components/ads-simulator';
import {getHeroAdSlots} from '@/lib/hero-ads-store';

export const metadata: Metadata = {
  title: 'რეკლამა',
  description: 'engineers.ge Hero Ads ბანერის სიმულატორი — ნახე როგორ გამოიყურება შენი რეკლამა hero treemap-ში სხვადასხვა slot-ზე',
  alternates: {canonical: '/ads'},
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'რეკლამა — engineers.ge',
    description: 'Hero Ads ბანერის სიმულატორი — preview slots და size',
    url: '/ads'
  }
};
export const dynamic = 'force-dynamic';

export default async function AdsPage() {
  const slots = await getHeroAdSlots();

  return (
    <Container className="py-4 md:py-5">
      <Breadcrumbs className="mb-3" items={[{label: 'რეკლამა'}]} />
      <AdsSimulator slots={slots} />
    </Container>
  );
}
