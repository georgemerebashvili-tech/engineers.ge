'use client';

import { useState, useEffect } from 'react';
import FanCoilHydraulicCalculator from './FanCoilHydraulicCalculator';

export default function FanCoilHydraulicCalculatorClient() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return (
    <div className="flex items-center justify-center text-sm text-gray-400"
         style={{ height: 'calc(100vh - 56px)' }}>
      Loading calculator…
    </div>
  );
  return <FanCoilHydraulicCalculator />;
}
