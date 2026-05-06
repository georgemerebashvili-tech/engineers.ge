'use client';

import { useCallback, useRef, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { FanCoilNode, type FanCoilNodeData } from './FanCoilNode';

const nodeTypes: NodeTypes = {
  fcu: FanCoilNode as unknown as NodeTypes['fcu'],
};

let counter = 0;

function makeNode(x: number, y: number): Node<FanCoilNodeData> {
  counter += 1;
  return {
    id: `fcu-${counter}`,
    type: 'fcu',
    position: { x, y },
    data: { label: `FCU-${String(counter).padStart(2, '0')}` },
  };
}

const initialNodes: Node<FanCoilNodeData>[] = [makeNode(160, 120)];
const initialEdges: Edge[] = [];

export default function FanCoilCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (connection: Connection) => setEdges((eds) => addEdge({ ...connection, style: { stroke: '#61c8f2', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  const addNode = useCallback(() => {
    const offset = counter * 22;
    setNodes((nds) => [...nds, makeNode(160 + offset, 120 + offset % 200)]);
  }, [setNodes]);

  const deleteSelected = useCallback(() => {
    setNodes((nds) => nds.filter((n) => !n.selected));
    setEdges((eds) => eds.filter((e) => !e.selected));
  }, [setNodes, setEdges]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1f262d', position: 'relative' }}>

      {/* toolbar */}
      <div style={{
        position: 'absolute', top: 22, left: 22, zIndex: 50,
        display: 'flex', gap: 10, padding: 10,
        borderRadius: 15, background: 'rgba(30,38,46,.92)',
        border: '1px solid rgba(180,210,230,.22)',
        boxShadow: '0 12px 30px rgba(0,0,0,.28)',
        backdropFilter: 'blur(8px)',
      }}>
        {/* Add */}
        <button onClick={addNode} title="Add FCU" style={btnStyle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={iconStyle}>
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
            <rect x="3.5" y="3.5" width="17" height="17" rx="3" />
          </svg>
        </button>
        {/* Delete */}
        <button onClick={deleteSelected} title="Delete selected" style={btnStyle}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={iconStyle}>
            <path d="M4 7h16M10 11v6M14 11v6" strokeLinecap="round" />
            <path d="M6 7l1 13h10l1-13M9 7V4h6v3" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Backspace', 'Delete']}
        defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        minZoom={0.3}
        maxZoom={3}
        style={{ background: 'transparent' }}
      >
        {/* dark grid */}
        <Background
          color="rgba(255,255,255,.06)"
          gap={24}
          style={{ background: '#1f262d' }}
        />
        {/* zoom controls — bottom-left by default */}
        <Controls
          style={{
            background: 'rgba(30,38,46,.92)',
            border: '1px solid rgba(180,210,230,.22)',
            borderRadius: 12,
            boxShadow: '0 8px 24px rgba(0,0,0,.3)',
          }}
        />
      </ReactFlow>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  width: 50, height: 50,
  border: '1px solid rgba(255,255,255,.09)',
  borderRadius: 12,
  display: 'grid', placeItems: 'center',
  background: 'linear-gradient(180deg,rgba(255,255,255,.06),rgba(255,255,255,.025))',
  color: '#eef7fd',
  cursor: 'pointer',
};

const iconStyle: React.CSSProperties = {
  width: 24, height: 24, strokeWidth: 2,
};
