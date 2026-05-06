import type { Metadata } from 'next';
import { AhuAshrae } from '@/components/ahu-ashrae/AhuAshrae';

export const metadata: Metadata = {
  title: 'AHU სელექცია — ASHRAE Air Handling Unit Calculator | engineers.ge',
  description:
    'AHU სელექცია ASHRAE-ის მიხედვით — psychrometrics, cooling/heating coil, fan, filter, heat recovery (cross-flow / counter-flow / rotary). ASHRAE 62.1, ASHRAE 90.1.',
  alternates: { canonical: '/calc/ahu-ashrae' },
};

export default function AhuAshraePage() {
  return <AhuAshrae />;
}
