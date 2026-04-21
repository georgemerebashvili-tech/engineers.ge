import type {Metadata} from 'next';
import Link from 'next/link';
import {
  Package,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  FlaskConical
} from 'lucide-react';
import {Breadcrumbs} from '@/components/breadcrumbs';
import {Container} from '@/components/container';

export const metadata: Metadata = {
  title: 'ხელსაწყოები · წყაროები',
  description:
    'engineers.ge-ის კალკულატორების ქვეშ მდგომი ღია-წყაროიანი ბიბლიოთეკები და engine-ები — FloorspaceJS, MakerJS, web-ifc, three.js და სხვა. წყარო, ლიცენზია, ვერსია, სტატუსი.',
  alternates: {canonical: '/calc/docs/tools'},
  openGraph: {
    type: 'article',
    locale: 'ka_GE',
    siteName: 'engineers.ge',
    title: 'ხელსაწყოები · წყაროები — engineers.ge',
    description:
      'engineers.ge-ის ღია-წყაროიანი ბიბლიოთეკების კატალოგი — საიდან, რატომ, რომელი კალკულატორი იყენებს.',
    url: '/calc/docs/tools'
  }
};

type Status = 'stable' | 'beta' | 'poc';

type Tool = {
  id: string;
  name: string;
  usedIn: Array<{label: string; href: string}>;
  source: {label: string; url: string};
  license: string;
  version?: string;
  status: Status;
  what: string;
  why: string;
  how: string;
  links?: Array<{label: string; url: string}>;
};

const STATUS_META: Record<
  Status,
  {label: string; color: string; bg: string; border: string; Icon: typeof CheckCircle2}
> = {
  stable: {
    label: 'stable',
    color: 'var(--grn)',
    bg: 'var(--grn-lt)',
    border: 'var(--grn-bd)',
    Icon: CheckCircle2
  },
  beta: {
    label: 'beta',
    color: 'var(--ora)',
    bg: 'var(--ora-lt)',
    border: 'var(--ora-bd)',
    Icon: AlertCircle
  },
  poc: {
    label: 'POC',
    color: 'var(--blue)',
    bg: 'var(--blue-lt)',
    border: 'var(--blue-bd)',
    Icon: FlaskConical
  }
};

const TOOLS: Tool[] = [
  {
    id: 'floorspacejs',
    name: 'FloorspaceJS',
    usedIn: [{label: 'გეგმის შედგენა', href: '/calc/floor-plan'}],
    source: {
      label: 'NREL/floorspace.js',
      url: 'https://github.com/NREL/floorspace.js'
    },
    license: 'BSD-3 · NREL/Alliance for Sustainable Energy',
    version: 'v0.8.0 (embeddable)',
    status: 'beta',
    what:
      '2D-დან 3D-ში floor plan editor, OpenStudio / EnergyPlus energy simulation-ისთვის შექმნილი. შენ ხატავ სართულის გეგმას, ყოველ ოთახს ენიჭება space + thermal zone, და ეს geometry-ი შეიძლება ექსპორტდეს JSON-ად.',
    why:
      'ენერგო-გაანგარიშებას სჭირდება გეომეტრია (area, volume, wall orientation). ქართველი ინჟინერი აქამდე ხელით წერდა "ოთახი 18მ²-იანი" — ახლა FloorspaceJS-ში დახატავს, JSON-ი ავტომატურად მიდის heat-loss / HVAC კალკულატორში.',
    how:
      'Pure JS, framework-agnostic, self-contained 2.3MB HTML (v0.8.0 "embeddable" build). ჩვენ iframe-ით ვდებთ /calc/floor-plan.html-ში. AI layer-ი (Claude API) ქმნის FloorspaceJS-თავსებად JSON-ს prompt-იდან.',
    links: [
      {label: 'Official docs', url: 'https://nrel.github.io/floorspace.js/docs/'},
      {
        label: 'NREL paper (PDF)',
        url: 'https://docs.nrel.gov/docs/fy18osti/70491.pdf'
      }
    ]
  },
  {
    id: 'makerjs',
    name: 'Maker.js',
    usedIn: [{label: 'Duct Layout', href: '/calc/duct-layout'}],
    source: {
      label: 'microsoft/maker.js',
      url: 'https://github.com/microsoft/maker.js'
    },
    license: 'Apache-2.0 · Microsoft Garage',
    version: '0.19.2',
    status: 'stable',
    what:
      'JavaScript library CNC / laser cutter / DXF-ისთვის მოდულური 2D line drawing-ის შესაქმნელად. პარამეტრული გეომეტრია — სიგანე/სიმაღლე/სისქე input-ი, outputs → SVG/DXF/JSON.',
    why:
      'HVAC duct, silencer, flange, damper — ყველა მორფო-პარამეტრული ფორმა. კალკულატორი ითვლის duct width × height, MakerJS იმავე number-ებიდან აშენებს DXF-ს რომ სახელოსნოში მიიტანო. ხელით აღარ ხაზავ CAD-ში.',
    how:
      'npm `makerjs` + browser bundle (`dist/browser.maker.js`) → /calc/_makerjs.js (459KB). /calc/duct-layout.html-ში live sliders → m.models.RoundRectangle / Ellipse → SVG რედერი + DXF export.',
    links: [
      {label: 'Playground', url: 'https://maker.js.org/playground/'},
      {label: 'Demos', url: 'https://maker.js.org/demos/'}
    ]
  },
  {
    id: 'webifc',
    name: 'web-ifc',
    usedIn: [{label: 'IFC Viewer', href: '/calc/ifc-viewer'}],
    source: {
      label: 'ThatOpen/engine_web-ifc',
      url: 'https://github.com/ThatOpen/engine_web-ifc'
    },
    license: 'MPL-2.0',
    version: '0.0.59',
    status: 'poc',
    what:
      'WebAssembly parser, რომელიც `.ifc` (Industry Foundation Classes) ფაილებს კითხულობს პირდაპირ ბრაუზერში. IFC = ღია, ვენდორ-ნეიტრალური 3D model format — ArchiCAD, Allplan, Tekla, Vectorworks, FreeCAD-დან ექსპორტდება.',
    why:
      'ინჟინერი ArchiCAD-დან `.ifc` ექსპორტებს → engineers.ge-ზე აიტვირთება → walls / slabs / spaces / doors ავტომატურად გადადის heat-loss / HVAC-ში. ხელით აღარ ზომავ კედლებს ცალ-ცალკე. სტანდარტი ყველა ძრავს (OpenStudio, IESVE, Solibri, FreeCAD) ესმის.',
    how:
      'ThatOpen-ის web-ifc (WASM) + three.js renderer. მიმდინარე ვერსია POC-ია — sample model კომუნდეს CDN-იდან (jsDelivr). რეალური build-ი web-ifc npm package-ით ჩაყრება building-composer-ში, რათა ერთდროულად რამდენიმე IFC-ის stacking შესაძლებელი იყოს.',
    links: [
      {label: 'web-ifc npm', url: 'https://www.npmjs.com/package/web-ifc'},
      {label: 'ThatOpen components', url: 'https://thatopen.com/'},
      {label: 'IFC schema', url: 'https://standards.buildingsmart.org/IFC/'}
    ]
  },
  {
    id: 'three',
    name: 'three.js',
    usedIn: [
      {label: 'Stair Pressurization', href: '/calc/stair-pressurization'},
      {label: 'Parking Vent', href: '/calc/parking-ventilation'},
      {label: 'Building Composer', href: '/calc/building-composer'},
      {label: 'IFC Viewer', href: '/calc/ifc-viewer'}
    ],
    source: {label: 'mrdoob/three.js', url: 'https://github.com/mrdoob/three.js'},
    license: 'MIT',
    version: '0.184 / 0.160 (per calc)',
    status: 'stable',
    what:
      'WebGL 3D library — სცენა, კამერა, lights, meshes, materials, controls. ყველაფერი რასაც გიყურებ 3D სიმულატორებში — three.js-ის რენდერია.',
    why:
      'ერთი-ერთადი mature, open-source, browser-native 3D engine მსოფლიოში. ჩვენი სახანძრო სიმულატორები (სადარბაზოს დაწნეხვა, ლიფტის შახტი, პარკინგის ვენტილაცია) მთლიანად three.js-ზე დგას.',
    how:
      '@react-three/fiber + @react-three/drei wrapper React-ისთვის. Plain HTML calcs-ში — იმპორტ-მეპი unpkg-იდან (`three@0.160.0`).',
    links: [
      {label: 'three.js docs', url: 'https://threejs.org/docs/'},
      {label: 'Examples', url: 'https://threejs.org/examples/'}
    ]
  },
  {
    id: 'pythonhvac',
    name: 'python-hvac (+ Pyodide)',
    usedIn: [{label: 'HVAC · Python in-browser', href: '/calc/hvac-python'}],
    source: {
      label: 'TomLXXVI/python-hvac',
      url: 'https://github.com/TomLXXVI/python-hvac'
    },
    license: 'MIT · academic HVAC multi-package',
    version: 'python-hvac @ github / Pyodide 0.25.1 / CPython 3.13',
    status: 'poc',
    what:
      'python-hvac = ფართე Python package HVAC ინჟინრისთვის — cooling/heating load (RTS), heat transfer, heat exchanger, fluid flow, refrigeration cycles, VRF. ჩვენ ბრაუზერში ვუშვებთ Pyodide-ს (CPython 3.13 WebAssembly) + python-hvac-სტილის pure-Python კოდით (psychrometric cooling coil).',
    why:
      'ცხრილიდან გაანგარიშების შემდეგი ფაზა — academic-grade engine. python-hvac არაა PyPI-ზე, ამიტომ pip install ვერ ხდება, მაგრამ იგივე API-სტილი და ASHRAE-ფორმულები გადავიწერეთ. მომხმარებელი ხედავს **რეალურ Python-ს ბრაუზერში** — გამჭვირვალედ ჩანს რომელი ფორმულა რას ითვლის.',
    how:
      'public/calc/hvac-python.html იტვირთება Pyodide-ს https://cdn.jsdelivr.net/pyodide/-დან (~10MB WASM). Python source პირდაპირ HTML-შია (visible). Run ღილაკზე — pyodide.runPythonAsync() → stdout captured → UI-ში ნაჩვენები metrics. მომავალი upgrade: Vercel Python function (server-side) → import python-hvac directly from GitHub.',
    links: [
      {label: 'Pyodide docs', url: 'https://pyodide.org/en/stable/'},
      {label: 'ASHRAE Handbook', url: 'https://www.ashrae.org/technical-resources/ashrae-handbook'}
    ]
  },
  {
    id: 'ai-layer',
    name: 'AI layer (Claude API)',
    usedIn: [
      {label: 'AI Floor Plan (prompt→JSON)', href: '/calc/floor-plan'},
      {label: 'AI Wall Detection (image→walls)', href: '/calc/wall-editor'},
      {label: 'AI Translate (admin)', href: '/admin'}
    ],
    source: {
      label: 'Anthropic Claude API',
      url: 'https://docs.anthropic.com/en/api/messages'
    },
    license: 'Anthropic Commercial (API)',
    version: 'Claude Haiku 4.5 (default) / Sonnet 4.6 / Opus 4.7',
    status: 'beta',
    what:
      'Anthropic-ის Messages API. engineers.ge ემასპინძლება API key-ს admin-ში (Supabase `ai_settings` table), ყოველი AI feature-ი ერთი და იმავე resolver-ით იღებს key + model + enabled flag.',
    why:
      'ქართველი ინჟინრის ქართული prompt-ი — "3 საძინებლიანი ბინა 85მ²" — პირდაპირ FloorspaceJS-თავსებად JSON-ს ვერ გასცემდა არცერთი OpenAI/Gemini model ასე კარგად. Claude-ის სტრუქტურული output და ქართულის გამოცნობა — საუკეთესო.',
    how:
      'app/api/calc/ai-plan/route.ts — fetch-ი https://api.anthropic.com/v1/messages, system prompt-ში FloorspaceJS schema + ქართული↔English room-name mapping. Response parsing: extracts JSON between first `{` and last `}`.',
    links: [
      {label: 'Anthropic docs', url: 'https://docs.anthropic.com/'},
      {label: 'lib/ai-settings.ts (source)', url: '/admin'}
    ]
  }
];

function StatusPill({status}: {status: Status}) {
  const meta = STATUS_META[status];
  const Icon = meta.Icon;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[9.5px] font-semibold"
      style={{
        color: meta.color,
        background: meta.bg,
        borderColor: meta.border
      }}
    >
      <Icon size={10} strokeWidth={2} />
      {meta.label}
    </span>
  );
}

export default function ToolsDocsPage() {
  return (
    <Container className="py-6 md:py-8">
      <Breadcrumbs
        className="mb-3"
        items={[
          {label: 'დოკუმენტაცია', href: '/calc/docs'},
          {label: 'ხელსაწყოები · წყაროები'}
        ]}
      />

      <header className="mb-6">
        <div className="mb-1 font-mono text-[10px] font-bold uppercase tracking-[0.12em] text-text-3">
          TOOLS · SOURCES · LICENSES
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-navy md:text-3xl">
          ხელსაწყოები · წყაროები
        </h1>
        <p className="mt-2 max-w-3xl text-[13px] leading-relaxed text-text-2">
          engineers.ge-ის კალკულატორების ქვეშ მუშაობს ღია-წყაროიანი ბიბლიოთეკები — three.js, FloorspaceJS, MakerJS, web-ifc. ეს გვერდი დეტალურად აღწერს: <b>საიდან</b> მოდის ძრავი, <b>რატომ</b> გვაქვს საიტზე, <b>როგორ</b> ერთვება კონკრეტულ ხელსაწყოს, და რა <b>ლიცენზიით</b>. გამჭვირვალობა — რომ ინჟინერმა იცოდეს რისი გენერაცია ემართება მის გამოთვლებს.
        </p>
      </header>

      <div className="flex flex-col gap-4">
        {TOOLS.map((t) => (
          <article
            key={t.id}
            id={t.id}
            className="rounded-[var(--radius-card)] border border-bdr bg-sur p-5"
          >
            <div className="flex flex-wrap items-start gap-3">
              <span
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-blue-lt text-blue"
                aria-hidden
              >
                <Package size={20} strokeWidth={1.75} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-bold text-navy">{t.name}</h2>
                  <StatusPill status={t.status} />
                  {t.version ? (
                    <span className="font-mono text-[10.5px] text-text-3">
                      {t.version}
                    </span>
                  ) : null}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-text-3">
                  <a
                    href={t.source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue hover:underline"
                  >
                    {t.source.label}
                    <ExternalLink size={11} />
                  </a>
                  <span className="text-text-3">·</span>
                  <span>{t.license}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 grid gap-4 text-[12.5px] leading-relaxed text-text-2 md:grid-cols-3">
              <div>
                <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                  რა არის
                </div>
                <p>{t.what}</p>
              </div>
              <div>
                <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                  რატომ გვაქვს
                </div>
                <p>{t.why}</p>
              </div>
              <div>
                <div className="mb-1 font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                  როგორ ერთვება
                </div>
                <p>{t.how}</p>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-bdr pt-3">
              <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                იყენებს:
              </span>
              {t.usedIn.map((u) => (
                <Link
                  key={u.href}
                  href={u.href}
                  className="rounded-full border border-bdr bg-sur-2 px-2.5 py-0.5 text-[10.5px] font-semibold text-text-2 transition-colors hover:border-blue hover:text-blue"
                >
                  {u.label}
                </Link>
              ))}
              {t.links && t.links.length > 0 ? (
                <>
                  <span className="ml-auto font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
                    დოკუმენტაცია:
                  </span>
                  {t.links.map((l) => (
                    <a
                      key={l.url}
                      href={l.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 rounded-full border border-blue-bd bg-blue-lt px-2.5 py-0.5 text-[10.5px] font-semibold text-blue hover:border-blue"
                    >
                      {l.label}
                      <ExternalLink size={10} />
                    </a>
                  ))}
                </>
              ) : null}
            </div>
          </article>
        ))}
      </div>

      <section className="mt-8 rounded-[var(--radius-card)] border border-bdr bg-sur-2 p-5 text-[12.5px] leading-relaxed text-text-2">
        <h2 className="mb-2 text-sm font-bold text-navy">რატომ ვირჩევთ ღია წყაროს</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            <b>გამჭვირვალობა:</b> ყველა ფორმულა, model, renderer — გამოჩენადი. ინჟინერი შეუძლია ნახოს რა ხდება რიცხვის ქვეშ.
          </li>
          <li>
            <b>Vendor lock-ის თავიდან არიდება:</b> თუ ერთი ძრავი გაითიშოს ან
            ფასი აიწიოს — fork შესაძლებელია.
          </li>
          <li>
            <b>სტანდარტები:</b> IFC, DXF, JSON-schema — ღია ფორმატებია; კალკულატორის output-ი მუშაობს ყველა ძირითად CAD / BMS პროდუქტში.
          </li>
          <li>
            <b>ქართული ბაზრისთვის ბიუჯეტი:</b> propriety ძრავების ლიცენზიები
            (ArchiCAD, AutoCAD, EnergyPlus-ის commercial UIs) ძვირია — ღია ალტერნატივებით უფასოდ ვახვდებით ფუნქციონალს.
          </li>
        </ul>
      </section>
    </Container>
  );
}
