'use client';

type Props = {
  href: string;
  slug: string;
  children: React.ReactNode;
};

export function CalcCardExternal({href, slug, children}: Props) {
  const handleClick = () => {
    try {
      const body = JSON.stringify({slug, action: 'open'});
      if (navigator.sendBeacon) {
        navigator.sendBeacon('/api/calc/track', new Blob([body], {type: 'application/json'}));
      } else {
        fetch('/api/calc/track', {
          method: 'POST',
          headers: {'content-type': 'application/json'},
          body,
          keepalive: true
        }).catch(() => {});
      }
    } catch {}
  };

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block h-full"
    >
      {children}
    </a>
  );
}
