import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'ფიზიკის ფორმულები · Rules & Formulas',
  description:
    'სახანძრო ვენტილაციის, თბოდანაკარგების, ჰაერნაკადის და წნევის ფორმულების საცნობარო · EN 12101-6, NFPA 92, ASHRAE, ISO · KaTeX rendered.',
  keywords: [
    'ფიზიკის ფორმულები',
    'EN 12101-6',
    'NFPA 92',
    'ASHRAE',
    'ISO 6946',
    'leakage flow',
    'plume mass flow',
    'smoke layer',
    'door opening force',
    'engineers.ge',
    'საქართველო'
  ],
  alternates: {canonical: '/calc/docs/physics'},
  openGraph: {
    type: 'article',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'ფიზიკის ფორმულები — engineers.ge',
    description:
      'სახანძრო ვენტილაცია, თბოდანაკარგები, ჰაერნაკადი, წნევა — ფორმულები EN/NFPA/ASHRAE/ISO სტანდარტებიდან',
    url: '/calc/docs/physics'
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ფიზიკის ფორმულები — engineers.ge',
    description: 'სახანძრო ვენტილაცია + თბოდანაკარგი · ფორმულების საცნობარო'
  }
};

export default function PhysicsDocsLayout({children}: {children: React.ReactNode}) {
  return children;
}
