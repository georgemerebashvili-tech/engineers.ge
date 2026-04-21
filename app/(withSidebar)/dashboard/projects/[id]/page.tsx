import type {Metadata} from 'next';
import {BuildingDetail} from '@/components/building-detail';

export const metadata: Metadata = {
  title: 'პროექტი',
  description: 'პროექტზე მიბმული კალკულაციები',
  robots: {index: false, follow: true}
};

export default async function BuildingDetailPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return <BuildingDetail buildingId={id} />;
}
