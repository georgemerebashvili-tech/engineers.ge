'use client';

import dynamic from 'next/dynamic';

const FanCoilCanvas = dynamic(() => import('./FanCoilCanvas'), {
  ssr: false,
  loading: () => (
    <div style={{ width: '100vw', height: '100vh', background: '#1f262d', display: 'grid', placeItems: 'center', color: '#61c8f2', fontSize: 13 }}>
      Loading…
    </div>
  ),
});

export default function FanCoilCanvasClient() {
  return <FanCoilCanvas />;
}
