import type { Metadata } from 'next';
import FanCoilHydraulicCalculatorClient from '@/components/fan-coil-hydraulics/FanCoilHydraulicCalculatorClient';

export const metadata: Metadata = {
  title: 'ფ/კ ჰიდრავლიკა — Fan Coil Water Hydraulic Calculator | engineers.ge',
  description:
    '2-pipe / 4-pipe ფანქოილის წყლის ჰიდრავლიკის კალკულატორი — ნაკადი, სიჩქარე, წნევის ვარდნა, კრიტიკული მარშრუტი, ტუმბოს სათავე.',
  alternates: { canonical: '/calc/fan-coil-hydraulics' },
};

export default function FanCoilHydraulicsPage() {
  return <FanCoilHydraulicCalculatorClient />;
}
