'use client';

import {useEffect, useMemo, useRef, useState} from 'react';
import Link from 'next/link';
import {useParams, useRouter} from 'next/navigation';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Info,
  Cable,
  MousePointerClick,
  AlertCircle,
  AlertTriangle,
  Network,
  Paperclip,
  ImagePlus,
  X,
  Upload,
  Save,
  Image as ImageIcon,
  Database,
  CircuitBoard
} from 'lucide-react';
import {
  loadDevices,
  saveDevices,
  cryptoRandomId,
  MAX_DEVICE_IMAGES,
  CATEGORY_META,
  type Device,
  type DeviceCategory,
  type DeviceIO,
  type DeviceButton,
  type DeviceError,
  type DeviceAnomaly,
  type DeviceVariable,
  type DeviceFile,
  type DeviceImage,
  type ErrorSeverity,
  type VariableKind,
  type VariableScope
} from '@/lib/dmt/devices-store';

type Tab =
  | 'general'
  | 'io'
  | 'buttons'
  | 'errors'
  | 'anomalies'
  | 'variables'
  | 'wiring'
  | 'files';

const TABS: {key: Tab; label: string; Icon: typeof Info}[] = [
  {key: 'general',   label: 'General',         Icon: Info},
  {key: 'io',        label: 'I/O connectors',  Icon: Cable},
  {key: 'buttons',   label: 'ღილაკები',         Icon: MousePointerClick},
  {key: 'errors',    label: 'შეცდომები',        Icon: AlertCircle},
  {key: 'anomalies', label: 'ანომალიები',       Icon: AlertTriangle},
  {key: 'variables', label: 'ცვლადები',         Icon: Database},
  {key: 'wiring',    label: 'მონტაჟის სქემა',   Icon: CircuitBoard},
  {key: 'files',     label: 'Download',         Icon: Paperclip}
];

const SEVERITY_META: Record<ErrorSeverity, {label: string; color: string; bg: string; border: string}> = {
  critical: {label: 'კრიტიკული', color: 'var(--red)',  bg: 'var(--red-lt)',  border: 'var(--red)'},
  warning:  {label: 'გაფრთ.',    color: 'var(--ora)',  bg: 'var(--ora-lt)',  border: 'var(--ora-bd)'},
  info:     {label: 'ინფო',      color: 'var(--blue)', bg: 'var(--blue-lt)', border: 'var(--blue-bd)'}
};

export default function DevicePage() {
  const params = useParams<{code: string}>();
  const router = useRouter();
  const code = decodeURIComponent(params?.code ?? '');
  const [devices, setDevices] = useState<Device[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [tab, setTab] = useState<Tab>('general');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setDevices(loadDevices());
    setHydrated(true);
  }, []);

  const device = useMemo(
    () => devices.find((d) => d.code === code) ?? null,
    [devices, code]
  );

  const update = (patch: Partial<Device>) => {
    if (!device) return;
    const next = devices.map((d) =>
      d.id === device.id ? {...d, ...patch, updatedAt: new Date().toISOString()} : d
    );
    setDevices(next);
    setDirty(true);
  };

  const persist = () => {
    saveDevices(devices);
    setDirty(false);
  };

  useEffect(() => {
    if (!dirty) return;
    const t = setTimeout(persist, 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [devices, dirty]);

  const removeDevice = () => {
    if (!device) return;
    if (!confirm(`წავშალოთ „${device.fullCode}"?`)) return;
    const next = devices.filter((d) => d.id !== device.id);
    saveDevices(next);
    router.push('/dmt/devices');
  };

  if (!hydrated) {
    return (
      <div className="flex h-screen items-center justify-center text-[12px] text-text-3">
        იტვირთება…
      </div>
    );
  }
  if (!device) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-3 text-center">
        <div className="text-[14px] font-semibold text-navy">
          მოწყობილობა „{code}" ვერ მოიძებნა
        </div>
        <Link
          href="/dmt/devices"
          className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
        >
          <ArrowLeft size={14} /> კატალოგში დაბრუნება
        </Link>
      </div>
    );
  }

  const meta = CATEGORY_META[device.category];

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-bdr bg-sur px-6 py-4 md:px-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href="/dmt/devices"
                className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-[11.5px] font-semibold text-text-2 hover:bg-sur-2 hover:text-blue"
              >
                <ArrowLeft size={13} /> კატალოგი
              </Link>
              <span
                className="inline-flex items-center rounded-full border px-2 py-0.5 text-[10.5px] font-semibold"
                style={{color: meta.color, background: meta.bg, borderColor: meta.border}}
              >
                {meta.label}
              </span>
              <span className="font-mono text-[10.5px] text-text-3">{device.accCode}</span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline gap-3">
              <h1 className="text-xl font-bold tracking-tight text-navy md:text-2xl">
                {device.name}
              </h1>
              <span className="font-mono text-[13px] font-semibold text-text-2">
                {device.fullCode}
              </span>
            </div>
            {device.nameGe && (
              <p className="mt-0.5 text-[12px] text-text-2">{device.nameGe}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10.5px] font-mono text-text-3">
              {dirty ? 'იცვლება…' : 'შენახული'}
            </span>
            <button
              onClick={persist}
              className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-text-2 hover:border-blue hover:text-blue"
            >
              <Save size={14} /> შენახვა
            </button>
            <button
              onClick={removeDevice}
              className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-red hover:border-red"
            >
              <Trash2 size={14} /> წაშლა
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-bdr">
          {TABS.map((t) => {
            const active = t.key === tab;
            const count = tabCount(device, t.key);
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative -mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-[12.5px] font-semibold transition-colors ${
                  active
                    ? 'border-blue text-blue'
                    : 'border-transparent text-text-2 hover:text-navy'
                }`}
              >
                <t.Icon size={13} strokeWidth={1.8} />
                {t.label}
                {count !== null && (
                  <span
                    className={`rounded-full px-1.5 py-[1px] font-mono text-[9.5px] font-semibold ${
                      active ? 'bg-blue-lt text-blue' : 'bg-sur-2 text-text-3'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-6 py-5 md:px-8">
        {tab === 'general'   && <GeneralTab device={device} onUpdate={update} />}
        {tab === 'io'        && <IoTab device={device} onUpdate={update} />}
        {tab === 'buttons'   && <ButtonsTab device={device} onUpdate={update} />}
        {tab === 'errors'    && <ErrorsTab device={device} onUpdate={update} />}
        {tab === 'anomalies' && <AnomaliesTab device={device} onUpdate={update} />}
        {tab === 'variables' && <VariablesTab device={device} onUpdate={update} />}
        {tab === 'wiring'    && <WiringTab device={device} onUpdate={update} />}
        {tab === 'files'     && <FilesTab device={device} onUpdate={update} />}
      </div>
    </div>
  );
}

function tabCount(d: Device, key: Tab): number | null {
  switch (key) {
    case 'io':        return d.ioConnectors.length;
    case 'buttons':   return d.buttons.length;
    case 'errors':    return d.errors.length;
    case 'anomalies': return d.anomalies.length;
    case 'variables': return d.variables.length;
    case 'files':     return d.files.length;
    default: return null;
  }
}

/* ===================== General ===================== */

function GeneralTab({
  device,
  onUpdate
}: {
  device: Device;
  onUpdate: (p: Partial<Device>) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  const addImage = async (file: File) => {
    if (device.images.length >= MAX_DEVICE_IMAGES) {
      alert(`მაქსიმუმ ${MAX_DEVICE_IMAGES} სურათია დასაშვები.`);
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const next: DeviceImage = {id: cryptoRandomId(), dataUrl, caption: file.name};
    onUpdate({images: [...device.images, next]});
  };

  const removeImage = (id: string) => {
    onUpdate({images: device.images.filter((i) => i.id !== id)});
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
      <section className="space-y-4">
        <Field label="სახელი (EN)">
          <input
            value={device.name}
            onChange={(e) => onUpdate({name: e.target.value})}
            className="input"
          />
        </Field>
        <Field label="სახელი (GE)">
          <input
            value={device.nameGe}
            onChange={(e) => onUpdate({nameGe: e.target.value})}
            className="input"
          />
        </Field>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="Code">
            <input
              value={device.code}
              onChange={(e) => onUpdate({code: e.target.value})}
              className="input font-mono"
            />
          </Field>
          <Field label="Full code">
            <input
              value={device.fullCode}
              onChange={(e) => onUpdate({fullCode: e.target.value})}
              className="input font-mono"
            />
          </Field>
          <Field label="ACC Code">
            <input
              value={device.accCode}
              onChange={(e) => onUpdate({accCode: e.target.value})}
              className="input font-mono"
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <Field label="კატეგორია">
            <select
              value={device.category}
              onChange={(e) => onUpdate({category: e.target.value as DeviceCategory})}
              className="input"
            >
              {Object.entries(CATEGORY_META).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Firmware">
            <input
              value={device.firmwareVersion ?? ''}
              onChange={(e) => onUpdate({firmwareVersion: e.target.value})}
              className="input font-mono"
            />
          </Field>
          <Field label="~PLC base">
            <input
              value={device.plcBaseAddress ?? ''}
              onChange={(e) => onUpdate({plcBaseAddress: e.target.value})}
              className="input font-mono"
              placeholder="%MW0"
            />
          </Field>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="კვება">
            <input
              value={device.supplyVoltage ?? ''}
              onChange={(e) => onUpdate({supplyVoltage: e.target.value})}
              className="input"
              placeholder="24V DC"
            />
          </Field>
          <Field label="მონტაჟი">
            <input
              value={device.mountType ?? ''}
              onChange={(e) => onUpdate({mountType: e.target.value})}
              className="input"
              placeholder="DIN rail 35mm"
            />
          </Field>
        </div>

        <Field label="აღწერა">
          <textarea
            value={device.description}
            onChange={(e) => onUpdate({description: e.target.value})}
            rows={4}
            className="input resize-y"
          />
        </Field>
      </section>

      <section className="space-y-3">
        <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
          სურათები · max {MAX_DEVICE_IMAGES}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {device.images.map((img) => (
            <div
              key={img.id}
              className="group relative aspect-square overflow-hidden rounded-md border border-bdr bg-sur-2"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={img.dataUrl}
                alt={img.caption ?? ''}
                className="h-full w-full object-contain"
              />
              <button
                onClick={() => removeImage(img.id)}
                className="absolute right-1 top-1 inline-flex h-5 w-5 items-center justify-center rounded-full bg-red/90 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            </div>
          ))}
          {device.images.length < MAX_DEVICE_IMAGES && (
            <button
              onClick={() => fileRef.current?.click()}
              className="flex aspect-square flex-col items-center justify-center gap-1 rounded-md border border-dashed border-bdr bg-sur-2 text-text-3 hover:border-blue hover:text-blue"
            >
              <ImagePlus size={18} />
              <span className="font-mono text-[9px]">დამატება</span>
            </button>
          )}
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) addImage(f);
            e.target.value = '';
          }}
        />
        <div className="rounded-md border border-bdr bg-sur p-3 text-[11px] text-text-2">
          სურათები ინახება browser-ის localStorage-ში (data URL).
          გასუფთავდა — იმ device-ისთვის სხვა ბრაუზერში არ გამოჩნდება.
        </div>
      </section>
    </div>
  );
}

/* ===================== I/O ===================== */

function IoTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const add = () => {
    const row: DeviceIO = {
      id: cryptoRandomId(),
      name: `J${device.ioConnectors.length + 1}`,
      kind: 'Analog IN',
      pin: '',
      signal: '',
      notes: ''
    };
    onUpdate({ioConnectors: [...device.ioConnectors, row]});
  };
  const update = (id: string, patch: Partial<DeviceIO>) => {
    onUpdate({
      ioConnectors: device.ioConnectors.map((r) => (r.id === id ? {...r, ...patch} : r))
    });
  };
  const remove = (id: string) => {
    onUpdate({ioConnectors: device.ioConnectors.filter((r) => r.id !== id)});
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-navy">I/O connectors</h2>
        <button onClick={add} className="btn-primary">
          <Plus size={13} /> დამატება
        </button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase text-text-3">
              <th className="w-20 px-3 py-2">Name</th>
              <th className="w-40 px-3 py-2">Kind</th>
              <th className="w-28 px-3 py-2">Pin</th>
              <th className="w-32 px-3 py-2">Signal</th>
              <th className="px-3 py-2">Notes</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {device.ioConnectors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-[11.5px] text-text-3">
                  ცარიელია — დაამატე I/O კონექტორი.
                </td>
              </tr>
            )}
            {device.ioConnectors.map((r) => (
              <tr key={r.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2/50">
                <td className="p-1"><input className="cell font-mono" value={r.name} onChange={(e) => update(r.id, {name: e.target.value})} /></td>
                <td className="p-1">
                  <select className="cell" value={r.kind} onChange={(e) => update(r.id, {kind: e.target.value})}>
                    {['Analog IN','Analog OUT','Digital IN','Digital OUT','Modbus RTU','Modbus TCP','RS485','RS232','I²C','SPI','Power','Ground','Other'].map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
                <td className="p-1"><input className="cell font-mono" value={r.pin} onChange={(e) => update(r.id, {pin: e.target.value})} /></td>
                <td className="p-1"><input className="cell" value={r.signal} onChange={(e) => update(r.id, {signal: e.target.value})} placeholder="0-10V" /></td>
                <td className="p-1"><input className="cell" value={r.notes} onChange={(e) => update(r.id, {notes: e.target.value})} /></td>
                <td className="p-1 text-center">
                  <button onClick={() => remove(r.id)} className="text-text-3 hover:text-red">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== Buttons ===================== */

function ButtonsTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const add = () => {
    const row: DeviceButton = {id: cryptoRandomId(), name: 'Connect', steps: '', notes: ''};
    onUpdate({buttons: [...device.buttons, row]});
  };
  const update = (id: string, patch: Partial<DeviceButton>) => {
    onUpdate({buttons: device.buttons.map((r) => (r.id === id ? {...r, ...patch} : r))});
  };
  const remove = (id: string) => onUpdate({buttons: device.buttons.filter((r) => r.id !== id)});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-navy">ღილაკები / მოქმედებები</h2>
        <button onClick={add} className="btn-primary">
          <Plus size={13} /> დამატება
        </button>
      </div>
      <div className="space-y-3">
        {device.buttons.length === 0 && (
          <EmptyBlock>ცარიელია — დაამატე ღილაკი და აღწერე ნაბიჯები.</EmptyBlock>
        )}
        {device.buttons.map((b) => (
          <div key={b.id} className="rounded-[10px] border border-bdr bg-sur p-3">
            <div className="flex items-center gap-2">
              <input
                className="input flex-1 font-semibold"
                value={b.name}
                onChange={(e) => update(b.id, {name: e.target.value})}
              />
              <button onClick={() => remove(b.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:text-red">
                <Trash2 size={13} />
              </button>
            </div>
            <div className="mt-2 grid gap-2 md:grid-cols-2">
              <Field label="ნაბიჯები">
                <textarea
                  rows={3}
                  className="input resize-y"
                  value={b.steps}
                  onChange={(e) => update(b.id, {steps: e.target.value})}
                />
              </Field>
              <Field label="შენიშვნა">
                <textarea
                  rows={3}
                  className="input resize-y"
                  value={b.notes}
                  onChange={(e) => update(b.id, {notes: e.target.value})}
                />
              </Field>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ===================== Errors ===================== */

function ErrorsTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const add = () => {
    const row: DeviceError = {
      id: cryptoRandomId(),
      code: `E${String(device.errors.length + 1).padStart(3, '0')}`,
      description: '',
      recovery: '',
      severity: 'warning'
    };
    onUpdate({errors: [...device.errors, row]});
  };
  const update = (id: string, patch: Partial<DeviceError>) => {
    onUpdate({errors: device.errors.map((r) => (r.id === id ? {...r, ...patch} : r))});
  };
  const remove = (id: string) => onUpdate({errors: device.errors.filter((r) => r.id !== id)});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-navy">შეცდომების სია</h2>
        <button onClick={add} className="btn-primary">
          <Plus size={13} /> შეცდომა
        </button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase text-text-3">
              <th className="w-24 px-3 py-2">Code</th>
              <th className="w-28 px-3 py-2">სიმძიმე</th>
              <th className="px-3 py-2">აღწერა</th>
              <th className="px-3 py-2">მოგვარება</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {device.errors.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-center text-[11.5px] text-text-3">
                  ცარიელია — დაამატე შეცდომის კოდი.
                </td>
              </tr>
            )}
            {device.errors.map((r) => {
              const sm = SEVERITY_META[r.severity];
              return (
                <tr key={r.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2/50">
                  <td className="p-1"><input className="cell font-mono" value={r.code} onChange={(e) => update(r.id, {code: e.target.value})} /></td>
                  <td className="p-1">
                    <select
                      className="cell font-semibold"
                      value={r.severity}
                      onChange={(e) => update(r.id, {severity: e.target.value as ErrorSeverity})}
                      style={{color: sm.color}}
                    >
                      {(['critical','warning','info'] as ErrorSeverity[]).map((s) => (
                        <option key={s} value={s}>{SEVERITY_META[s].label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="p-1"><input className="cell" value={r.description} onChange={(e) => update(r.id, {description: e.target.value})} /></td>
                  <td className="p-1"><input className="cell" value={r.recovery} onChange={(e) => update(r.id, {recovery: e.target.value})} /></td>
                  <td className="p-1 text-center">
                    <button onClick={() => remove(r.id)} className="text-text-3 hover:text-red">
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== Anomalies ===================== */

function AnomaliesTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const add = () => {
    const row: DeviceAnomaly = {
      id: cryptoRandomId(),
      title: '',
      trigger: '',
      expected: '',
      actual: '',
      resolution: '',
      lastSeen: new Date().toISOString().slice(0, 10),
      severity: 'warning'
    };
    onUpdate({anomalies: [...device.anomalies, row]});
  };
  const update = (id: string, patch: Partial<DeviceAnomaly>) => {
    onUpdate({anomalies: device.anomalies.map((r) => (r.id === id ? {...r, ...patch} : r))});
  };
  const remove = (id: string) => onUpdate({anomalies: device.anomalies.filter((r) => r.id !== id)});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-navy">ანომალიების სია</h2>
          <p className="mt-0.5 text-[11.5px] text-text-3">
            არასტანდარტული / მოულოდნელი ქცევები, რომლებიც შენიშნულა ობიექტზე.
          </p>
        </div>
        <button onClick={add} className="btn-primary">
          <Plus size={13} /> ანომალია
        </button>
      </div>
      <div className="space-y-3">
        {device.anomalies.length === 0 && (
          <EmptyBlock>
            ცარიელია — როცა ობიექტზე შევიმჩნევთ უცნაურ ქცევას, აქ ჩაიწერება.
          </EmptyBlock>
        )}
        {device.anomalies.map((a) => {
          const sm = SEVERITY_META[a.severity];
          return (
            <div key={a.id} className="rounded-[10px] border border-bdr bg-sur p-3">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  className="input flex-1 font-semibold"
                  placeholder="სათაური — რა ანომალიაა"
                  value={a.title}
                  onChange={(e) => update(a.id, {title: e.target.value})}
                />
                <select
                  className="input w-32"
                  value={a.severity}
                  onChange={(e) => update(a.id, {severity: e.target.value as ErrorSeverity})}
                  style={{color: sm.color, fontWeight: 600}}
                >
                  {(['critical','warning','info'] as ErrorSeverity[]).map((s) => (
                    <option key={s} value={s}>{SEVERITY_META[s].label}</option>
                  ))}
                </select>
                <input
                  className="input w-36 font-mono text-[11px]"
                  value={a.lastSeen}
                  onChange={(e) => update(a.id, {lastSeen: e.target.value})}
                  placeholder="YYYY-MM-DD"
                />
                <button onClick={() => remove(a.id)} className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-3 hover:text-red">
                  <Trash2 size={13} />
                </button>
              </div>
              <div className="mt-2 grid gap-2 md:grid-cols-2">
                <Field label="ტრიგერი">
                  <textarea rows={2} className="input resize-y" value={a.trigger} onChange={(e) => update(a.id, {trigger: e.target.value})} />
                </Field>
                <Field label="გადაწყვეტა">
                  <textarea rows={2} className="input resize-y" value={a.resolution} onChange={(e) => update(a.id, {resolution: e.target.value})} />
                </Field>
                <Field label="მოსალოდნელი">
                  <textarea rows={2} className="input resize-y" value={a.expected} onChange={(e) => update(a.id, {expected: e.target.value})} />
                </Field>
                <Field label="ფაქტობრივი">
                  <textarea rows={2} className="input resize-y" value={a.actual} onChange={(e) => update(a.id, {actual: e.target.value})} />
                </Field>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ===================== Variables ===================== */

function VariablesTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const add = () => {
    const row: DeviceVariable = {
      id: cryptoRandomId(),
      key: '',
      plcAddress: '',
      label: '',
      kind: 'numeric',
      unit: '',
      scope: 'read',
      notes: ''
    };
    onUpdate({variables: [...device.variables, row]});
  };
  const update = (id: string, patch: Partial<DeviceVariable>) => {
    onUpdate({variables: device.variables.map((r) => (r.id === id ? {...r, ...patch} : r))});
  };
  const remove = (id: string) => onUpdate({variables: device.variables.filter((r) => r.id !== id)});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[14px] font-semibold text-navy">PLC ცვლადები</h2>
          <p className="mt-0.5 text-[11.5px] text-text-3">
            ~PLC მისამართები, რომლებიც ამ მოწყობილობის შიგნითაა გამოყენებული.
          </p>
        </div>
        <button onClick={add} className="btn-primary">
          <Plus size={13} /> ცვლადი
        </button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase text-text-3">
              <th className="w-32 px-3 py-2">Key</th>
              <th className="w-32 px-3 py-2">~PLC</th>
              <th className="px-3 py-2">Label</th>
              <th className="w-24 px-3 py-2">Kind</th>
              <th className="w-20 px-3 py-2">Unit</th>
              <th className="w-24 px-3 py-2">Scope</th>
              <th className="px-3 py-2">Notes</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {device.variables.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-[11.5px] text-text-3">
                  ცარიელია — დაამატე PLC ცვლადი.
                </td>
              </tr>
            )}
            {device.variables.map((v) => (
              <tr key={v.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2/50">
                <td className="p-1"><input className="cell font-mono" value={v.key} onChange={(e) => update(v.id, {key: e.target.value})} placeholder="T1" /></td>
                <td className="p-1"><input className="cell font-mono" value={v.plcAddress} onChange={(e) => update(v.id, {plcAddress: e.target.value})} placeholder="%MW100" /></td>
                <td className="p-1"><input className="cell" value={v.label} onChange={(e) => update(v.id, {label: e.target.value})} /></td>
                <td className="p-1">
                  <select className="cell" value={v.kind} onChange={(e) => update(v.id, {kind: e.target.value as VariableKind})}>
                    {(['analog','digital','numeric','string','enum'] as VariableKind[]).map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
                <td className="p-1"><input className="cell" value={v.unit ?? ''} onChange={(e) => update(v.id, {unit: e.target.value})} /></td>
                <td className="p-1">
                  <select className="cell" value={v.scope} onChange={(e) => update(v.id, {scope: e.target.value as VariableScope})}>
                    {(['read','write','read-write'] as VariableScope[]).map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
                <td className="p-1"><input className="cell" value={v.notes ?? ''} onChange={(e) => update(v.id, {notes: e.target.value})} /></td>
                <td className="p-1 text-center">
                  <button onClick={() => remove(v.id)} className="text-text-3 hover:text-red">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== Wiring ===================== */

function WiringTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const ref = useRef<HTMLInputElement>(null);
  const setImage = async (file: File) => {
    const dataUrl = await fileToDataUrl(file);
    onUpdate({wiringDiagramDataUrl: dataUrl});
  };
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-navy">მონტაჟის სქემა</h2>
        <div className="flex items-center gap-2">
          <button onClick={() => ref.current?.click()} className="btn-primary">
            <Upload size={13} /> {device.wiringDiagramDataUrl ? 'ჩანაცვლება' : 'ატვირთვა'}
          </button>
          {device.wiringDiagramDataUrl && (
            <button
              onClick={() => onUpdate({wiringDiagramDataUrl: ''})}
              className="inline-flex items-center gap-1.5 rounded-md border border-bdr bg-sur-2 px-3 py-1.5 text-[12px] font-semibold text-red hover:border-red"
            >
              <Trash2 size={13} /> წაშლა
            </button>
          )}
          <input
            ref={ref}
            type="file"
            accept="image/*,.pdf,.svg"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) setImage(f);
              e.target.value = '';
            }}
          />
        </div>
      </div>
      {device.wiringDiagramDataUrl ? (
        <div className="rounded-[10px] border border-bdr bg-sur p-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={device.wiringDiagramDataUrl}
            alt="wiring diagram"
            className="mx-auto max-h-[70vh] w-auto object-contain"
          />
        </div>
      ) : (
        <EmptyBlock>
          ატვირთე მონტაჟის სქემა (PNG / SVG / JPG). შემდეგ გამოჩნდება ამ ტაბში.
        </EmptyBlock>
      )}
    </div>
  );
}

/* ===================== Files / Download ===================== */

function FilesTab({device, onUpdate}: {device: Device; onUpdate: (p: Partial<Device>) => void}) {
  const add = () => {
    const row: DeviceFile = {id: cryptoRandomId(), label: '', url: '', kind: 'manual'};
    onUpdate({files: [...device.files, row]});
  };
  const update = (id: string, patch: Partial<DeviceFile>) => {
    onUpdate({files: device.files.map((r) => (r.id === id ? {...r, ...patch} : r))});
  };
  const remove = (id: string) => onUpdate({files: device.files.filter((r) => r.id !== id)});

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-navy">დოკუმენტაცია / Download</h2>
        <button onClick={add} className="btn-primary">
          <Plus size={13} /> ფაილი
        </button>
      </div>
      <div className="overflow-hidden rounded-[10px] border border-bdr bg-sur">
        <table className="w-full text-[12.5px]">
          <thead>
            <tr className="border-b border-bdr bg-sur-2 text-left font-mono text-[10px] uppercase text-text-3">
              <th className="w-40 px-3 py-2">Kind</th>
              <th className="px-3 py-2">Label</th>
              <th className="px-3 py-2">URL</th>
              <th className="w-10 px-2 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {device.files.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-[11.5px] text-text-3">
                  ცარიელია — დაამატე firmware, manual, datasheet…
                </td>
              </tr>
            )}
            {device.files.map((f) => (
              <tr key={f.id} className="border-b border-bdr last:border-b-0 hover:bg-sur-2/50">
                <td className="p-1">
                  <select className="cell" value={f.kind} onChange={(e) => update(f.id, {kind: e.target.value as DeviceFile['kind']})}>
                    {(['firmware','manual','drawing','datasheet','schematic','other'] as DeviceFile['kind'][]).map((x) => (
                      <option key={x}>{x}</option>
                    ))}
                  </select>
                </td>
                <td className="p-1"><input className="cell" value={f.label} onChange={(e) => update(f.id, {label: e.target.value})} /></td>
                <td className="p-1">
                  <input className="cell font-mono" value={f.url} onChange={(e) => update(f.id, {url: e.target.value})} placeholder="https://..." />
                </td>
                <td className="p-1 text-center">
                  <button onClick={() => remove(f.id)} className="text-text-3 hover:text-red">
                    <Trash2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ===================== shared helpers ===================== */

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[9.5px] font-bold uppercase tracking-[0.08em] text-text-3">
        {label}
      </span>
      {children}
    </label>
  );
}

function EmptyBlock({children}: {children: React.ReactNode}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[10px] border border-dashed border-bdr bg-sur px-6 py-12 text-center text-[12px] text-text-3">
      {children}
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
