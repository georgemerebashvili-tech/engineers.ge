import type {Metadata} from 'next';
import {ComposerPage} from '@/components/composer/composer-page';

export const metadata: Metadata = {
  title: 'Building Composer — engineers.ge',
  description: 'Compose stair, elevator, parking and corridor modules in a shared 3D building scene.'
};

export default function BuildingComposerRoute() {
  return <ComposerPage />;
}
