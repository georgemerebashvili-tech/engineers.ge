import Link from 'next/link';
import {Container} from './container';
import {LangSwitch} from './lang-switch';
import {ThemeToggle} from './theme-toggle';
import {BgSlider} from './bg-slider';
import {NavLinks} from './nav-links';

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 bg-sur/90 backdrop-blur border-b">
      <Container className="h-14 md:h-16 flex items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-[1.35rem] md:text-[1.5rem] font-bold tracking-tight text-navy">
              engineers
            </span>
            <span className="text-[1.35rem] md:text-[1.5rem] font-bold tracking-tight text-text-3">
              .ge
            </span>
          </Link>

          <NavLinks />
        </div>

        <div className="flex items-center gap-3">
          <LangSwitch />
          <BgSlider />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
