export type Stage = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type Source = 'website' | 'referral' | 'cold' | 'social' | 'facebook' | 'linkedin';

export type Lead = {
  id: string;
  name: string;
  company: string;
  phone: string;
  email: string;
  source: Source;
  stage: Stage;
  owner: string;
  value: number;
  created: string;
};

export const LEADS: Lead[] = [
  {id: 'L-1042', name: 'ნიკა გელაშვილი', company: 'შპს აზიზი', phone: '+995 551 12 34 56', email: 'nika@azizi.ge', source: 'website', stage: 'qualified', owner: 'გიორგი', value: 8500, created: '2026-04-20'},
  {id: 'L-1041', name: 'ლევან კიკნაძე', company: 'ი/მ კიკნაძე', phone: '+995 599 87 65 43', email: 'l.kiknadze@gmail.com', source: 'referral', stage: 'proposal', owner: 'გიორგი', value: 14200, created: '2026-04-19'},
  {id: 'L-1040', name: 'მარიამ ბერიძე', company: 'Sazeo International', phone: '+995 577 33 22 11', email: 'mariam@sazeo.ge', source: 'linkedin', stage: 'contacted', owner: 'ლანა', value: 22000, created: '2026-04-18'},
  {id: 'L-1039', name: 'დავით გოგოლაძე', company: 'BGEO Group', phone: '+995 555 44 55 66', email: 'd.gogoladze@bgeo.ge', source: 'website', stage: 'new', owner: '—', value: 3200, created: '2026-04-17'},
  {id: 'L-1038', name: 'თამარ ბუაძე', company: 'HVAC Pro Georgia', phone: '+995 595 11 22 33', email: 't.buadze@hvacpro.ge', source: 'referral', stage: 'won', owner: 'გიორგი', value: 6400, created: '2026-04-15'},
  {id: 'L-1037', name: 'ზურაბ ლომიძე', company: 'Caucasus Roads', phone: '+995 551 99 88 77', email: 'z.lomidze@croads.ge', source: 'cold', stage: 'qualified', owner: 'ლანა', value: 48000, created: '2026-04-14'},
  {id: 'L-1036', name: 'ანა ქიმერიძე', company: 'Smart Building GE', phone: '+995 597 22 11 00', email: 'a.qimeridze@sb.ge', source: 'facebook', stage: 'new', owner: '—', value: 1800, created: '2026-04-13'},
  {id: 'L-1035', name: 'გიორგი ცხვედიანი', company: 'ი/მ ცხვედიანი', phone: '+995 599 55 44 33', email: 'g.tskhvediani@mail.ru', source: 'cold', stage: 'lost', owner: 'გიორგი', value: 900, created: '2026-04-10'},
  {id: 'L-1034', name: 'ნინო ქემოკლიძე', company: 'Archi Group', phone: '+995 551 66 77 88', email: 'nino@archigroup.ge', source: 'website', stage: 'proposal', owner: 'ლანა', value: 12300, created: '2026-04-09'},
  {id: 'L-1033', name: 'ირაკლი ნიკოლაიშვილი', company: 'HPL Engineering', phone: '+995 577 88 99 00', email: 'iraklin@hpl.ge', source: 'linkedin', stage: 'contacted', owner: 'გიორგი', value: 7600, created: '2026-04-08'},
  {id: 'L-1032', name: 'სოფო ჯავახიშვილი', company: 'Silknet', phone: '+995 595 77 66 55', email: 's.javakhi@silknet.ge', source: 'referral', stage: 'qualified', owner: 'ლანა', value: 3400, created: '2026-04-06'},
  {id: 'L-1031', name: 'გია მთვარელიძე', company: 'Tegeta Motors', phone: '+995 551 44 33 22', email: 'g.mtvarelidze@tegeta.ge', source: 'website', stage: 'won', owner: 'გიორგი', value: 15800, created: '2026-04-02'}
];

export const STAGE_META: Record<Stage, {label: string; color: string; bg: string; border: string}> = {
  new:        {label: 'ახალი',        color: 'var(--text-2)', bg: 'var(--sur-2)',  border: 'var(--bdr)'},
  contacted:  {label: 'კონტაქტი',     color: 'var(--blue)',   bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  qualified:  {label: 'კვალიფ.',      color: '#7c3aed',       bg: '#ede9fe',        border: '#c4b5fd'},
  proposal:   {label: 'შეთავაზება',   color: 'var(--ora)',    bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  won:        {label: 'მოგება',       color: 'var(--grn)',    bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  lost:       {label: 'დაკარგვა',     color: 'var(--red)',    bg: 'var(--red-lt)',  border: '#f0b8b4'}
};

export function leadToObjectCode(leadId: string) {
  return leadId.replace(/^L-/, 'OBJ-');
}
