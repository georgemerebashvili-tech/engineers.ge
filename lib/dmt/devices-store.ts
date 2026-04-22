// DMT · მოწყობილობები (Devices / Controllers)
//
// localStorage-backed catalog of controllers. Each device has tabs:
// General / I/O connectors / Buttons / Error list / Anomalies / Wiring /
// Variables (PLC mapping) / Downloads. Up to 3 images per device.

export type DeviceCategory =
  | 'controller'
  | 'sensor'
  | 'pump'
  | 'tank'
  | 'hvac'
  | 'network'
  | 'relay'
  | 'other';

export type DeviceImage = {
  id: string;
  dataUrl: string;
  caption?: string;
};

export type DeviceIO = {
  id: string;
  name: string;     // J1, T1, ...
  kind: string;     // "Analog IN", "Digital OUT", "Modbus RTU", ...
  pin: string;      // "Pin 3" / "A/B"
  signal: string;   // 0-10V, 4-20mA, dry contact
  notes: string;
};

export type DeviceButton = {
  id: string;
  name: string;     // Connect, Calibration, Reset, Pair
  steps: string;
  notes: string;
};

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export type DeviceError = {
  id: string;
  code: string;          // E001, W12
  description: string;
  recovery: string;
  severity: ErrorSeverity;
};

export type DeviceAnomaly = {
  id: string;
  title: string;
  trigger: string;          // ვითარება
  expected: string;         // მოსალოდნელი ქცევა
  actual: string;           // ფაქტობრივი ქცევა
  resolution: string;       // გადაწყვეტა
  lastSeen: string;         // 'YYYY-MM-DD' or 'intermittent'
  severity: ErrorSeverity;
};

export type VariableScope = 'read' | 'write' | 'read-write';
export type VariableKind = 'analog' | 'digital' | 'numeric' | 'string' | 'enum';

export type DeviceVariable = {
  id: string;
  key: string;         // Reserved key / PLC symbol
  plcAddress: string;  // ~PLC address e.g. %MW100 / %IX0.1
  label: string;
  kind: VariableKind;
  unit?: string;
  scope: VariableScope;
  notes?: string;
};

export type DeviceFile = {
  id: string;
  label: string;
  url: string;
  kind: 'firmware' | 'manual' | 'drawing' | 'datasheet' | 'schematic' | 'other';
};

export type Device = {
  id: string;
  code: string;         // slug key (GW, IPMP, BLR, ...)
  fullCode: string;     // "GW V12.25.V1.01"
  accCode: string;      // "CONTR0001"
  name: string;         // "Gateway"
  nameGe: string;       // "მასტერი" (short Georgian)
  description: string;  // long Georgian description
  category: DeviceCategory;
  plcBaseAddress?: string;   // ~PLC base, e.g. "%MW0"
  supplyVoltage?: string;    // "24V DC"
  mountType?: string;        // "DIN rail 35mm"
  firmwareVersion?: string;  // "V12.25.V1.01"
  images: DeviceImage[];     // max 3
  ioConnectors: DeviceIO[];
  buttons: DeviceButton[];
  errors: DeviceError[];
  anomalies: DeviceAnomaly[];
  variables: DeviceVariable[];
  wiringDiagramDataUrl?: string;
  files: DeviceFile[];
  createdAt: string;
  updatedAt: string;
};

export const MAX_DEVICE_IMAGES = 3;

const LS_KEY = 'dmt_devices_v1';

export function cryptoRandomId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Seed catalog — 22 controllers from the engineering spec.
export const DEVICE_SEED: Array<Omit<Device, 'id' | 'images' | 'ioConnectors' | 'buttons' | 'errors' | 'anomalies' | 'variables' | 'files' | 'createdAt' | 'updatedAt'>> = [
  {code: 'GW',     fullCode: 'GW V12.25.V1.01',     accCode: 'CONTR0001', name: 'Gateway',                     nameGe: 'მასტერი',           description: 'მასტერი — ქსელის ცენტრალური კონტროლერი, სხვა კონტროლერებს აერთიანებს ერთიან ქსელში.',       category: 'network',    plcBaseAddress: '%MW0',    supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'IPMP',   fullCode: 'IPMP V12.25.V1.01',   accCode: 'CONTR0002', name: 'Inline Pump',                 nameGe: 'რეცირკ. ტუმბო',     description: 'რეცირკულაციის ტუმბოს კონტროლერი — ცხელი წყლის ქსელის მუდმივი ცირკულაცია.',                category: 'pump',       plcBaseAddress: '%MW100',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'BLR',    fullCode: 'BLR V12.25.V1.01',    accCode: 'CONTR0003', name: 'Boiler',                      nameGe: 'ქვაბი',             description: 'გათბობის სამთავრობო ქვაბის (კაზანი) კონტროლერი — burner / pump / safety interlock.',      category: 'hvac',       plcBaseAddress: '%MW200',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'HWT',    fullCode: 'HWT V12.25.V1.01',    accCode: 'CONTR0004', name: 'HOT Water Tank',              nameGe: 'ცხელი წყლის ავზი',   description: 'ცხელი წყლის ავზის კონტროლერი — ტემპერატურის მართვა, heater relay, safety cutoff.',       category: 'tank',       plcBaseAddress: '%MW300',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'CWT',    fullCode: 'CWT V12.25.V1.01',    accCode: 'CONTR0005', name: 'COLD Water Tank',             nameGe: 'ცივი წყლის ავზი',    description: 'ცივი წყლის ავზის კონტროლერი — დონე / ტუმბო / over-flow alarm.',                           category: 'tank',       plcBaseAddress: '%MW400',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: '5RL',    fullCode: '5RL V12.25.V1.01',    accCode: 'CONTR0006', name: '5 Relay',                     nameGe: '5-რელე',            description: '5-რელეიანი გამომავალი მოდული — მსუბუქი დატვირთვის ჩართვა/გამორთვა.',                       category: 'relay',      plcBaseAddress: '%QX0.0',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: '12RL',   fullCode: '12RL V12.25.V1.01',   accCode: 'CONTR0007', name: '12 Relay',                    nameGe: '12-რელე',           description: '12-რელეიანი გამომავალი მოდული — მრავალი დატვირთვის მართვა (სინათლე, ფანი, ვენტ).',         category: 'relay',      plcBaseAddress: '%QX1.0',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'ACR',    fullCode: 'ACR V12.25.V1.01',    accCode: 'CONTR0008', name: 'Air Curtain',                 nameGe: 'ჰაერის ფარდა',      description: 'ჰაერის ფარდის კონტროლერი — კარის სენსორი, სიჩქარე, ელ. გათბობის elemen.',                  category: 'hvac',       plcBaseAddress: '%MW500',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'RFGR',   fullCode: 'RFGR V12.25.V1.01',   accCode: 'CONTR0009', name: 'Refrigerator',                nameGe: 'მაცივარი',          description: 'მაცივრის / მორიცხვის კონტროლერი — კომპრესორი, დეფროსტი, fan, door alarm.',                category: 'hvac',       plcBaseAddress: '%MW600',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'MBUS',   fullCode: 'MBUS V12.25.V1.01',   accCode: 'CONTR0010', name: 'RS485 Controller',            nameGe: 'RS485 ბრიჯი',       description: 'VRF / ჩილერი / AHU კონტროლერი — Modbus RTU ბრიჯი.',                                       category: 'network',    plcBaseAddress: '%MW700',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'VNT',    fullCode: 'VNT V12.25.V1.01',    accCode: 'CONTR0011', name: 'Ventilator',                  nameGe: 'ვენტილატორი',       description: 'ვენტილაციის კონტროლერი — fan სიჩქარე, CO₂ სენსორი, damper feedback.',                      category: 'hvac',       plcBaseAddress: '%MW800',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'CCTR',   fullCode: 'CCTR V12.25.V1.01',   accCode: 'CONTR0012', name: 'Cable Controller',            nameGe: 'კაბელის კონტრ.',    description: 'დასაგრიალებელი/დასატვირთი კაბელის კონტროლერი — motor drive, endstop, current monitoring.', category: 'controller', plcBaseAddress: '%MW900',  supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'PWRM',   fullCode: 'PWRM V12.25.V1.01',   accCode: 'CONTR0013', name: 'Power Monitor',               nameGe: 'დენის მზომი',       description: 'დენის ხარჯის მზომი კონტროლერი — ერთფაზიანი, 100A-მდე; kWh ინტეგრატორი.',                  category: 'sensor',     plcBaseAddress: '%MW1000', supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'THRM',   fullCode: 'THRM V12.25.V1.01',   accCode: 'CONTR0014', name: 'Thermometer',                 nameGe: 'თერმომეტრი',        description: 'თერმომეტრი / ტექნიკური ტემპერატურული სენსორი — Pt100/Pt1000 input, 4-20mA output.',        category: 'sensor',     plcBaseAddress: '%MW1100', supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'FCU',    fullCode: 'FCU V12.25.V1.01',    accCode: 'CONTR0015', name: 'Fancoil',                     nameGe: 'ფენკოილი',          description: 'წყლის ფენკოილის კონტროლერი — 3-speed fan, 3-way valve, room temp.',                        category: 'hvac',       plcBaseAddress: '%MW1200', supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'BSTP',   fullCode: 'BSTP V12.25.V1.01',   accCode: 'CONTR0016', name: 'Booster Pump',                nameGe: 'ბუსტერ ტუმბო',      description: 'ბუსტერ ტუმბოს კონტროლერი — წნევის სენსორი, VFD ინტეგრაცია, dry-run protection.',          category: 'pump',       plcBaseAddress: '%MW1300', supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'USPLT',  fullCode: 'USPLT V12.25.V1.01',  accCode: 'CONTR0017', name: 'Universal Split Controller',  nameGe: 'სპლიტ-კონტრ.',      description: 'კონდიციონერისთვის უნივერსალური მართვის ბლოკი — IR/serial.',                                category: 'hvac',       plcBaseAddress: '%MW1400', supplyVoltage: '24V DC', mountType: 'wall-mount',      firmwareVersion: 'V12.25.V1.01'},
  {code: 'ENRG',   fullCode: 'ENRG V12.25.V1.01',   accCode: 'CONTR0018', name: 'Energeer',                    nameGe: 'Energeer',          description: 'ერთფაზა მრივფუნქც. რელე — over/under voltage, phase loss, ORM protection.',               category: 'sensor',     plcBaseAddress: '%MW1500', supplyVoltage: '230V AC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'CLRMT',  fullCode: 'CLRMT V12.25.V1.01',  accCode: 'CONTR0019', name: 'Calorimeter',                 nameGe: 'კალორიმეტრი',       description: 'წყლის ფრიფეროლი / heat meter — flow + ΔT, kWh თბო ინტეგრატორი.',                          category: 'sensor',     plcBaseAddress: '%MW1600', supplyVoltage: '24V DC', mountType: 'inline',          firmwareVersion: 'V12.25.V1.01'},
  {code: 'MBUSTH', fullCode: 'MBUSTH V12.25.V1.01', accCode: 'CONTR0020', name: 'RS485 Thermostat',            nameGe: 'RS485 თერმოსტატი',  description: 'VRF / ჩილერი / AHU თერმოსტატი — Modbus RTU, ოთახის დონეზე.',                              category: 'hvac',       plcBaseAddress: '%MW1700', supplyVoltage: '24V DC', mountType: 'wall-mount',      firmwareVersion: 'V12.25.V1.01'},
  {code: 'HRU',    fullCode: 'HRU V12.25.V1.01',    accCode: 'CONTR0021', name: 'HRU',                         nameGe: 'რეკუპერაცია',       description: 'რეკუპერაციული ვენტილაცია — heat recovery unit, bypass, defrost.',                         category: 'hvac',       plcBaseAddress: '%MW1800', supplyVoltage: '24V DC', mountType: 'DIN rail 35mm', firmwareVersion: 'V12.25.V1.01'},
  {code: 'IAQ',    fullCode: 'IAQ V12.25.V1.01',    accCode: 'CONTR0022', name: 'IAQ',                         nameGe: 'ჰაერის ხარისხი',    description: 'ჰაერის ხარისხის კონტროლერი — CO₂, VOC, PM2.5, temp/humidity.',                            category: 'sensor',     plcBaseAddress: '%MW1900', supplyVoltage: '24V DC', mountType: 'wall-mount',      firmwareVersion: 'V12.25.V1.01'}
];

function buildSeed(): Device[] {
  const now = new Date().toISOString();
  return DEVICE_SEED.map((s) => ({
    ...s,
    id: cryptoRandomId(),
    images: [],
    ioConnectors: [],
    buttons: [],
    errors: [],
    anomalies: [],
    variables: [],
    files: [],
    createdAt: now,
    updatedAt: now
  }));
}

export function loadDevices(): Device[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) {
      const seed = buildSeed();
      localStorage.setItem(LS_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return buildSeed();
    return parsed as Device[];
  } catch {
    return buildSeed();
  }
}

export function saveDevices(devices: Device[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(devices));
  } catch {}
}

export function resetDevicesToSeed(): Device[] {
  const seed = buildSeed();
  saveDevices(seed);
  return seed;
}

export function findDeviceByCode(devices: Device[], code: string): Device | null {
  const t = code.trim().toLowerCase();
  return (
    devices.find(
      (d) =>
        d.code.toLowerCase() === t ||
        d.fullCode.toLowerCase() === t ||
        d.accCode.toLowerCase() === t
    ) ?? null
  );
}

export const CATEGORY_META: Record<
  DeviceCategory,
  {label: string; color: string; bg: string; border: string}
> = {
  controller: {label: 'კონტროლერი', color: 'var(--blue)', bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  sensor:     {label: 'სენსორი',   color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  pump:       {label: 'ტუმბო',     color: 'var(--grn)',  bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  tank:       {label: 'ავზი',       color: 'var(--grn)',  bg: 'var(--grn-lt)',  border: 'var(--grn-bd)'},
  hvac:       {label: 'HVAC',      color: 'var(--blue)', bg: 'var(--blue-lt)', border: 'var(--blue-bd)'},
  network:    {label: 'ქსელი',     color: 'var(--navy)', bg: 'var(--sur-2)',   border: 'var(--bdr)'},
  relay:      {label: 'რელე',      color: 'var(--red)',  bg: 'var(--red-lt)',  border: 'var(--red)'},
  other:      {label: 'სხვა',       color: 'var(--text-2)', bg: 'var(--sur-2)', border: 'var(--bdr)'}
};
