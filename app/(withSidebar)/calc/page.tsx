import type {Metadata} from 'next';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {CalcGrid} from '@/components/calc-grid';
import {Container} from '@/components/container';

export const metadata: Metadata = {
  title: 'ყველა ხელსაწყო',
  description: 'engineers.ge-ის ყველა საინჟინრო კალკულატორი — თბოდანაკარგი, HVAC, ვენტილაცია, სახანძრო სიმულაცია, CAD გეგმის რედაქტორი, BIM/IFC viewer',
  alternates: {canonical: '/calc'},
  openGraph: {
    type: 'website',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'ყველა საინჟინრო ხელსაწყო — engineers.ge',
    description: 'HVAC, თბოდანაკარგი, ვენტილაცია, სახანძრო სიმულაცია, CAD — უფასო ონლაინ კალკულატორები',
    url: '/calc'
  }
};

export default function CalcIndexPage() {
  return (
    <Container className="py-6 md:py-8">
      <Breadcrumbs className="mb-3" items={[{label: 'ხელსაწყოები'}]} />
      <header className="mb-5">
        <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          CALCULATORS
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          საინჟინრო ხელსაწყოები
        </h1>
        <p className="mt-1 text-sm text-text-2">
          უფასო, ქართული, ინჟინრებისთვის — აირჩიე მიმართულება.
        </p>
      </header>
      <CalcGrid />
    </Container>
  );
}
