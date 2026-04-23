import type {Metadata, Viewport} from 'next';

export const metadata: Metadata = {
  title: 'KAYA Construction — ობიექტების ინვენტარიზაცია',
  description: 'KAYA Construction სამშენებლო ობიექტების ინვენტარიზაცია და მართვა',
  robots: {index: false, follow: false}
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#475569'
};

export default function ConstructionLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" id="main-content">
      {children}
    </div>
  );
}
