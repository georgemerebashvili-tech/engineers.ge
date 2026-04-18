import {CalcGrid} from '@/components/calc-grid';
import {Container} from '@/components/container';
import {Hero} from '@/components/hero';
import {HomeStats} from '@/components/home-stats';
import {LegalPills} from '@/components/legal-pills';
import {ReferralBanner} from '@/components/referral-banner';

export const revalidate = 60;

export default function Page() {
  return (
    <>
      <Container className="pt-2 pb-0">
        <ReferralBanner />
      </Container>
      <Hero />
      <CalcGrid />
      <LegalPills />
      <HomeStats />
    </>
  );
}
