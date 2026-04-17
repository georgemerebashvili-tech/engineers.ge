import Link from 'next/link';
import {Container} from './container';
import {LangSwitch} from './lang-switch';
import {ThemeToggle} from './theme-toggle';
import {BgSlider} from './bg-slider';

export function NavBar() {
  return (
    <header className="sticky top-0 z-40 bg-sur/90 backdrop-blur border-b">
      <Container className="h-14 md:h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-[1.35rem] md:text-[1.5rem] font-bold tracking-tight text-navy">
            engineers
          </span>
          <span
            aria-hidden
            className="inline-block h-0 w-0 border-y-[6px] border-l-[10px] border-y-transparent border-l-[var(--blue)]"
          />
          <span className="text-[1.35rem] md:text-[1.5rem] font-bold tracking-tight text-text-3">
            .ge
          </span>
        </Link>

        <div className="flex items-center gap-3">
          <LangSwitch />
          <BgSlider />
          <ThemeToggle />
        </div>
      </Container>
    </header>
  );
}
