import {getHeroAdSlots} from '@/lib/hero-ads-store';
import {BannersPanel} from './panel';

export const dynamic = 'force-dynamic';
export const metadata = {title: 'ბანერები — Admin · engineers.ge'};

export default async function BannersPage() {
  const slots = await getHeroAdSlots();
  return <BannersPanel slots={slots} />;
}
