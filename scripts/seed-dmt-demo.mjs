#!/usr/bin/env node
/**
 * engineers.ge · DMT comprehensive demo seed
 *
 * Wipes and re-seeds every DMT-prefixed table for a realistic /dmt/* simulation:
 *   dmt_users / dmt_inventory(+logs) / dmt_fb_leads / dmt_audit_log
 *   dmt_leads(+audit) / dmt_manual_leads / dmt_manual_extra_cols / dmt_manual_extra_vals
 *   dmt_variable_sets / dmt_page_scopes / dmt_contacts(+audit)
 *   dmt_offers(+audit) / dmt_lead_inventory_photos / dmt_fb_webhook_settings
 *
 * Idempotent — every run wipes & re-inserts a deterministic-ish dataset.
 *
 * Usage: DATABASE_URL=... node scripts/seed-dmt-demo.mjs
 *
 * Demo password for every seeded user: demo123
 */
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import process from 'node:process';

const require = createRequire(import.meta.url);
const {Client} = require('pg');
const bcrypt = require('bcryptjs');

const CONN =
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.SUPABASE_DB_URL;

if (!CONN) {
  console.error('DATABASE_URL is required.');
  process.exit(2);
}

// ---- helpers ----
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const sample = (arr, n) => {
  const a = [...arr];
  const r = [];
  for (let i = 0; i < n && a.length; i++) {
    r.push(a.splice(Math.floor(Math.random() * a.length), 1)[0]);
  }
  return r;
};
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const minutesAgo = (n) => new Date(Date.now() - n * 60 * 1000);
const slug = (n = 6) => Math.random().toString(36).slice(2, 2 + n);

// ---- demo dataset ----
const PASSWORD_PLAINTEXT = 'demo123';

const USERS = [
  {email: 'giorgi@dmt.ge',  name: 'გიორგი მერებაშვილი', role: 'owner',  status: 'active'},
  {email: 'nino@dmt.ge',    name: 'ნინო ბერიძე',        role: 'admin',  status: 'active'},
  {email: 'levan@dmt.ge',   name: 'ლევან ხურციძე',      role: 'member', status: 'active'},
  {email: 'mariam@dmt.ge',  name: 'მარიამ ჯანელიძე',    role: 'member', status: 'active'},
  {email: 'davit@dmt.ge',   name: 'დავით ლომიძე',       role: 'member', status: 'active'},
  {email: 'ana@dmt.ge',     name: 'ანა ცაცაშვილი',       role: 'viewer', status: 'active'},
  {email: 'tamar@dmt.ge',   name: 'თამარ კუპრაშვილი',   role: 'member', status: 'invited'},
  {email: 'beka@dmt.ge',    name: 'ბექა ხარაიშვილი',    role: 'member', status: 'suspended'}
];

const TAB_COLORS = ['#1f6fd4', '#2c8a3a', '#d97706', '#dc2626', '#7c3aed', '#0891b2', '#ec4899'];

const ADSETS = [
  {id: '23859120100', campaign: '23859120000', name: 'AC retargeting · Tbilisi'},
  {id: '23859120200', campaign: '23859120000', name: 'AC lookalike · Batumi'},
  {id: '23859130100', campaign: '23859130000', name: 'Heat pump · homeowners 28-55'},
  {id: '23859140100', campaign: '23859140000', name: 'Smart thermostat · interest'},
  {id: '23859150100', campaign: '23859150000', name: 'Energy audit · cold call'},
  {id: '23859160100', campaign: '23859160000', name: 'Renovation · zip targeting'}
];
const ADS = [
  {id: 'ad_001', adset: '23859120100', name: 'AC carousel — 6 models'},
  {id: 'ad_002', adset: '23859120100', name: 'AC video — 30s testimonial'},
  {id: 'ad_003', adset: '23859120200', name: 'AC summer image'},
  {id: 'ad_004', adset: '23859130100', name: 'Heat pump comparison chart'},
  {id: 'ad_005', adset: '23859130100', name: 'Heat pump install timelapse'},
  {id: 'ad_006', adset: '23859140100', name: 'Smart home explainer'},
  {id: 'ad_007', adset: '23859150100', name: 'Free audit booking CTA'},
  {id: 'ad_008', adset: '23859160100', name: 'Renovation before/after'}
];
const FORMS = [
  {id: 'form_quick_quote', name: 'სწრაფი ფასი'},
  {id: 'form_consultation', name: 'უფასო კონსულტაცია'},
  {id: 'form_catalog',     name: 'კატალოგის გადმოწერა'},
  {id: 'form_audit',       name: 'ენერგო-აუდიტი'}
];
const PAGE_ID = '105432198765432';

const FIRST_NAMES = ['გიორგი','ნიკა','ლევან','დავით','ბექა','ვახო','ანდრო','ირაკლი','მამუკა','ზურა','თორნიკე','ლუკა','საბა','დემნა','რატი','ალეკო','ვახტანგი','კახა','შოთა','ლადო','ნინო','მარიამ','ანა','თამარ','ნათია','ეკა','ლიკა','ქეთი','სალომე','გვანცა','მაია','ლანა'];
const LAST_NAMES  = ['ბერიძე','ჯანელიძე','ლომიძე','ხურციძე','კუპრაშვილი','ცაცაშვილი','გელაშვილი','კიკნაძე','ბოლქვაძე','ხარაიშვილი','მაჭარაშვილი','ფხალაძე','კაპანაძე','ცინცაძე','ყაზბეგი','ვანიშვილი','დადიანი','შენგელია','ხუციშვილი','გოგოლაძე','ციცქიშვილი','ჩხეიძე','რუსიშვილი','ანდრიაძე'];
const COMPANIES = ['Bauland Construction','Kober Group','Smart HVAC LLC','TBC Bank ფილიალი','EcoBuild ჯგუფი','Renova Studios','GeoTech Engineering','Tbilisi Towers','Caucasus Real Estate','Aria Investments','BlackSea Hotels','Geocell Towers','SunHouse Energy','Anaklia Resort','Borjomi Center','Gudauri Lodge','Rustavi Industrial','Kutaisi Mall','Batumi Plaza','PrimeProperty','SkyView Apartments','Sole Construction','Diamond Hotels','Iberia Group'];
const CITIES = ['Tbilisi','Batumi','Kutaisi','Rustavi','Zugdidi','Telavi','Gori','Poti'];
const INTERESTS = ['HVAC','Heat pump','Smart home','Insulation','Solar','Boiler','AC','Ventilation','Energy audit','Renovation'];
const POSITIONS = ['Project Manager','CEO','Engineer','Architect','Owner','HVAC Lead','Procurement','Tech Director','Operations','Maintenance Lead'];
const SOURCES = ['facebook_ads','google_ads','referral','direct','cold_call','website','exhibition'];
const PIPELINE_STAGES = ['new','qualified','proposal','won','lost'];
const LABEL_LIB = ['ახალი','დაინტერესებული','მიმდინარე','მოლოდინში','ცხელი','follow-up'];
const MANUAL_STATUSES = ['ახალი','დაინტერესებული','მოლოდინში','ცხელი','დახურული'];
const CONTACT_TAGS = ['HVAC','residential','commercial','VIP','returning','follow-up','cold','warm','referral'];

function gPhone() {
  return `+995 5${randInt(50,99)} ${randInt(100000,999999)}`;
}
function gName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

const INVENTORY = [
  {sku: 'HVAC-AC-12K-INV',  name: 'Inverter AC 12000 BTU',          desc: 'მცირე ოთახი, A++ კლასი',                   tags: ['AC','inverter','residential'],   qty: 24, price: 1490.00, dim: '845×290×210mm'},
  {sku: 'HVAC-AC-18K-INV',  name: 'Inverter AC 18000 BTU',          desc: 'საშუალო ოთახი',                              tags: ['AC','inverter','residential'],   qty: 12, price: 1890.00, dim: '950×320×220mm'},
  {sku: 'HVAC-AC-24K-INV',  name: 'Inverter AC 24000 BTU',          desc: 'დიდი ოთახი ან ღია სივრცე',                   tags: ['AC','inverter','commercial'],    qty:  6, price: 2790.00, dim: '1080×340×230mm'},
  {sku: 'HVAC-HP-8KW',      name: 'Air-to-water heat pump 8 kW',    desc: 'რეზიდენციული, R32',                          tags: ['heat-pump','residential'],       qty:  3, price: 9800.00, dim: '1100×460×860mm'},
  {sku: 'HVAC-HP-12KW',     name: 'Air-to-water heat pump 12 kW',   desc: 'მცირე კომერციული',                           tags: ['heat-pump','commercial'],        qty:  2, price: 12400.00, dim: '1200×460×900mm'},
  {sku: 'HVAC-MVHR-300',    name: 'MVHR unit 300 m³/h',             desc: 'რეკუპერაცია 90% efficiency',                tags: ['ventilation','MVHR'],            qty:  4, price: 3200.00, dim: '600×600×400mm'},
  {sku: 'HVAC-MVHR-500',    name: 'MVHR unit 500 m³/h',             desc: 'მრავალოთახიანი',                             tags: ['ventilation','MVHR'],            qty:  2, price: 4400.00, dim: '700×700×450mm'},
  {sku: 'HVAC-DUCT-100',    name: 'Spiral duct Ø100mm × 3m',        desc: 'გალვანიზებული',                              tags: ['duct','accessory'],              qty: 60, price:    24.00, dim: 'Ø100×3000mm'},
  {sku: 'HVAC-DUCT-160',    name: 'Spiral duct Ø160mm × 3m',        desc: 'გალვანიზებული',                              tags: ['duct','accessory'],              qty: 45, price:    38.00, dim: 'Ø160×3000mm'},
  {sku: 'HVAC-DUCT-200',    name: 'Spiral duct Ø200mm × 3m',        desc: 'გალვანიზებული',                              tags: ['duct','accessory'],              qty: 30, price:    52.00, dim: 'Ø200×3000mm'},
  {sku: 'HVAC-DAMPER-160',  name: 'Motorized damper Ø160',          desc: '24V, fail-closed',                           tags: ['damper','VAV'],                  qty: 18, price:   140.00, dim: 'Ø160mm'},
  {sku: 'HVAC-FAN-EC-300',  name: 'EC inline fan Ø300, 1200 m³/h',  desc: 'low-noise, IP44',                            tags: ['fan','EC','inline'],             qty:  8, price:   460.00, dim: 'Ø300×320mm'},
  {sku: 'HVAC-SILENCER-200',name: 'Silencer Ø200 × 600mm',          desc: 'duct attenuator -10dB',                      tags: ['silencer','acoustic'],           qty: 14, price:    78.00, dim: 'Ø200×600mm'},
  {sku: 'HVAC-DIFF-300',    name: 'Square diffuser 300×300',        desc: '4-way, white',                               tags: ['diffuser','accessory'],          qty: 35, price:    32.00, dim: '300×300mm'},
  {sku: 'HVAC-GRILLE-400',  name: 'Return grille 400×200',          desc: 'aluminium, fixed blade',                     tags: ['grille','accessory'],            qty: 25, price:    28.00, dim: '400×200mm'},
  {sku: 'HVAC-THERMOSTAT-W',name: 'WiFi thermostat',                desc: 'Tuya, 7-day schedule',                       tags: ['controls','smart-home'],         qty: 22, price:   190.00, dim: '86×86×16mm'},
  {sku: 'HVAC-SENSOR-CO2',  name: 'CO₂ + RH + T sensor',            desc: 'Modbus + 0-10V',                             tags: ['sensor','controls'],             qty: 15, price:   260.00, dim: '100×80×25mm'},
  {sku: 'HVAC-FILTER-G4',   name: 'G4 panel filter 592×287×48',     desc: 'pre-filter for AHU',                         tags: ['filter','MVHR','consumable'],    qty: 80, price:    14.00, dim: '592×287×48mm'},
  {sku: 'HVAC-FILTER-F7',   name: 'F7 bag filter 592×287×360',      desc: 'fine particulate filter',                    tags: ['filter','MVHR','consumable'],    qty: 40, price:    32.00, dim: '592×287×360mm'},
  {sku: 'HVAC-INSUL-9MM',   name: 'Armaflex tube 22mm × 9mm × 2m',  desc: 'closed-cell pipe insulation',                tags: ['insulation','plumbing'],         qty: 90, price:    11.50, dim: '22×9×2000mm'}
];

const VAR_SETS = [
  {id: 'vs_status',   name: 'Lead status', type: 'single', position: 0,
   options: [
     {id: 'opt_status_new',     label: 'ახალი',          color: '#3b82f6'},
     {id: 'opt_status_qual',    label: 'დაინტერესებული',  color: '#8b5cf6'},
     {id: 'opt_status_pending', label: 'მოლოდინში',       color: '#f59e0b'},
     {id: 'opt_status_hot',     label: 'ცხელი',           color: '#ef4444'},
     {id: 'opt_status_closed',  label: 'დახურული',         color: '#6b7280'}
   ]},
  {id: 'vs_priority', name: 'Priority', type: 'single', position: 1,
   options: [
     {id: 'opt_pri_low',    label: 'low',     color: '#9ca3af'},
     {id: 'opt_pri_med',    label: 'medium',  color: '#3b82f6'},
     {id: 'opt_pri_high',   label: 'high',    color: '#f59e0b'},
     {id: 'opt_pri_urgent', label: 'urgent',  color: '#ef4444'}
   ]},
  {id: 'vs_role',     name: 'Role', type: 'single', position: 2,
   options: [
     {id: 'opt_role_dm',     label: 'decision maker', color: '#10b981'},
     {id: 'opt_role_infl',   label: 'influencer',     color: '#3b82f6'},
     {id: 'opt_role_user',   label: 'end user',       color: '#9ca3af'},
     {id: 'opt_role_budget', label: 'budget owner',   color: '#f59e0b'}
   ]},
  {id: 'vs_source',   name: 'Source', type: 'multi', position: 3,
   options: [
     {id: 'opt_src_fb',    label: 'facebook',   color: '#1877f2'},
     {id: 'opt_src_g',     label: 'google',     color: '#ea4335'},
     {id: 'opt_src_ref',   label: 'referral',   color: '#10b981'},
     {id: 'opt_src_cold',  label: 'cold-call',  color: '#6b7280'},
     {id: 'opt_src_web',   label: 'website',    color: '#3b82f6'},
     {id: 'opt_src_exhib', label: 'exhibition', color: '#8b5cf6'}
   ]}
];

const PAGE_SCOPES = [
  {id: 'scope_overview', label: 'Overview',     icon: 'LayoutDashboard', route: '/dmt',           tables: [],                 position: 0},
  {id: 'scope_leads',    label: 'ლიდები',        icon: 'Users',            route: '/dmt/leads',     tables: ['dmt_leads'],      position: 1},
  {id: 'scope_contacts', label: 'კონტაქტები',    icon: 'BookUser',         route: '/dmt/contacts',  tables: ['dmt_contacts'],   position: 2},
  {id: 'scope_inventory',label: 'ინვენტარი',     icon: 'Package',          route: '/dmt/inventory', tables: ['dmt_inventory'],  position: 3},
  {id: 'scope_invoices', label: 'ინვოისები',     icon: 'FileText',         route: '/dmt/invoices',  tables: ['dmt_offers'],     position: 4}
];

const client = new Client({
  connectionString: CONN,
  ssl: CONN.includes('supabase.co') || CONN.includes('neon.tech')
    ? {rejectUnauthorized: false}
    : undefined
});

async function main() {
  await client.connect();
  console.log('connected · seeding DMT comprehensive demo data...');

  // 1. wipe (FK-aware order)
  console.log('  wiping');
  await client.query('begin');
  await client.query('truncate table public.dmt_offers_audit cascade');
  await client.query('truncate table public.dmt_offers cascade');
  await client.query('truncate table public.dmt_lead_inventory_photos cascade');
  await client.query('truncate table public.dmt_manual_extra_vals cascade');
  await client.query('truncate table public.dmt_manual_extra_cols cascade');
  await client.query('truncate table public.dmt_manual_leads cascade');
  await client.query('truncate table public.dmt_contacts_audit cascade');
  await client.query('truncate table public.dmt_leads_audit cascade');
  await client.query('update public.dmt_leads set from_contact_id = null');
  await client.query('truncate table public.dmt_contacts cascade');
  await client.query('truncate table public.dmt_leads cascade');
  await client.query('truncate table public.dmt_variable_sets cascade');
  await client.query('truncate table public.dmt_page_scopes cascade');
  await client.query('update public.dmt_inventory_logs set item_id = null');
  await client.query('truncate table public.dmt_inventory_logs restart identity');
  await client.query('truncate table public.dmt_inventory restart identity cascade');
  await client.query('truncate table public.dmt_fb_leads cascade');
  await client.query('truncate table public.dmt_audit_log cascade');
  await client.query('delete from public.dmt_users');
  // reset offer doc number sequence
  await client.query(`select setval('public.dmt_offer_doc_seq', 219, false)`);
  await client.query('commit');

  // 2. users
  console.log('  → users');
  const passwordHash = await bcrypt.hash(PASSWORD_PLAINTEXT, 10);
  const userIds = {};
  for (const u of USERS) {
    const id = randomUUID();
    const settings = {manualLeadsTabColor: pick(TAB_COLORS)};
    const lastLogin = u.status === 'active' ? minutesAgo(randInt(5, 60 * 24 * 7)) : null;
    await client.query(
      `insert into public.dmt_users
         (id, email, password_hash, name, role, status, last_login_at, settings, created_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,now())`,
      [id, u.email, passwordHash, u.name, u.role, u.status, lastLogin, JSON.stringify(settings),
       daysAgo(randInt(5, 90))]
    );
    userIds[u.email] = id;
  }
  const ownerId = userIds['giorgi@dmt.ge'];
  await client.query(
    `update public.dmt_users set invited_by = $1 where email <> 'giorgi@dmt.ge'`,
    [ownerId]
  );

  // 3. inventory + logs
  console.log('  → inventory');
  const invIds = [];
  for (const it of INVENTORY) {
    const created_by = pick(['giorgi@dmt.ge','nino@dmt.ge','levan@dmt.ge']);
    const created_at = daysAgo(randInt(10, 60));
    const updated = Math.random() < 0.4;
    const updated_by = updated ? pick(['giorgi@dmt.ge','nino@dmt.ge']) : null;
    const updated_at = updated ? daysAgo(randInt(0, 9)) : null;
    const r = await client.query(
      `insert into public.dmt_inventory
         (sku, name, description, tags, dimensions, qty, price, created_by, created_at, updated_by, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
      [it.sku, it.name, it.desc, it.tags, it.dim, it.qty, it.price, created_by, created_at, updated_by, updated_at]
    );
    const id = r.rows[0].id;
    invIds.push({id, sku: it.sku, name: it.name, price: it.price});
    await client.query(
      `insert into public.dmt_inventory_logs (item_id, item_sku, action, changes, actor, created_at)
       values ($1,$2,'create',$3::jsonb,$4,$5)`,
      [id, it.sku, JSON.stringify({snapshot: it}), created_by, created_at]
    );
    if (updated) {
      await client.query(
        `insert into public.dmt_inventory_logs (item_id, item_sku, action, changes, actor, created_at)
         values ($1,$2,'update',$3::jsonb,$4,$5)`,
        [id, it.sku, JSON.stringify({field: 'qty', old: it.qty + randInt(1,5), new: it.qty}), updated_by, updated_at]
      );
    }
  }

  // 4. variable sets
  console.log('  → variable_sets');
  for (const v of VAR_SETS) {
    await client.query(
      `insert into public.dmt_variable_sets (id, name, type, options, position, updated_at)
       values ($1,$2,$3,$4::jsonb,$5,now())`,
      [v.id, v.name, v.type, JSON.stringify(v.options), v.position]
    );
  }

  // 5. page scopes
  console.log('  → page_scopes');
  for (const s of PAGE_SCOPES) {
    await client.query(
      `insert into public.dmt_page_scopes (id, label, icon, route, tables, position, updated_at)
       values ($1,$2,$3,$4,$5::jsonb,$6,now())`,
      [s.id, s.label, s.icon, s.route, JSON.stringify(s.tables), s.position]
    );
  }

  // 6. dmt_contacts
  console.log('  → contacts');
  const contactIds = [];
  for (let i = 0; i < 30; i++) {
    const id = String(i + 1);
    const name = gName();
    const company = pick(COMPANIES);
    const phone = gPhone();
    const email = `${name.split(' ')[0].toLowerCase()}@${company.toLowerCase().replace(/[^a-z]/g,'')}.ge`;
    const tags = sample(CONTACT_TAGS, randInt(1, 3));
    const source = pick(['manual','website','referral','cold-call']);
    const created_by = pick(['giorgi@dmt.ge','nino@dmt.ge','levan@dmt.ge','mariam@dmt.ge']);
    const created_at = daysAgo(randInt(1, 60));
    await client.query(
      `insert into public.dmt_contacts
         (id, name, company, position, phone, email, source, notes, tags, created_at, created_by, updated_at, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,now(),$11)`,
      [id, name, company, pick(POSITIONS), phone, email, source, '', tags, created_at, created_by]
    );
    contactIds.push({id, name, company, phone, email});
  }

  // 7. dmt_leads (pipeline)
  console.log('  → leads pipeline');
  const leadIds = [];
  for (let i = 0; i < 30; i++) {
    const id = String(i + 1);
    const name = gName();
    const company = pick(COMPANIES);
    const stage = pick(PIPELINE_STAGES);
    const offerStatus =
      stage === 'won' ? 'offer_accepted' :
      stage === 'lost' ? 'offer_rejected' :
      'offer_in_progress';
    const labels = sample(LABEL_LIB, randInt(1, 3));
    const owner = pick(['giorgi@dmt.ge','nino@dmt.ge','levan@dmt.ge','mariam@dmt.ge','davit@dmt.ge']);
    const value = randInt(2, 80) * 100;
    const fromContact = Math.random() < 0.4 ? pick(contactIds).id : null;
    const inventoryChecked = stage === 'proposal' || stage === 'won' || (Math.random() < 0.3);
    const checkedAt = inventoryChecked ? daysAgo(randInt(0, 20)) : null;
    const checkedBy = inventoryChecked ? owner : null;
    const created_at = daysAgo(randInt(1, 60));
    await client.query(
      `insert into public.dmt_leads
         (id, name, company, phone, email, source, stage, owner, value, labels, offer_status,
          inventory_checked, inventory_checked_at, inventory_checked_by, from_contact_id,
          created_at, created_by, updated_at, updated_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,now(),$17)`,
      [id, name, company, gPhone(), `${name.split(' ')[0].toLowerCase()}@example.ge`,
       pick(SOURCES), stage, owner, value, labels, offerStatus,
       inventoryChecked, checkedAt, checkedBy, fromContact,
       created_at, owner]
    );
    leadIds.push({id, name, company, owner, stage, value});
  }

  // 8. wire converted contacts → leads
  console.log('  → contact ↔ lead conversion');
  const convertedCount = Math.floor(contactIds.length * 0.4);
  for (let i = 0; i < convertedCount; i++) {
    const c = contactIds[i];
    const l = pick(leadIds);
    await client.query(
      `update public.dmt_contacts
         set converted_to_lead_id = $1, converted_at = $2, converted_by = $3
       where id = $4`,
      [l.id, daysAgo(randInt(0, 20)), pick(['giorgi@dmt.ge','nino@dmt.ge']), c.id]
    );
  }

  // 9. dmt_manual_leads
  console.log('  → manual_leads');
  const manualIds = [];
  for (let i = 0; i < 25; i++) {
    const id = String(i + 1);
    const company = pick(COMPANIES);
    const contact = gName();
    const phone = gPhone();
    const contract = randInt(3, 90) * 100;
    const status = pick(MANUAL_STATUSES);
    const role = pick(POSITIONS);
    const owner = pick(USERS.filter(u => u.status === 'active')).name;
    const period = `Q${randInt(1, 4)} 2026`;
    const editor = pick(USERS.filter(u => u.status === 'active'));
    const edited_at = daysAgo(randInt(0, 30));
    const created_by = editor.email;
    await client.query(
      `insert into public.dmt_manual_leads
         (id, company, contact, phone, contract, status, role, owner, period, edited_by, edited_at, created_by)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [id, company, contact, phone, contract, status, role, owner, period, editor.name, edited_at, created_by]
    );
    manualIds.push(id);
  }

  // 10. dmt_manual_extra_cols + vals
  console.log('  → manual extra cols + vals');
  const extraCols = [
    {id: 'col_priority',    label: 'პრიორიტეტი',   kind: 'select', width: 130, var_set_id: 'vs_priority', position: 0},
    {id: 'col_lastcontact', label: 'ბოლო კონტაქტი', kind: 'text',   width: 160, var_set_id: null,          position: 1},
    {id: 'col_score',       label: 'შეფასება',      kind: 'number', width: 100, var_set_id: null,          position: 2}
  ];
  for (const c of extraCols) {
    await client.query(
      `insert into public.dmt_manual_extra_cols (id, label, kind, width, var_set_id, options, position, created_at)
       values ($1,$2,$3,$4,$5,'[]'::jsonb,$6,now())`,
      [c.id, c.label, c.kind, c.width, c.var_set_id, c.position]
    );
  }
  for (const lead_id of manualIds) {
    if (Math.random() < 0.7) {
      await client.query(
        `insert into public.dmt_manual_extra_vals (lead_id, col_id, value) values ($1,'col_priority',$2)`,
        [lead_id, pick(['low','medium','high','urgent'])]
      );
    }
    if (Math.random() < 0.5) {
      await client.query(
        `insert into public.dmt_manual_extra_vals (lead_id, col_id, value) values ($1,'col_lastcontact',$2)`,
        [lead_id, `${randInt(1,30)} დღის წინ`]
      );
    }
    if (Math.random() < 0.4) {
      await client.query(
        `insert into public.dmt_manual_extra_vals (lead_id, col_id, value) values ($1,'col_score',$2)`,
        [lead_id, String(randInt(1, 10))]
      );
    }
  }

  // 11. dmt_offers
  console.log('  → offers');
  const STATUS_BAG_OFFER = ['draft','draft','sent','sent','sent','approved','approved','rejected','cancelled'];
  const offerIds = [];
  for (let i = 0; i < 12; i++) {
    const id = String(i + 1);
    const lead = pick(leadIds);
    const status = pick(STATUS_BAG_OFFER);
    const itemCount = randInt(2, 6);
    const items = sample(invIds, itemCount).map((it) => {
      const qty = randInt(1, 8);
      return {sku: it.sku, name: it.name, qty, unit_price: it.price, line_total: +(qty * it.price).toFixed(2)};
    });
    const subtotal = +items.reduce((s, x) => s + x.line_total, 0).toFixed(2);
    const labor_per_unit = 80.0;
    const labor_total = +(items.reduce((s, x) => s + x.qty, 0) * labor_per_unit).toFixed(2);
    const margin_percent = pick([10, 12, 15, 18, 20]);
    const margin_amount = +((subtotal + labor_total) * margin_percent / 100).toFixed(2);
    const pre_vat = subtotal + labor_total + margin_amount;
    const vat_rate = 18.0;
    const vat_amount = +(pre_vat * vat_rate / 100).toFixed(2);
    const total = +(pre_vat + vat_amount).toFixed(2);
    const created_at = daysAgo(randInt(1, 30));
    const updated_at = daysAgo(randInt(0, 15));
    const created_by = lead.owner;
    const docNumberRow = await client.query(`select public.dmt_next_offer_doc_number() as n`);
    const doc_number = docNumberRow.rows[0].n;
    const sentAt = ['sent','approved','rejected'].includes(status) ? daysAgo(randInt(0, 14)) : null;
    const approvedAt = status === 'approved' ? daysAgo(randInt(0, 7)) : null;
    const rejectedAt = status === 'rejected' ? daysAgo(randInt(0, 7)) : null;
    const pdfGenerated = Math.random() < 0.5 && status !== 'draft';
    await client.query(
      `insert into public.dmt_offers
         (id, lead_id, status, items, subtotal, vat_rate, vat_amount, total, currency,
          delivery_terms, payment_terms, notes,
          share_token, share_token_expires_at, sent_at, approved_at, approved_by_client,
          rejected_at, rejection_reason,
          doc_number, doc_date, labor_per_unit, labor_total, margin_percent, margin_amount,
          include_money_back_guarantee,
          pdf_url, pdf_generated_at, pdf_generated_by, pdf_doc_size_bytes,
          created_at, created_by, updated_at, updated_by)
       values ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,
               $10,$11,$12,
               $13,$14,$15,$16,$17,
               $18,$19,
               $20,$21,$22,$23,$24,$25,
               $26,
               $27,$28,$29,$30,
               $31,$32,$33,$34)`,
      [
        id, lead.id, status, JSON.stringify(items), subtotal, vat_rate, vat_amount, total, 'GEL',
        '5-7 სამუშაო დღე', 'წინასწარი 50%, დანარჩენი ჩაბარებაზე', '',
        sentAt ? `tk_${slug(16)}` : null,
        sentAt ? daysAgo(-30) : null,
        sentAt, approvedAt, status === 'approved' ? lead.name : null,
        rejectedAt, status === 'rejected' ? pick(['ფასი მაღალია','აირჩიეს კონკურენტი','გადაიდო']) : null,
        doc_number, daysAgo(randInt(0, 30)),
        labor_per_unit, labor_total, margin_percent, margin_amount,
        true,
        pdfGenerated ? `https://example.supabase.co/storage/v1/object/public/dmt-offers-pdfs/${id}.pdf` : null,
        pdfGenerated ? daysAgo(randInt(0, 5)) : null,
        pdfGenerated ? created_by : null,
        pdfGenerated ? randInt(80000, 250000) : null,
        created_at, created_by, updated_at, created_by
      ]
    );
    offerIds.push({id, lead_id: lead.id, status, doc_number});
  }

  // 12. dmt_offers_audit
  console.log('  → offers audit');
  for (const o of offerIds) {
    const created = daysAgo(randInt(1, 30));
    await client.query(
      `insert into public.dmt_offers_audit (at, by, action, offer_id, lead_id, before_val, after_val, notes)
       values ($1,$2,'create',$3,$4,null,$5::jsonb,$6)`,
      [created, 'giorgi@dmt.ge', o.id, o.lead_id, JSON.stringify({status: 'draft', doc_number: o.doc_number}), 'შემოთავაზება შეიქმნა']
    );
    if (o.status !== 'draft') {
      await client.query(
        `insert into public.dmt_offers_audit (at, by, action, offer_id, lead_id, before_val, after_val, notes)
         values ($1,$2,'send',$3,$4,$5::jsonb,$6::jsonb,$7)`,
        [daysAgo(randInt(0, 14)), pick(['giorgi@dmt.ge','nino@dmt.ge']), o.id, o.lead_id,
         JSON.stringify({status: 'draft'}), JSON.stringify({status: 'sent'}), 'კლიენტს გაეგზავნა']
      );
    }
    if (o.status === 'approved') {
      await client.query(
        `insert into public.dmt_offers_audit (at, by, action, offer_id, lead_id, before_val, after_val, notes)
         values ($1,$2,'approve',$3,$4,$5::jsonb,$6::jsonb,null)`,
        [daysAgo(randInt(0, 7)), 'client', o.id, o.lead_id,
         JSON.stringify({status: 'sent'}), JSON.stringify({status: 'approved'})]
      );
    }
    if (o.status === 'rejected') {
      await client.query(
        `insert into public.dmt_offers_audit (at, by, action, offer_id, lead_id, before_val, after_val, notes)
         values ($1,$2,'reject',$3,$4,$5::jsonb,$6::jsonb,$7)`,
        [daysAgo(randInt(0, 7)), 'client', o.id, o.lead_id,
         JSON.stringify({status: 'sent'}), JSON.stringify({status: 'rejected'}), 'უარი თქვა კლიენტმა']
      );
    }
  }

  // 13. dmt_lead_inventory_photos
  console.log('  → lead photos');
  for (let i = 0; i < 18; i++) {
    const id = String(i + 1);
    const lead = pick(leadIds);
    const aiAnalyzed = Math.random() < 0.6;
    const matched = aiAnalyzed && Math.random() < 0.7 ? pick(invIds) : null;
    const matchedQty = matched ? randInt(1, 5) : null;
    const aiAnalysis = aiAnalyzed
      ? {
          detected_objects: matched ? [matched.name] : ['unrecognized HVAC component'],
          confidence: matched ? +(0.7 + Math.random() * 0.3).toFixed(2) : 0.4,
          suggested_qty: matchedQty,
          model_notes: 'Inventory match suggestion based on visual signature'
        }
      : null;
    const created_by = pick(['giorgi@dmt.ge','levan@dmt.ge','mariam@dmt.ge']);
    const created_at = daysAgo(randInt(0, 25));
    const photoUrl = `https://placehold.co/1024x768/1a3a6b/ffffff?text=${encodeURIComponent(matched ? matched.sku : 'photo-' + i)}`;
    const thumbnailUrl = `https://placehold.co/256x192/1a3a6b/ffffff?text=${encodeURIComponent(matched ? matched.sku : 'p' + i)}`;
    await client.query(
      `insert into public.dmt_lead_inventory_photos
         (id, lead_id, photo_url, thumbnail_url, ai_analyzed, ai_analysis, ai_model, ai_analyzed_at,
          matched_inventory_id, matched_qty, user_notes, created_at, created_by, updated_at, updated_by)
       values ($1,$2,$3,$4,$5,$6::jsonb,$7,$8,$9,$10,$11,$12,$13,now(),$13)`,
      [id, lead.id, photoUrl, thumbnailUrl, aiAnalyzed,
       aiAnalysis ? JSON.stringify(aiAnalysis) : null,
       aiAnalyzed ? 'claude-sonnet-4-6' : null,
       aiAnalyzed ? daysAgo(randInt(0, 5)) : null,
       matched ? matched.id : null,
       matchedQty,
       Math.random() < 0.4 ? 'მოწმობა საჭიროა' : '',
       created_at, created_by]
    );
  }

  // 14. dmt_leads_audit
  console.log('  → leads audit');
  for (let i = 0; i < 20; i++) {
    const lead = pick(leadIds);
    const at = daysAgo(randInt(0, 30));
    const by = pick(['giorgi@dmt.ge','nino@dmt.ge','levan@dmt.ge','mariam@dmt.ge']);
    const colKey = pick(['stage','value','owner','offer_status']);
    const colLabel = ({stage:'სტატუსი', value:'ღირებულება', owner:'მფლობელი', offer_status:'შემოთავაზება'})[colKey];
    const before_val = colKey === 'value' ? String(randInt(1, 50) * 100) : pick(['new','qualified','proposal']);
    const after_val = colKey === 'value' ? String(randInt(1, 50) * 100) : lead.stage;
    await client.query(
      `insert into public.dmt_leads_audit (at, by, action, lead_id, lead_label, column_key, column_label, before_val, after_val)
       values ($1,$2,'update',$3,$4,$5,$6,$7,$8)`,
      [at, by, lead.id, `${lead.name} · ${lead.company}`, colKey, colLabel, before_val, after_val]
    );
  }

  // 15. dmt_contacts_audit
  console.log('  → contacts audit');
  for (let i = 0; i < 15; i++) {
    const c = pick(contactIds);
    const at = daysAgo(randInt(0, 30));
    const by = pick(['giorgi@dmt.ge','nino@dmt.ge']);
    const colKey = pick(['phone','email','notes','tags']);
    const colLabel = ({phone:'ტელეფონი', email:'ელ-ფოსტა', notes:'შენიშვნა', tags:'ტეგები'})[colKey];
    await client.query(
      `insert into public.dmt_contacts_audit (at, by, action, contact_id, contact_label, column_key, column_label, before_val, after_val)
       values ($1,$2,'update',$3,$4,$5,$6,$7,$8)`,
      [at, by, c.id, `${c.name} · ${c.company}`, colKey, colLabel, '(old)', '(new)']
    );
  }

  // 16. dmt_fb_leads
  console.log('  → fb leads');
  const STATUS_BAG_FB = ['new','new','new','new','new','new','new','new',
                         'called','called','called','called','called','called',
                         'scheduled','scheduled','scheduled',
                         'converted','converted',
                         'lost','lost'];
  const memberIds = ['levan@dmt.ge','mariam@dmt.ge','davit@dmt.ge'].map((e) => userIds[e]);
  for (let i = 0; i < 75; i++) {
    const adset = pick(ADSETS);
    const ad = ADS.find((a) => a.adset === adset.id) || pick(ADS);
    const form = pick(FORMS);
    const created = daysAgo(randInt(0, 30));
    const name = gName();
    const phone = gPhone();
    const email = `lead${i}@example.ge`;
    const interest = pick(INTERESTS);
    const city = pick(CITIES);
    const status = pick(STATUS_BAG_FB);
    const assigned = Math.random() < 0.7 ? pick(memberIds) : null;
    const fieldData = [
      {name: 'full_name', values: [name]},
      {name: 'phone_number', values: [phone]},
      {name: 'email', values: [email]},
      {name: 'city', values: [city]},
      {name: 'interest', values: [interest]}
    ];
    const updatedAt = status === 'new' ? created : daysAgo(randInt(0, 15));
    await client.query(
      `insert into public.dmt_fb_leads
         (leadgen_id, page_id, ad_id, adset_id, campaign_id, form_id, form_name,
          created_time, field_data, full_name, phone, email, lead_status, assigned_to, raw, received_at, updated_at)
       values ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12,$13,$14,$15::jsonb,$16,$17)`,
      [
        `lg_${1700000000 + i}`, PAGE_ID, ad.id, adset.id, adset.campaign, form.id, form.name,
        created, JSON.stringify(fieldData), name, phone, email, status, assigned,
        JSON.stringify({source: 'seed', adset_name: adset.name, ad_name: ad.name}),
        created, updatedAt
      ]
    );
  }

  // 17. dmt_audit_log (append-only)
  console.log('  → audit log');
  const auditEntries = [];
  for (const u of USERS) {
    const id = userIds[u.email];
    const action = u.email === 'giorgi@dmt.ge' ? 'register.bootstrap' : 'register.invite';
    auditEntries.push({
      actor_id: u.email === 'giorgi@dmt.ge' ? id : ownerId,
      actor_email: u.email === 'giorgi@dmt.ge' ? u.email : 'giorgi@dmt.ge',
      actor_role: 'owner', action,
      entity_type: 'dmt_user', entity_id: id,
      payload: {email: u.email, name: u.name, role: u.role},
      created_at: daysAgo(randInt(30, 90))
    });
    if (u.status === 'active') {
      const logins = randInt(1, 3);
      for (let i = 0; i < logins; i++) {
        auditEntries.push({
          actor_id: id, actor_email: u.email, actor_role: u.role,
          action: 'login.success', entity_type: 'dmt_user', entity_id: id,
          payload: {ip_anon: '192.168.x.x'},
          created_at: minutesAgo(randInt(60, 60 * 24 * 14))
        });
      }
    }
    if (u.status === 'suspended') {
      auditEntries.push({
        actor_id: ownerId, actor_email: 'giorgi@dmt.ge', actor_role: 'owner',
        action: 'user.update', entity_type: 'dmt_user', entity_id: id,
        payload: {field: 'status', before: 'active', after: 'suspended', reason: 'inactivity > 60 days'},
        created_at: daysAgo(randInt(2, 20))
      });
    }
  }
  for (let i = 0; i < 4; i++) {
    auditEntries.push({
      actor_id: null, actor_email: `attacker${i}@bad.com`, actor_role: null,
      action: 'login.fail', entity_type: 'dmt_user', entity_id: null,
      payload: {reason: 'invalid_credentials', ip_anon: '203.0.113.x'},
      created_at: minutesAgo(randInt(60, 60 * 24 * 30))
    });
  }
  auditEntries.sort((a, b) => +a.created_at - +b.created_at);
  for (const e of auditEntries) {
    await client.query(
      `insert into public.dmt_audit_log
         (actor_id, actor_email, actor_role, action, entity_type, entity_id, payload, ip, user_agent, created_at)
       values ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10)`,
      [e.actor_id, e.actor_email, e.actor_role, e.action, e.entity_type, e.entity_id,
       JSON.stringify(e.payload), '192.0.2.1', 'Mozilla/5.0 (seed)', e.created_at]
    );
  }

  // 18. dmt_fb_webhook_settings
  console.log('  → fb webhook settings');
  await client.query(
    `update public.dmt_fb_webhook_settings
       set verify_token = $1, app_secret = $2, page_access_token = $3,
           updated_at = now(), updated_by = $4
     where id = 1`,
    ['demo_verify_token_123', 'demo_app_secret_xyz', 'demo_page_token_abc', ownerId]
  );

  console.log('\ndone.');
  console.log('\n===== Demo accounts (password: demo123) =====');
  for (const u of USERS) {
    console.log(`  [${u.role.padEnd(6)} ${u.status.padEnd(9)}] ${u.email}  ·  ${u.name}`);
  }
  console.log('\nLogin at: http://localhost:3000/dmt/login');

  await client.end();
}

main().catch(async (e) => {
  console.error('seed failed:', e.message);
  console.error(e.stack);
  try { await client.query('rollback'); } catch {}
  try { await client.end(); } catch {}
  process.exit(1);
});
