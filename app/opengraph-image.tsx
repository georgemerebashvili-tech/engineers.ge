import {ImageResponse} from 'next/og';

export const alt = 'engineers.ge — საინჟინრო ხელსაწყოები და ცოდნა';
export const size = {width: 1200, height: 630};
export const contentType = 'image/png';

// Noto Sans Georgian covers Latin + Georgian + digits in one font — solves satori's
// default-font lack of Georgian glyphs. Cached at build time by Vercel; fetched
// at module init for dev. WOFF would be smaller but satori prefers raw font bytes.
async function loadNotoGeorgian(): Promise<ArrayBuffer> {
  const res = await fetch(
    'https://fonts.googleapis.com/css2?family=Noto+Sans+Georgian:wght@400;700&display=swap',
    {
      headers: {
        // Google serves different font formats per UA — request a modern format
        // so satori gets a TTF/OTF rather than WOFF2 (which it can't decode).
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Safari/605.1.15'
      }
    }
  );
  const css = await res.text();
  const match = css.match(/src: url\((https:[^)]+)\) format\('truetype'\)/);
  if (!match) throw new Error('Could not locate Noto Sans Georgian TTF url');
  const fontRes = await fetch(match[1]);
  return fontRes.arrayBuffer();
}

type ImageResponseOptions = NonNullable<ConstructorParameters<typeof ImageResponse>[1]>;
type FontList = ImageResponseOptions['fonts'];

export default async function OGImage() {
  let fonts: FontList = undefined;
  try {
    const data = await loadNotoGeorgian();
    fonts = [
      {name: 'Noto Georgian', data, style: 'normal', weight: 400},
      {name: 'Noto Georgian', data, style: 'normal', weight: 700}
    ];
  } catch {
    fonts = undefined;
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff',
          backgroundImage:
            'radial-gradient(at 20% 0%, #e8f1fd 0%, transparent 45%), radial-gradient(at 100% 100%, #edf2fb 0%, transparent 55%)',
          padding: 72,
          justifyContent: 'space-between',
          fontFamily: fonts ? 'Noto Georgian, sans-serif' : 'sans-serif'
        }}
      >
        <div style={{display: 'flex', alignItems: 'center', gap: 12}}>
          <div style={{fontSize: 48, fontWeight: 700, color: '#1a3a6b', letterSpacing: '-0.02em'}}>
            engineers
          </div>
          <div
            style={{
              width: 0,
              height: 0,
              borderTop: '11px solid transparent',
              borderBottom: '11px solid transparent',
              borderLeft: '16px solid #1f6fd4'
            }}
          />
          <div style={{fontSize: 48, fontWeight: 700, color: '#3d5470', letterSpacing: '-0.02em'}}>
            .ge
          </div>
        </div>

        <div style={{display: 'flex', flexDirection: 'column', gap: 14}}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 600,
              color: '#7a96b8',
              letterSpacing: '0.12em',
              textTransform: 'uppercase'
            }}
          >
            CALCULATORS · SIMULATIONS · CAD
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: fonts ? 64 : 76,
              fontWeight: 700,
              color: '#1a2840',
              lineHeight: 1.1,
              letterSpacing: '-0.02em'
            }}
          >
            {fonts ? 'საინჟინრო ხელსაწყოები' : 'Engineering tools,'}
            <br />
            {fonts ? 'და ცოდნა' : 'open and free.'}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 28,
              fontWeight: 500,
              color: '#3d5470',
              lineHeight: 1.35,
              marginTop: 12
            }}
          >
            {fonts ? 'HVAC · თბოდანაკარგი · ვენტილაცია ·' : 'HVAC · Heat loss · Ventilation ·'}
            <br />
            {fonts ? 'სახანძრო სიმულაცია · CAD გეგმის რედაქტორი' : 'Fire simulation · CAD planner'}
          </div>
        </div>

        <div style={{display: 'flex', alignItems: 'center', gap: 14, marginTop: 8}}>
          {['EN 12101-6', 'NFPA 92', 'ASHRAE 62.1', 'ISO 6946', 'EN 12831'].map((s) => (
            <div
              key={s}
              style={{
                padding: '10px 18px',
                borderRadius: 999,
                border: '1.5px solid #b8d0f0',
                backgroundColor: '#e8f1fd',
                color: '#1f6fd4',
                fontSize: 18,
                fontWeight: 600,
                fontFamily: 'monospace'
              }}
            >
              {s}
            </div>
          ))}
        </div>
      </div>
    ),
    {...size, fonts}
  );
}
