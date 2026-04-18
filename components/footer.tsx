import {Container} from './container';

export function Footer() {
  return (
    <footer className="mt-6 border-t bg-sur">
      <Container className="py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold text-navy">engineers</span>
          <span
            aria-hidden
            className="inline-block h-0 w-0 border-y-[4px] border-l-[7px] border-y-transparent border-l-[var(--blue)]"
          />
          <span className="text-base font-bold text-text-3">.ge</span>
        </div>
      </Container>
    </footer>
  );
}
