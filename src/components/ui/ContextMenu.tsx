'use client';

import { useEffect, useRef } from 'react';
import { Copy, Trash2, Link, Pencil, ClipboardPaste, GitCommitHorizontal } from 'lucide-react';
import { useGraphStore } from '@/lib/store';
import { getIconComponent } from '@/lib/icon-map';
import { useReactFlow } from '@xyflow/react';

interface Props {
  x: number;
  y: number;
  canvasX: number;
  canvasY: number;
  nodeId?: string;
  onClose: () => void;
}

export default function ContextMenu({ x, y, canvasX, canvasY, nodeId, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const { graph, addNode, deleteNode, nodes, setClipboard, clipboard, setSelectedNode, setMode, nodeTypes, getNodeLabel, openAnalysisPanelWithSource } = useGraphStore();
  const { screenToFlowPosition } = useReactFlow();

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as HTMLElement)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  const handleAddNode = async (typeName: string) => {
    if (!graph) return;
    const pos = screenToFlowPosition({ x: x, y: y });
    await addNode(graph.id, typeName, getNodeLabel(typeName), pos.x, pos.y);
    onClose();
  };

  const handleDeleteNode = async () => {
    if (nodeId) {
      await deleteNode(nodeId);
      onClose();
    }
  };

  const handleCopyNode = () => {
    if (!nodeId) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setClipboard({
        type: node.type,
        label: node.label,
        metadata: node.metadata as Record<string, string> | null,
      });
    }
    onClose();
  };

  const handleDuplicateNode = async () => {
    if (!nodeId || !graph) return;
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      await addNode(graph.id, node.type, `${node.label} (copia)`, node.positionX + 60, node.positionY + 60, node.metadata as Record<string, string>);
    }
    onClose();
  };

  const handlePaste = async () => {
    if (!clipboard || !graph) return;
    const pos = screenToFlowPosition({ x, y });
    await addNode(graph.id, clipboard.type, clipboard.label, pos.x, pos.y, clipboard.metadata || undefined);
    onClose();
  };

  const handleStartConnect = () => {
    if (nodeId) {
      setSelectedNode(nodeId);
      setMode('connect');
    }
    onClose();
  };

  const handleAnalyzeConnections = () => {
    if (nodeId) {
      openAnalysisPanelWithSource(nodeId);
    }
    onClose();
  };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 100,
  };

  if (nodeId) {
    return (
      <div ref={ref} style={{ ...menuStyle, backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }} className="backdrop-blur-xl border rounded-lg shadow-2xl py-1 min-w-[180px] font-mono text-xs">
        <button onClick={() => { setSelectedNode(nodeId); onClose(); }} className="th-menu-item flex items-center gap-2 w-full px-3 py-2 text-left transition-colors">
          <Pencil size={14} /> Editar
        </button>
        <button onClick={handleDuplicateNode} className="th-menu-item flex items-center gap-2 w-full px-3 py-2 text-left transition-colors">
          <Copy size={14} /> Duplicar
        </button>
        <button onClick={handleCopyNode} className="th-menu-item flex items-center gap-2 w-full px-3 py-2 text-left transition-colors">
          <ClipboardPaste size={14} /> Copiar
        </button>
        <button onClick={handleStartConnect} className="th-menu-item flex items-center gap-2 w-full px-3 py-2 text-left transition-colors">
          <Link size={14} /> Conectar desde aquí
        </button>
        <button onClick={handleAnalyzeConnections} className="th-menu-item flex items-center gap-2 w-full px-3 py-2 text-left transition-colors">
          <GitCommitHorizontal size={14} /> Analizar conexiones
        </button>
        <div className="border-t my-1" style={{ borderColor: 'var(--th-border)' }} />
        <button onClick={handleDeleteNode} className="flex items-center gap-2 w-full px-3 py-2 text-left text-red-400 hover:bg-red-950/50 hover:text-red-300 transition-colors">
          <Trash2 size={14} /> Eliminar
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ ...menuStyle, backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }} className="backdrop-blur-xl border rounded-lg shadow-2xl py-1 min-w-[200px] font-mono text-xs">
      <div className="px-3 py-1.5 text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>Agregar nodo</div>
      {nodeTypes.map((nt) => {
        const Icon = getIconComponent(nt.icon);
        return (
          <button
            key={nt.name}
            onClick={() => handleAddNode(nt.name)}
            className="th-menu-item flex items-center gap-2 w-full px-3 py-1.5 text-left transition-colors"
          >
            <Icon size={14} style={{ color: nt.color }} />
            {nt.label}
          </button>
        );
      })}
      {clipboard && (
        <>
          <div className="border-t my-1" style={{ borderColor: 'var(--th-border)' }} />
          <button onClick={handlePaste} className="th-menu-item flex items-center gap-2 w-full px-3 py-2 text-left transition-colors">
            <ClipboardPaste size={14} /> Pegar nodo
          </button>
        </>
      )}
    </div>
  );
}
