import Link from 'next/link';
import {Container} from './container';
import {LangSwitch} from './lang-switch';
import {ThemeToggle} from './theme-toggle';
import {BgSlider} from './bg-slider';
import {NavLinks} from './nav-links';
import {ShareBar} from './share-bar';

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 bg-sur/90 backdrop-blur border-b">
      <Container className="h-14 md:h-16 flex items-center justify-between gap-2 md:gap-4">
        <div className="flex min-w-0 items-center gap-3 md:gap-6">
          <Link href="/" className="flex shrink-0 items-center gap-1">
            <span className="text-[1.15rem] md:text-[1.5rem] font-bold tracking-tight text-navy">
              engineers
            </span>
            <span className="text-[1.15rem] md:text-[1.5rem] font-bold tracking-tight text-text-3">
              .ge
            </span>
          </Link>

          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-1.5 md:gap-3">
          <span className="hidden items-center gap-1 text-xs font-semibold text-text-2 xl:inline-flex">
            აცნობე ყველას <span aria-hidden className="text-[22px] leading-none">👉</span>
          </span>
          <ShareBar />
          <LangSwitch />
          <BgSlider />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
