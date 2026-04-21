import type {Metadata} from 'next';
import {ProjectPrintView} from '@/components/project-print-view';

export const metadata: Metadata = {
  title: 'პროექტის რეპორტი · ბეჭდვა',
  robots: {index: false, follow: false}
};

export default async function ProjectPrintPage({params}: {params: Promise<{id: string}>}) {
  const {id} = await params;
  return <ProjectPrintView buildingId={id} />;
}
