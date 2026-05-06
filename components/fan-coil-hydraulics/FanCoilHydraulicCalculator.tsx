'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ComponentType,
} from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  Handle,
  Position,
  MarkerType,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type NodeProps,
  type OnSelectionChangeParams,
} from '@xyflow/react';

import { runCalculation } from '@/lib/fan-coil-hydraulics/hydraulic-calculations';
import {
  DEFAULT_FITTINGS,
  getPipeLibrary,
  getDefaultInnerDiameter,
} from '@/lib/fan-coil-hydraulics/pipe-library';
import type {
  SystemType,
  CircuitType,
  PipeMaterial,
  HydraulicNodeType,
  HydraulicNodeData,
  HydraulicEdgeData,
  FanCoilData,
  PipeData,
  FittingData,
  GraphNode,
  CalculationResult,
  FCUFlowResult,
  PipeFlowResult,
} from '@/lib/fan-coil-hydraulics/hydraulic-types';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CIRCUIT_COLORS: Record<CircuitType, string> = {
  COMMON_SUPPLY: '#1565C0',
  COMMON_RETURN: '#C62828',
  CHW_SUPPLY:    '#0277BD',
  CHW_RETURN:    '#00838F',
  HHW_SUPPLY:    '#BF360C',
  HHW_RETURN:    '#F57F17',
};

const VALID_CIRCUITS: Record<SystemType, CircuitType[]> = {
  TWO_PIPE:  ['COMMON_SUPPLY', 'COMMON_RETURN'],
  FOUR_PIPE: ['CHW_SUPPLY', 'CHW_RETURN', 'HHW_SUPPLY', 'HHW_RETURN'],
};

const NODE_CONFIGS: Record<
  HydraulicNodeType,
  { emoji: string; shortLabel: string; bg: string }
> = {
  CHILLER:          { emoji: '🧊', shortLabel: 'Chiller',   bg: 'bg-blue-50'   },
  HOT_WATER_SOURCE: { emoji: '🔥', shortLabel: 'HWS',       bg: 'bg-orange-50' },
  PUMP:             { emoji: '⚙',  shortLabel: 'Pump',      bg: 'bg-green-50'  },
  HEADER:           { emoji: '━',  shortLabel: 'Header',    bg: 'bg-gray-100'  },
  TEE:              { emoji: '┳',  shortLabel: 'Tee',       bg: 'bg-gray-100'  },
  FAN_COIL:         { emoji: '❄',  shortLabel: 'Fan Coil',  bg: 'bg-sky-50'    },
};

const NODE_ORDER: HydraulicNodeType[] = [
  'CHILLER', 'HOT_WATER_SOURCE', 'PUMP', 'HEADER', 'TEE', 'FAN_COIL',
];

// ─── Context ──────────────────────────────────────────────────────────────────

const CalcContext = createContext<CalculationResult | null>(null);

// ─── Shared form primitives ───────────────────────────────────────────────────

function NumInput({
  label, value, onChange, unit, min = 0, step = 0.1,
}: {
  label: string; value: number; onChange: (v: number) => void;
  unit?: string; min?: number; step?: number;
}) {
  return (
    <label className="flex items-center justify-between gap-1 text-[11px]">
      <span className="text-gray-500 leading-tight">{label}</span>
      <div className="flex items-center gap-1 flex-shrink-0">
        <input
          type="number"
          className="w-[72px] border border-gray-300 rounded px-1 py-0.5 text-right text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
          value={value}
          min={min}
          step={step}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
        />
        {unit && <span className="text-gray-400 w-6 text-[10px]">{unit}</span>}
      </div>
    </label>
  );
}

function TxtInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center justify-between gap-1 text-[11px]">
      <span className="text-gray-500">{label}</span>
      <input
        type="text"
        className="w-[100px] border border-gray-300 rounded px-1 py-0.5 text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

// ─── Custom Node Renderer ─────────────────────────────────────────────────────

function HydraulicNodeRenderer({ id, data, selected }: NodeProps<Node<HydraulicNodeData>>) {
  const result = useContext(CalcContext);
  const cfg = NODE_CONFIGS[data.nodeType];

  const fcuResult = data.nodeType === 'FAN_COIL'
    ? result?.fcuResults.find((r) => r.nodeId === id)
    : undefined;

  const isCritical =
    fcuResult?.isCriticalPath || fcuResult?.isCriticalCHW || fcuResult?.isCriticalHHW;

  return (
    <div
      className={[
        'relative rounded-lg border-2 min-w-[100px] text-center px-3 py-2 cursor-default select-none',
        cfg.bg,
        selected ? 'border-blue-600 shadow-md' : 'border-gray-300',
        isCritical ? 'ring-2 ring-red-500' : '',
      ].join(' ')}
    >
      <Handle type="target" position={Position.Left}  className="!w-3 !h-3 !bg-gray-400 !border-white" />
      <Handle type="source" position={Position.Right} className="!w-3 !h-3 !bg-gray-400 !border-white" />
      <div className="text-base leading-none mb-1">{cfg.emoji}</div>
      <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{data.nodeType.replace('_', ' ')}</div>
      <div className="text-xs font-semibold text-gray-800 mt-0.5">{data.label}</div>
      {fcuResult && (
        <div className="text-[10px] text-blue-700 mt-0.5 font-mono">
          {result?.systemType === 'TWO_PIPE'
            ? `${fcuResult.designFlowM3h.toFixed(3)} m³/h`
            : `CHW ${fcuResult.chilledWaterFlowM3h.toFixed(3)}`}
        </div>
      )}
    </div>
  );
}

// nodeTypes MUST be defined outside the component to avoid React Flow re-registration
const nodeTypes: Record<string, ComponentType<NodeProps<Node<HydraulicNodeData>>>> = {
  CHILLER:          HydraulicNodeRenderer,
  HOT_WATER_SOURCE: HydraulicNodeRenderer,
  PUMP:             HydraulicNodeRenderer,
  HEADER:           HydraulicNodeRenderer,
  TEE:              HydraulicNodeRenderer,
  FAN_COIL:         HydraulicNodeRenderer,
};

// ─── Default data factories ───────────────────────────────────────────────────

function defaultFCU(n: number): FanCoilData {
  return {
    tag: `FC-${String(n).padStart(2, '0')}`,
    coolingCapacityKw: 3.5,
    heatingCapacityKw: 3.5,
    chwSupplyTempC: 7,
    chwReturnTempC: 12,
    hhwSupplyTempC: 50,
    hhwReturnTempC: 40,
    coolingCoilPressureDropKpa: 20,
    heatingCoilPressureDropKpa: 20,
    valvePressureDropKpa: 15,
    accessoryPressureDropKpa: 5,
  };
}

function defaultPipe(n: number, circuit: CircuitType): PipeData {
  return {
    tag: `P-${String(n).padStart(2, '0')}`,
    circuitType: circuit,
    material: 'STEEL',
    dn: 'DN25',
    innerDiameterMm: 27,
    lengthM: 10,
    fittings: [],
  };
}

function nodeLabel(nodeType: HydraulicNodeType, n: number): string {
  const prefixes: Record<HydraulicNodeType, string> = {
    CHILLER: 'CH', HOT_WATER_SOURCE: 'HWS', PUMP: 'PMP',
    HEADER: 'HDR', TEE: 'TEE', FAN_COIL: 'FC',
  };
  return `${prefixes[nodeType]}-${String(n).padStart(2, '0')}`;
}

// ─── Properties panels ────────────────────────────────────────────────────────

function NodePropertiesForm({
  node, onUpdateFCU, onUpdateLabel,
}: {
  node: Node<HydraulicNodeData>;
  onUpdateFCU: (id: string, patch: Partial<FanCoilData>) => void;
  onUpdateLabel: (id: string, label: string) => void;
}) {
  const { id, data } = node;

  if (data.nodeType !== 'FAN_COIL') {
    return <TxtInput label="Label" value={data.label} onChange={(v) => onUpdateLabel(id, v)} />;
  }

  const fcu = data.fcu!;
  const upd = (patch: Partial<FanCoilData>) => onUpdateFCU(id, patch);

  return (
    <div className="space-y-1.5">
      <TxtInput label="Tag" value={fcu.tag} onChange={(v) => upd({ tag: v })} />

      <p className="text-[10px] font-bold text-blue-600 pt-1 uppercase">🧊 CHW Circuit</p>
      <NumInput label="Cooling cap." value={fcu.coolingCapacityKw} onChange={(v) => upd({ coolingCapacityKw: v })} unit="kW" />
      <NumInput label="CHW supply T" value={fcu.chwSupplyTempC}    onChange={(v) => upd({ chwSupplyTempC: v })}    unit="°C" step={0.5} />
      <NumInput label="CHW return T" value={fcu.chwReturnTempC}    onChange={(v) => upd({ chwReturnTempC: v })}    unit="°C" step={0.5} />
      <NumInput label="Cooling coil ΔP" value={fcu.coolingCoilPressureDropKpa} onChange={(v) => upd({ coolingCoilPressureDropKpa: v })} unit="kPa" />

      <p className="text-[10px] font-bold text-red-600 pt-1 uppercase">🔥 HHW Circuit</p>
      <NumInput label="Heating cap." value={fcu.heatingCapacityKw} onChange={(v) => upd({ heatingCapacityKw: v })} unit="kW" />
      <NumInput label="HHW supply T" value={fcu.hhwSupplyTempC}    onChange={(v) => upd({ hhwSupplyTempC: v })}    unit="°C" step={0.5} />
      <NumInput label="HHW return T" value={fcu.hhwReturnTempC}    onChange={(v) => upd({ hhwReturnTempC: v })}    unit="°C" step={0.5} />
      <NumInput label="Heating coil ΔP" value={fcu.heatingCoilPressureDropKpa} onChange={(v) => upd({ heatingCoilPressureDropKpa: v })} unit="kPa" />

      <p className="text-[10px] font-bold text-gray-500 pt-1 uppercase">⚙ Common</p>
      <NumInput label="Valve ΔP"     value={fcu.valvePressureDropKpa}     onChange={(v) => upd({ valvePressureDropKpa: v })}     unit="kPa" />
      <NumInput label="Accessory ΔP" value={fcu.accessoryPressureDropKpa} onChange={(v) => upd({ accessoryPressureDropKpa: v })} unit="kPa" />
    </div>
  );
}

function EdgePropertiesForm({
  edge, systemType, onUpdate,
}: {
  edge: Edge<HydraulicEdgeData>;
  systemType: SystemType;
  onUpdate: (id: string, pipe: PipeData) => void;
}) {
  const pipe: PipeData = edge.data?.pipe ?? defaultPipe(0, VALID_CIRCUITS[systemType][0]);
  const upd = (patch: Partial<PipeData>) => onUpdate(edge.id, { ...pipe, ...patch });
  const pipeLib = getPipeLibrary(pipe.material);

  return (
    <div className="space-y-1.5">
      <TxtInput label="Tag" value={pipe.tag} onChange={(v) => upd({ tag: v })} />

      {/* Circuit type */}
      <label className="flex items-center justify-between text-[11px]">
        <span className="text-gray-500">Circuit type</span>
        <select
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5 font-semibold"
          value={pipe.circuitType}
          style={{ color: CIRCUIT_COLORS[pipe.circuitType] }}
          onChange={(e) => upd({ circuitType: e.target.value as CircuitType })}
        >
          {VALID_CIRCUITS[systemType].map((ct) => (
            <option key={ct} value={ct} style={{ color: CIRCUIT_COLORS[ct] }}>{ct}</option>
          ))}
        </select>
      </label>

      {/* Material */}
      <label className="flex items-center justify-between text-[11px]">
        <span className="text-gray-500">Material</span>
        <select
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5"
          value={pipe.material}
          onChange={(e) => {
            const mat = e.target.value as PipeMaterial;
            const lib = getPipeLibrary(mat);
            upd({ material: mat, dn: lib[0].dn, innerDiameterMm: lib[0].innerDiameterMm });
          }}
        >
          <option value="STEEL">STEEL</option>
          <option value="PLASTIC">PLASTIC</option>
        </select>
      </label>

      {/* DN */}
      <label className="flex items-center justify-between text-[11px]">
        <span className="text-gray-500">DN</span>
        <select
          className="text-[11px] border border-gray-300 rounded px-1 py-0.5"
          value={pipe.dn}
          onChange={(e) => {
            const dn = e.target.value;
            const d = getDefaultInnerDiameter(pipe.material, dn);
            upd({ dn, innerDiameterMm: d ?? pipe.innerDiameterMm });
          }}
        >
          {pipeLib.map((s) => (
            <option key={s.dn} value={s.dn}>{s.dn} (d={s.innerDiameterMm}mm)</option>
          ))}
        </select>
      </label>

      <NumInput label="Inner d" value={pipe.innerDiameterMm} onChange={(v) => upd({ innerDiameterMm: v })} unit="mm" min={1} step={1} />
      <NumInput label="Length"  value={pipe.lengthM}         onChange={(v) => upd({ lengthM: v })}         unit="m"  min={0.1} />

      {/* Fittings */}
      <div className="pt-1">
        <p className="text-[10px] font-bold text-gray-500 uppercase mb-1">Fittings (ζ)</p>
        {pipe.fittings.length === 0 && (
          <p className="text-[10px] text-gray-400 italic">No fittings</p>
        )}
        {pipe.fittings.map((ft) => (
          <div key={ft.id} className="flex items-center gap-1 text-[11px] mb-0.5">
            <span className="flex-1 truncate text-gray-600">{ft.name} ζ={ft.zeta}</span>
            <input
              type="number" min={1}
              className="w-10 border border-gray-200 rounded text-center text-[11px] px-0.5"
              value={ft.count}
              onChange={(e) => {
                const count = parseInt(e.target.value) || 1;
                upd({ fittings: pipe.fittings.map((f) => f.id === ft.id ? { ...f, count } : f) });
              }}
            />
            <button
              onClick={() => upd({ fittings: pipe.fittings.filter((f) => f.id !== ft.id) })}
              className="text-red-400 hover:text-red-600 px-1 text-sm font-bold leading-none"
            >×</button>
          </div>
        ))}
        <select
          className="mt-1 text-[11px] border border-gray-300 rounded px-1 py-0.5 w-full"
          value=""
          onChange={(e) => {
            if (!e.target.value) return;
            const def = DEFAULT_FITTINGS.find((f) => f.name === e.target.value);
            if (!def) return;
            const newFit: FittingData = {
              id: `fit-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
              name: def.name, zeta: def.zeta, count: 1,
            };
            upd({ fittings: [...pipe.fittings, newFit] });
          }}
        >
          <option value="">+ Add fitting…</option>
          {DEFAULT_FITTINGS.map((f) => (
            <option key={f.name} value={f.name}>{f.name} (ζ={f.zeta})</option>
          ))}
        </select>
      </div>
    </div>
  );
}

function PropertiesPanel({
  node, edge, systemType, onUpdateFCU, onUpdateLabel, onUpdateEdge,
}: {
  node: Node<HydraulicNodeData> | null;
  edge: Edge<HydraulicEdgeData> | null;
  systemType: SystemType;
  onUpdateFCU: (id: string, patch: Partial<FanCoilData>) => void;
  onUpdateLabel: (id: string, label: string) => void;
  onUpdateEdge: (id: string, pipe: PipeData) => void;
}) {
  if (!node && !edge) return null;
  const title = node
    ? `${node.data.nodeType.replace('_', ' ')} — ${node.data.label}`
    : `PIPE — ${edge?.data?.pipe.tag ?? ''}`;

  return (
    <div className="w-64 border-l border-gray-200 bg-white flex flex-col overflow-hidden flex-shrink-0">
      <div className="px-3 py-2 bg-gray-50 border-b text-[10px] font-bold text-gray-500 uppercase tracking-wide truncate">
        {title}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {node && (
          <NodePropertiesForm
            node={node}
            onUpdateFCU={onUpdateFCU}
            onUpdateLabel={onUpdateLabel}
          />
        )}
        {edge && (
          <EdgePropertiesForm
            edge={edge}
            systemType={systemType}
            onUpdate={onUpdateEdge}
          />
        )}
      </div>
    </div>
  );
}

// ─── Results section ──────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-2 py-1 bg-gray-50 border border-gray-200 text-[10px] font-semibold text-gray-600 text-center whitespace-nowrap">
      {children}
    </th>
  );
}
function Td({ children, cls }: { children: React.ReactNode; cls?: string }) {
  return (
    <td className={`px-2 py-1 border border-gray-100 text-[11px] text-center whitespace-nowrap ${cls ?? ''}`}>
      {children}
    </td>
  );
}
function TdL({ children }: { children: React.ReactNode }) {
  return <td className="px-2 py-1 border border-gray-100 text-[11px] text-left whitespace-nowrap font-semibold">{children}</td>;
}

function FCUTable({ result }: { result: CalculationResult }) {
  const is4 = result.systemType === 'FOUR_PIPE';
  return (
    <table className="w-max border-collapse">
      <thead>
        <tr>
          <Th>FCU</Th>
          <Th>Q cool (m³/h)</Th>
          <Th>Q heat (m³/h)</Th>
          {is4 ? <><Th>CHW flow (m³/h)</Th><Th>HHW flow (m³/h)</Th></> : <Th>Q design (m³/h)</Th>}
          {is4 ? (
            <><Th>CHW path (kPa)</Th><Th>HHW path (kPa)</Th></>
          ) : (
            <><Th>Supply ΔP (kPa)</Th><Th>FCU int. (kPa)</Th><Th>Return ΔP (kPa)</Th></>
          )}
          <Th>Total (kPa)</Th>
          <Th>Critical</Th>
        </tr>
      </thead>
      <tbody>
        {result.fcuResults.map((r: FCUFlowResult) => {
          const critical = r.isCriticalPath || r.isCriticalCHW || r.isCriticalHHW;
          return (
            <tr key={r.nodeId} className={critical ? 'bg-red-50' : ''}>
              <TdL>{r.tag}</TdL>
              <Td>{r.coolingFlowM3h.toFixed(4)}</Td>
              <Td>{r.heatingFlowM3h.toFixed(4)}</Td>
              {is4 ? (
                <><Td>{r.chilledWaterFlowM3h.toFixed(4)}</Td><Td>{r.hotWaterFlowM3h.toFixed(4)}</Td></>
              ) : (
                <Td cls="font-semibold">{r.designFlowM3h.toFixed(4)}</Td>
              )}
              {is4 ? (
                <><Td>{r.chwPathKpa.toFixed(2)}</Td><Td>{r.hhwPathKpa.toFixed(2)}</Td></>
              ) : (
                <><Td>{r.supplyPathKpa.toFixed(2)}</Td><Td>{r.internalKpa.toFixed(2)}</Td><Td>{r.returnPathKpa.toFixed(2)}</Td></>
              )}
              <Td cls="font-bold">{r.totalPathKpa.toFixed(2)}</Td>
              <Td>{critical ? '🔴 CRITICAL' : ''}</Td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

function PipeTable({ result }: { result: CalculationResult }) {
  return (
    <table className="w-max border-collapse">
      <thead>
        <tr>
          <Th>Pipe</Th><Th>Circuit</Th><Th>DN</Th><Th>L (m)</Th>
          <Th>Q (m³/h)</Th><Th>v (m/s)</Th>
          <Th>ΔP pipe (kPa)</Th><Th>ΔP fit. (kPa)</Th><Th>ΔP tot. (kPa)</Th>
          <Th>ΔP/m (Pa/m)</Th><Th>FCUs</Th>
        </tr>
      </thead>
      <tbody>
        {result.pipeResults.map((r: PipeFlowResult) => (
          <tr key={r.edgeId}>
            <TdL>{r.tag}</TdL>
            <Td cls="font-semibold" ><span style={{ color: CIRCUIT_COLORS[r.circuitType] }}>{r.circuitType}</span></Td>
            <Td>{r.dn}</Td>
            <Td>{r.lengthM.toFixed(1)}</Td>
            <Td cls="font-semibold">{r.flowM3h.toFixed(4)}</Td>
            <Td cls={r.velocityMs < 0.3 || r.velocityMs > 1.8 ? 'text-amber-700 font-semibold' : ''}>
              {r.velocityMs.toFixed(3)}
            </Td>
            <Td>{r.pipePressureDropKpa.toFixed(3)}</Td>
            <Td>{r.fittingPressureDropKpa.toFixed(3)}</Td>
            <Td cls="font-bold">{r.totalPressureDropKpa.toFixed(3)}</Td>
            <Td cls={r.pressureDropPerMeterPaM > 300 ? 'text-amber-700' : ''}>{r.pressureDropPerMeterPaM.toFixed(1)}</Td>
            <Td>{r.servedFCUIds.length}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PumpTable({ result }: { result: CalculationResult }) {
  return (
    <table className="w-max border-collapse">
      <thead>
        <tr>
          <Th>Pump</Th><Th>Circuit</Th><Th>Q (m³/h)</Th>
          <Th>ΔP (kPa)</Th><Th>H (m)</Th><Th>H +10% (m)</Th>
        </tr>
      </thead>
      <tbody>
        {result.pumpResults.map((r, i) => (
          <tr key={i}>
            <TdL>{r.label}</TdL>
            <Td>{r.circuitType}</Td>
            <Td cls="font-bold">{r.flowM3h.toFixed(4)}</Td>
            <Td>{r.pressureKpa.toFixed(2)}</Td>
            <Td>{r.headM.toFixed(2)}</Td>
            <Td cls="font-bold text-blue-700">{r.headWithSafetyM.toFixed(2)}</Td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function ResultsSection({
  result, activeTab, onTabChange,
}: {
  result: CalculationResult;
  activeTab: string;
  onTabChange: (t: string) => void;
}) {
  const errCount  = result.validationMessages.filter((m) => m.severity === 'error').length;
  const warnCount = result.validationMessages.filter((m) => m.severity === 'warning').length;
  const tabs = [
    { id: 'fcu',  label: `FCU (${result.fcuResults.length})`  },
    { id: 'pipe', label: `Pipe (${result.pipeResults.length})` },
    { id: 'pump', label: `Pump (${result.pumpResults.length})` },
    { id: 'msgs', label: `Messages (${errCount + warnCount})`, hasErr: errCount > 0 },
  ];

  return (
    <div className="border-t border-gray-200 bg-white flex flex-col flex-shrink-0" style={{ height: 260 }}>
      <div className="flex gap-px px-2 pt-1.5 border-b border-gray-200 flex-shrink-0">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={[
              'px-3 py-0.5 text-[11px] rounded-t border border-b-0 transition-colors',
              activeTab === t.id ? 'bg-white border-gray-300 font-semibold' : 'bg-gray-50 border-transparent text-gray-500 hover:bg-gray-100',
              t.hasErr ? 'text-red-600' : '',
            ].join(' ')}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-auto p-2">
        {activeTab === 'fcu'  && <FCUTable  result={result} />}
        {activeTab === 'pipe' && <PipeTable result={result} />}
        {activeTab === 'pump' && <PumpTable result={result} />}
        {activeTab === 'msgs' && (
          <div className="space-y-1">
            {result.validationMessages.length === 0 && (
              <p className="text-[11px] text-green-700 font-semibold">✓ ვალიდაციის შეცდომები არ არის</p>
            )}
            {result.validationMessages.map((m, i) => (
              <div
                key={i}
                className={`flex gap-2 text-[11px] px-2 py-1 rounded ${
                  m.severity === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                }`}
              >
                <span className="flex-shrink-0">{m.severity === 'error' ? '⛔' : '⚠'}</span>
                <span>{m.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function FanCoilHydraulicCalculator() {
  const [systemType, setSystemType] = useState<SystemType>('TWO_PIPE');
  const [nodes, setNodes, onNodesChange] = useNodesState<Node<HydraulicNodeData>>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge<HydraulicEdgeData>>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [activeTab, setActiveTab] = useState('fcu');
  const nodeCounter = useRef(0);
  const edgeCounter = useRef(0);

  const selectedNode = nodes.find((n) => n.id === selectedNodeId) ?? null;
  const selectedEdge = edges.find((e) => e.id === selectedEdgeId) ?? null;

  // ── Handlers ──────────────────────────────────────────────────────────────

  const addNode = useCallback((nodeType: HydraulicNodeType) => {
    nodeCounter.current += 1;
    const n = nodeCounter.current;
    const id = `n${n}`;
    const label = nodeLabel(nodeType, n);
    const position = {
      x: 60 + ((n - 1) % 6) * 190,
      y: 80 + Math.floor((n - 1) / 6) * 130,
    };
    setNodes((prev) => [
      ...prev,
      {
        id,
        type: nodeType,
        position,
        data: {
          nodeType,
          label,
          fcu: nodeType === 'FAN_COIL' ? defaultFCU(n) : undefined,
        },
      },
    ]);
  }, [setNodes]);

  const onConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target) return;
    edgeCounter.current += 1;
    const ec = edgeCounter.current;
    const circuit: CircuitType = VALID_CIRCUITS[systemType][0];
    const color = CIRCUIT_COLORS[circuit];
    const pipe = defaultPipe(ec, circuit);

    const newEdge: Edge<HydraulicEdgeData> = {
      id: `e${ec}`,
      source: params.source,
      target: params.target,
      sourceHandle: params.sourceHandle ?? undefined,
      targetHandle: params.targetHandle ?? undefined,
      data: { pipe },
      style: { stroke: color, strokeWidth: 2.5 },
      markerEnd: { type: MarkerType.ArrowClosed, color },
      label: `${pipe.tag} | ${pipe.dn}`,
      labelStyle: { fontSize: 10, fill: '#555' },
      labelBgStyle: { fill: '#fff', opacity: 0.85 },
      labelBgPadding: [4, 2] as [number, number],
    };
    setEdges((prev) => addEdge(newEdge, prev));
  }, [systemType, setEdges]);

  const onSelectionChange = useCallback(({ nodes: sn, edges: se }: OnSelectionChangeParams) => {
    setSelectedNodeId(sn[0]?.id ?? null);
    setSelectedEdgeId(se[0]?.id ?? null);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
  }, []);

  const handleCalculate = useCallback(() => {
    const graphNodes: GraphNode[] = nodes.map((n) => ({ id: n.id, data: n.data }));
    const graphEdges = edges
      .filter((e) => !!e.data)
      .map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        data: { pipe: e.data!.pipe },
      }));
    const calc = runCalculation(systemType, graphNodes, graphEdges);
    setResult(calc);
    setActiveTab(calc.validationMessages.some((m) => m.severity === 'error') ? 'msgs' : 'fcu');

    // Update edge labels with flow
    setEdges((prev) =>
      prev.map((e) => {
        const pr = calc.pipeResults.find((r) => r.edgeId === e.id);
        if (!pr || !e.data) return e;
        const color = CIRCUIT_COLORS[e.data.pipe.circuitType];
        return {
          ...e,
          label: `${e.data.pipe.tag} ${e.data.pipe.dn} | ${pr.flowM3h.toFixed(3)} m³/h`,
          style: { stroke: color, strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
        };
      })
    );
  }, [nodes, edges, systemType, setEdges]);

  const handleClear = useCallback(() => {
    setNodes([]);
    setEdges([]);
    setResult(null);
    setSelectedNodeId(null);
    setSelectedEdgeId(null);
    nodeCounter.current = 0;
    edgeCounter.current = 0;
  }, [setNodes, setEdges]);

  const updateFCU = useCallback((nodeId: string, patch: Partial<FanCoilData>) => {
    setNodes((prev) =>
      prev.map((n) => {
        if (n.id !== nodeId || !n.data.fcu) return n;
        const newFCU = { ...n.data.fcu, ...patch };
        return { ...n, data: { ...n.data, fcu: newFCU, label: newFCU.tag } };
      })
    );
  }, [setNodes]);

  const updateLabel = useCallback((nodeId: string, label: string) => {
    setNodes((prev) =>
      prev.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, label } } : n))
    );
  }, [setNodes]);

  const updateEdge = useCallback((edgeId: string, pipe: PipeData) => {
    const color = CIRCUIT_COLORS[pipe.circuitType];
    setEdges((prev) =>
      prev.map((e) => {
        if (e.id !== edgeId) return e;
        return {
          ...e,
          data: { pipe },
          style: { stroke: color, strokeWidth: 2.5 },
          markerEnd: { type: MarkerType.ArrowClosed, color },
          label: `${pipe.tag} | ${pipe.dn}`,
        };
      })
    );
  }, [setEdges]);

  const errCount = result?.validationMessages.filter((m) => m.severity === 'error').length ?? 0;
  const warnCount = result?.validationMessages.filter((m) => m.severity === 'warning').length ?? 0;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <CalcContext.Provider value={result}>
      <div className="flex flex-col" style={{ height: 'calc(100vh - 56px)' }}>

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-1.5 px-3 py-2 bg-white border-b border-gray-200 flex-shrink-0 flex-wrap">
          {/* System type */}
          <div className="flex border border-gray-300 rounded overflow-hidden text-[11px]">
            {(['TWO_PIPE', 'FOUR_PIPE'] as SystemType[]).map((st) => (
              <button
                key={st}
                onClick={() => { setSystemType(st); setResult(null); }}
                className={`px-3 py-1 font-semibold transition-colors ${
                  systemType === st ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {st === 'TWO_PIPE' ? '2-PIPE' : '4-PIPE'}
              </button>
            ))}
          </div>

          <span className="w-px h-5 bg-gray-200" />

          {/* Add node buttons */}
          {NODE_ORDER.map((nt) => (
            <button
              key={nt}
              onClick={() => addNode(nt)}
              title={`Add ${nt}`}
              className="flex items-center gap-1 px-2 py-1 text-[11px] border border-gray-300 rounded hover:bg-gray-50 transition-colors"
            >
              <span>{NODE_CONFIGS[nt].emoji}</span>
              <span className="hidden sm:inline">{NODE_CONFIGS[nt].shortLabel}</span>
            </button>
          ))}

          <span className="w-px h-5 bg-gray-200" />

          <button
            onClick={handleCalculate}
            disabled={nodes.length === 0}
            className="flex items-center gap-1 px-3 py-1 text-[11px] bg-blue-600 text-white rounded font-semibold hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            ▶ Calculate
          </button>

          <button
            onClick={handleClear}
            className="px-2 py-1 text-[11px] border border-red-300 text-red-600 rounded hover:bg-red-50 transition-colors"
          >
            Clear
          </button>

          {/* Status badges */}
          {result && (
            <div className="ml-auto flex items-center gap-2 text-[11px]">
              {errCount > 0 && (
                <span
                  className="cursor-pointer text-red-600 font-semibold"
                  onClick={() => setActiveTab('msgs')}
                >
                  ⛔ {errCount} error{errCount > 1 ? 's' : ''}
                </span>
              )}
              {warnCount > 0 && (
                <span
                  className="cursor-pointer text-amber-600"
                  onClick={() => setActiveTab('msgs')}
                >
                  ⚠ {warnCount} warning{warnCount > 1 ? 's' : ''}
                </span>
              )}
              {errCount === 0 && warnCount === 0 && (
                <span className="text-green-700 font-semibold">✓ OK</span>
              )}
            </div>
          )}
        </div>

        {/* ── Main area ── */}
        <div className="flex flex-1 overflow-hidden">
          {/* Canvas */}
          <div className="relative flex-1">
            <ReactFlow
              nodes={nodes}
              edges={edges}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onSelectionChange={onSelectionChange}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes as unknown as Record<string, ComponentType<NodeProps>>}
              deleteKeyCode={['Backspace', 'Delete']}
              defaultViewport={{ x: 40, y: 40, zoom: 0.9 }}
              minZoom={0.2}
              maxZoom={2}
            >
              <Background color="#e5e7eb" gap={20} />
              <Controls />
              <MiniMap
                nodeColor={(n) => {
                  const nt = (n.data as unknown as HydraulicNodeData)?.nodeType;
                  return nt === 'FAN_COIL' ? '#bae6fd'
                    : nt === 'PUMP' ? '#bbf7d0'
                    : nt === 'CHILLER' ? '#bfdbfe'
                    : '#e5e7eb';
                }}
                maskColor="rgba(0,0,0,0.05)"
              />
            </ReactFlow>
          </div>

          {/* Properties panel */}
          <PropertiesPanel
            node={selectedNode}
            edge={selectedEdge}
            systemType={systemType}
            onUpdateFCU={updateFCU}
            onUpdateLabel={updateLabel}
            onUpdateEdge={updateEdge}
          />
        </div>

        {/* ── Results ── */}
        {result && (
          <ResultsSection
            result={result}
            activeTab={activeTab}
            onTabChange={setActiveTab}
          />
        )}
      </div>
    </CalcContext.Provider>
  );
}
