import type {Metadata} from 'next';
import {Container} from '@/components/container';
import {FolderKanban} from 'lucide-react';
import {BuildingsHub} from '@/components/buildings-hub';

export const metadata: Metadata = {
  title: 'ჩემი პროექტები',
  description: 'შენი შენობის პროექტები ერთ ადგილას — დააკავშირე კედლის, თბოდანაკარგების და სხვა კალკულაციები',
  alternates: {canonical: '/dashboard/projects'},
  robots: {index: false, follow: true}
};

export default function ProjectsHubPage() {
  return (
    <Container className="py-6 md:py-8">
      <header className="mb-6">
        <div className="mb-1 inline-flex items-center gap-1.5 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          <FolderKanban size={11} /> PROJECTS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          ჩემი პროექტები
        </h1>
        <p className="mt-1 text-sm text-text-2">
          შექმენი პროექტი (მაგ. სპორტდარბაზი, სუპერმარკეტი), შემდეგ მიაბი კედლის U-ფაქტორი,
          თბოდანაკარგები და სხვა კალკულაციები — ერთ ადგილას.
        </p>
      </header>
      <BuildingsHub />
    </Container>
  );
}
