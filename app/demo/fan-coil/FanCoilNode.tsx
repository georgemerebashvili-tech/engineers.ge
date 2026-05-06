'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';

export type FanCoilNodeData = {
  label: string;
};

function FanCoilNodeInner({ data, selected }: NodeProps) {
  const d = data as FanCoilNodeData;
  return (
    <div style={{ position: 'relative', width: 215, height: 170 }}>
      {/* supply port (top) */}
      <Handle
        type="target"
        position={Position.Top}
        id="supply"
        style={{ left: 43, top: 0, background: '#61c8f2', border: '2px solid #1f262d', width: 10, height: 10 }}
      />
      {/* return port (top) */}
      <Handle
        type="source"
        position={Position.Top}
        id="return"
        style={{ left: 83, top: 0, background: '#f6b51f', border: '2px solid #1f262d', width: 10, height: 10 }}
      />

      <svg
        viewBox="0 0 215 170"
        width="215"
        height="170"
        style={{ overflow: 'visible', display: 'block' }}
      >
        <defs>
          <linearGradient id={`ug-${d.label}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#c9c9c9" />
            <stop offset="100%" stopColor="#9b9b9b" />
          </linearGradient>
        </defs>

        {/* supply pipe */}
        <path d="M43 4 L43 74 L43 47 L49 47 L49 37 L116 37"
          fill="none" stroke="#61c8f2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {/* return pipe */}
        <path d="M83 4 L83 83 L83 72 L90 72 L90 69 L116 69"
          fill="none" stroke="#61c8f2" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

        {/* isolation valve on supply (square) */}
        <rect x="46" y="43" width="7" height="7" rx="1.5" fill="#f6b51f" />

        {/* butterfly valve on supply pipe */}
        <g transform="translate(43 88)">
          <path d="M-6-9L0 0L6-9Z" fill="#f6b51f" />
          <path d="M-6 9L0 0L6 9Z" fill="#f6b51f" />
          <rect x="-5" y="-1.5" width="10" height="3" rx="0.5" fill="#f6b51f" />
        </g>

        {/* butterfly valve on return pipe */}
        <g transform="translate(83 88)">
          <path d="M-6-9L0 0L6-9Z" fill="#f6b51f" />
          <path d="M-6 9L0 0L6 9Z" fill="#f6b51f" />
          <rect x="-5" y="-1.5" width="10" height="3" rx="0.5" fill="#f6b51f" />
        </g>

        {/* terminals at bottom of pipes */}
        <circle cx="43" cy="152" r="7" fill="#05090c" stroke="#72c7ff" strokeWidth="3" />
        <circle cx="83" cy="152" r="7" fill="#05090c" stroke="#72c7ff" strokeWidth="3" />

        {/* pipe continuation to terminals */}
        <line x1="43" y1="97" x2="43" y2="145" stroke="#61c8f2" strokeWidth="3" />
        <line x1="83" y1="97" x2="83" y2="145" stroke="#61c8f2" strokeWidth="3" />

        {/* unit body */}
        <rect x="116" y="26" width="85" height="107" fill={`url(#ug-${d.label})`} stroke="rgba(255,255,255,.08)" />
        {/* top header area */}
        <rect x="116" y="26" width="85" height="26" fill="rgba(255,255,255,.12)" />
        {/* dashed dividers */}
        <line x1="116" y1="52" x2="201" y2="52" stroke="#818890" strokeWidth="0.8" strokeDasharray="6 5" opacity=".35" />
        <line x1="116" y1="81" x2="201" y2="81" stroke="#818890" strokeWidth="0.8" strokeDasharray="6 5" opacity=".35" />

        {/* fan housings */}
        <rect x="123" y="14" width="26" height="12" fill="#ddd" stroke="rgba(255,255,255,.18)" />
        <rect x="159" y="14" width="26" height="12" fill="#ddd" stroke="rgba(255,255,255,.18)" />
        {/* fan arrows */}
        <polygon points="136,0 141,12 131,12" fill="#838990" opacity=".85" />
        <polygon points="172,0 177,12 167,12" fill="#838990" opacity=".85" />

        {/* coil / heat exchanger section */}
        <rect x="116" y="58" width="88" height="24" fill="#f6b51f" />
        <line x1="120" y1="65.5" x2="197" y2="65.5" stroke="#25333a" strokeWidth="2.5" strokeDasharray="8 5" opacity=".9" />
        <line x1="120" y1="74.5" x2="197" y2="74.5" stroke="#25333a" strokeWidth="2.5" strokeDasharray="8 5" opacity=".9" />
        <line x1="199" y1="62" x2="199" y2="78" stroke="#25333a" strokeWidth="2" opacity=".9" />

        {/* control strip */}
        <rect x="121" y="133" width="77" height="8" fill="#4f98ff" />

        {/* selection ring */}
        {selected && (
          <rect x="113" y="23" width="91" height="116" rx="4"
            fill="none" stroke="#72c7ff" strokeWidth="1.5" opacity=".7" />
        )}

        {/* label */}
        <text x="158" y="160" textAnchor="middle" fontSize="10" fill="#a0b4c8" fontFamily="Inter, Arial, sans-serif">
          {d.label}
        </text>
      </svg>
    </div>
  );
}

export const FanCoilNode = memo(FanCoilNodeInner);
