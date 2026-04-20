import Link from 'next/link';
import {Container} from './container';
import {ManageCookiesLink} from './manage-cookies-link';

const CALC_LINKS: Array<{href: string; label: string}> = [
  {href: '/calc/heat-loss', label: 'თბოდანაკარგები'},
  {href: '/calc/wall-thermal', label: 'თბოგადაცემა'},
  {href: '/calc/hvac', label: 'HVAC'},
  {href: '/calc/stair-pressurization', label: 'სადარბაზოს დაწნეხვა'},
  {href: '/calc/parking-ventilation', label: 'პარკინგის ვენტილაცია'},
  {href: '/calc/wall-editor', label: 'გეგმის რედაქტორი'}
];

const SECONDARY_LINKS: Array<{href: string; label: string}> = [
  {href: '/promotions', label: 'აქციები'},
  {href: '/ads', label: 'რეკლამა'},
  {href: '/calc/docs/physics', label: 'ფორმულები'},
  {href: '/dashboard/referrals', label: 'მოიწვიე · 3000₾'}
];

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-6 border-t bg-sur">
      <Container className="py-6 md:py-8">
        <div className="grid gap-6 md:grid-cols-4 md:gap-8">
          <div className="md:col-span-1">
            <Link href="/" aria-label="engineers.ge — მთავარი" className="inline-flex items-center gap-1.5">
              <span className="text-lg font-bold tracking-tight text-navy">engineers</span>
              <span
                aria-hidden
                className="inline-block h-0 w-0 border-y-[5px] border-l-[8px] border-y-transparent border-l-[var(--blue)]"
              />
              <span className="text-lg font-bold tracking-tight text-text-2">.ge</span>
            </Link>
            <p className="mt-2 text-[12px] leading-relaxed text-text-2">
              საინჟინრო ხელსაწყოები და ცოდნა — უფასო ონლაინ კალკულატორები,
              CAD-ინტეგრაცია, სახანძრო სიმულაცია.
            </p>
          </div>

          <nav aria-label="ხელსაწყოები" className="md:col-span-1">
            <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
              ხელსაწყოები
            </h2>
            <ul className="space-y-1.5">
              {CALC_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[12.5px] text-text-2 transition-colors hover:text-blue"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href="/#calculators"
                  className="text-[12.5px] font-semibold text-blue transition-colors hover:text-navy-2"
                >
                  ყველა →
                </Link>
              </li>
            </ul>
          </nav>

          <nav aria-label="სხვა" className="md:col-span-1">
            <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
              სხვა
            </h2>
            <ul className="space-y-1.5">
              {SECONDARY_LINKS.map((l) => (
                <li key={l.href}>
                  <Link
                    href={l.href}
                    className="text-[12.5px] text-text-2 transition-colors hover:text-blue"
                  >
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <div className="md:col-span-1">
            <h2 className="mb-2 font-mono text-[10px] font-bold uppercase tracking-[0.1em] text-text-3">
              კონტაქტი
            </h2>
            <ul className="space-y-1.5 text-[12.5px] text-text-2">
              <li>
                <a
                  href="mailto:georgemerebashvili@gmail.com"
                  className="transition-colors hover:text-blue"
                >
                  georgemerebashvili@gmail.com
                </a>
              </li>
              <li className="text-text-3">
                <span className="font-mono text-[10px]">თბილისი, საქართველო</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-start justify-between gap-2 border-t border-bdr pt-4 sm:flex-row sm:items-center">
          <span className="font-mono text-[10px] text-text-3">
            © {year} engineers.ge · ყველა უფლება დაცულია
          </span>
          <div className="flex items-center gap-4">
            <ManageCookiesLink />
            <span className="font-mono text-[10px] text-text-3">
              Made in Georgia 🇬🇪
            </span>
          </div>
        </div>
      </Container>
    </footer>
  );
}
