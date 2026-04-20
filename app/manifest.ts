import type {MetadataRoute} from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'engineers.ge — საინჟინრო ხელსაწყოები',
    short_name: 'engineers.ge',
    description:
      'HVAC, თბოდანაკარგი, ვენტილაცია, სახანძრო სიმულაცია, CAD — უფასო ონლაინ საინჟინრო ხელსაწყოები',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f5f8fc',
    theme_color: '#1a3a6b',
    lang: 'ka-GE',
    dir: 'ltr',
    categories: ['productivity', 'engineering', 'utilities'],
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any'
      }
    ],
    shortcuts: [
      {
        name: 'თბოდანაკარგი',
        short_name: 'Heat loss',
        url: '/calc/heat-loss',
        description: 'EN 12831 სითბური დატვირთვა'
      },
      {
        name: 'გეგმის რედაქტორი',
        short_name: 'CAD',
        url: '/calc/wall-editor',
        description: 'კედლები, ოთახები, doors + windows'
      },
      {
        name: 'სადარბაზოს დაწნეხვა',
        short_name: 'Stair press.',
        url: '/calc/stair-pressurization',
        description: 'EN 12101-6 3D სიმულაცია'
      },
      {
        name: 'ფიზიკის ფორმულები',
        short_name: 'Formulas',
        url: '/calc/docs/physics',
        description: 'KaTeX rendered საცნობარო'
      }
    ]
  };
}
