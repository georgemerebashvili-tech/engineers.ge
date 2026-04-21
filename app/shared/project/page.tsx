import type {Metadata} from 'next';
import {SharedProjectView} from '@/components/shared-project-view';

export const metadata: Metadata = {
  title: 'გაზიარებული პროექტი',
  description: 'engineers.ge — read-only პროექტის შიგთავსი გაზიარებული ბმულიდან',
  robots: {index: false, follow: false},
  alternates: {canonical: '/shared/project'}
};

export default function SharedProjectPage() {
  return <SharedProjectView />;
}
