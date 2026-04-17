import {Container} from './container';
import {BannerCarousel, type Banner} from './banner-carousel';

const PLACEHOLDERS: Banner[] = [
  {
    id: '1',
    image_url:
      'https://placehold.co/1920x540/1a3a6b/ffffff/png?text=engineers.ge+%E2%80%94+%E1%83%A1%E1%83%90%E1%83%98%E1%83%A0%E1%83%AA%E1%83%94',
    alt: 'Banner 1'
  },
  {
    id: '2',
    image_url:
      'https://placehold.co/1920x540/1f6fd4/ffffff/png?text=%E1%83%AB%E1%83%90%E1%83%9A%E1%83%98%E1%83%90%E1%83%9C+%E1%83%9B%E1%83%90%E1%83%9A%E1%83%94+%E1%83%A1%E1%83%90%E1%83%98%E1%83%A0%E1%83%AA%E1%83%94%E1%83%A2%E1%83%98',
    alt: 'Banner 2'
  },
  {
    id: '3',
    image_url:
      'https://placehold.co/1920x540/c05010/ffffff/png?text=EN+12831+%C2%B7+ISO+6946+%C2%B7+ASHRAE',
    alt: 'Banner 3'
  }
];

export function BannersSection() {
  return (
    <section className="py-8 md:py-10">
      <Container>
        <BannerCarousel banners={PLACEHOLDERS} />
      </Container>
    </section>
  );
}
