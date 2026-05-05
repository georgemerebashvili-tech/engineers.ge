import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'DMT Mobile'
};

export default function DmtMobileLayout({children}: {children: React.ReactNode}) {
  return <div className="min-h-screen bg-bg text-text">{children}</div>;
}
