import type {Metadata} from 'next';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {ProfileWorkspace} from './workspace';

export const metadata: Metadata = {
  title: 'პროფილი',
  description: 'მომხმარებლის პროფილის მართვა — სახელი, ელ-ფოსტა, პაროლი, interests',
  alternates: {canonical: '/dashboard/profile'},
  robots: {index: false, follow: false}
};

export default function ProfilePage() {
  return (
    <div className="mx-auto w-full max-w-[920px] px-4 py-8 md:px-5 md:py-10">
      <Breadcrumbs
        className="mb-3"
        items={[{label: 'Dashboard', href: '/dashboard'}, {label: 'პროფილი'}]}
      />
      <ProfileWorkspace />
    </div>
  );
}
