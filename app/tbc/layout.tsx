import type {Metadata} from 'next';

export const metadata: Metadata = {
  title: 'TBC × DMT — ფილიალების ინვენტარიზაცია',
  description: 'TBC ფილიალების ინვენტარიზაცია და ობიექტების მართვა',
  robots: {index: false, follow: false}
};

export default function TbcLayout({children}: {children: React.ReactNode}) {
  return (
    <div className="min-h-screen bg-[#F8FAFC]" id="main-content">
      {children}
    </div>
  );
}
