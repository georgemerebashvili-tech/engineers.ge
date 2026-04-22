import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'Audit · Sazeo — Engineers.ge',
  description: 'Sazeo audit workspace — internal blueprints & reports',
  robots: {index: false, follow: false}
};

export default function AuditSazeoLayout({children}: {children: React.ReactNode}) {
  return <>{children}</>;
}
