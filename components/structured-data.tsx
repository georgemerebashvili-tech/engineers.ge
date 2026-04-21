/**
 * Renders JSON-LD structured data as a <script> tag inside the page head/body.
 * Used for Organization + WebSite + SoftwareApplication rich results.
 * Spec: https://schema.org/
 */
type JsonLd = Record<string, unknown>;

export function StructuredData({data}: {data: JsonLd | JsonLd[]}) {
  const payload = Array.isArray(data) ? data : [data];
  return (
    <>
      {payload.map((entry, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{__html: JSON.stringify(entry)}}
        />
      ))}
    </>
  );
}

export function homeStructuredData(): JsonLd[] {
  const origin = 'https://engineers.ge';
  return [
    {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'engineers.ge',
      url: origin,
      logo: `${origin}/opengraph-image`,
      email: 'georgemerebashvili@gmail.com',
      address: {
        '@type': 'PostalAddress',
        addressCountry: 'GE',
        addressLocality: 'Tbilisi'
      },
      sameAs: []
    },
    {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'engineers.ge',
      url: origin,
      inLanguage: 'ka-GE',
      description:
        'HVAC, თბოდანაკარგები, თბოგადაცემა, ხმაურდამხშობი სელექშენი, სახანძრო სიმულაცია — უფასო ონლაინ საინჟინრო ხელსაწყოები'
    },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'engineers.ge — საინჟინრო ხელსაწყოები',
      applicationCategory: 'EngineeringApplication',
      operatingSystem: 'Web',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'GEL',
        availability: 'https://schema.org/InStock'
      },
      featureList: [
        'HVAC · ASHRAE 62.1',
        'EN 12831 თბოდანაკარგი',
        'ISO 6946 U-ფაქტორი',
        'EN 12101-6 სახანძრო დაწნეხვა',
        'NFPA 92 smoke control',
        'Parking CO + smoke extract',
        'CAD გეგმის რედაქტორი',
        'Building composer 3D',
        'IFC viewer'
      ],
      inLanguage: 'ka-GE'
    }
  ];
}
