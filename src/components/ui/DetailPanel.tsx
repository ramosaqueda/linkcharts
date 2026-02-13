'use client';

import { useState, useEffect, useCallback } from 'react';
import { X, Trash2, Plus, Minus, ArrowRight, ArrowLeft } from 'lucide-react';
import type { EdgeType } from '@/lib/types';
import { EDGE_COLORS, EDGE_LABELS } from '@/lib/constants';
import { useGraphStore } from '@/lib/store';
import { getIconComponent } from '@/lib/icon-map';

const allEdgeTypes: EdgeType[] = [
  'CONTACT', 'TRANSACTION', 'KINSHIP', 'ASSOCIATE', 'OWNERSHIP',
  'LOCATION', 'EMPLOYMENT', 'COMMUNICATION', 'TEMPORAL', 'CUSTOM',
];

export default function DetailPanel({ readOnly = false }: { readOnly?: boolean }) {
  const {
    selectedNodeId, selectedEdgeId, nodes, edges,
    updateNode, updateEdge, deleteNode, deleteEdge,
    setSelectedNode, setSelectedEdge,
    nodeTypes, getNodeColor, getNodeLabel,
  } = useGraphStore();

  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedEdge = selectedEdgeId ? edges.find((e) => e.id === selectedEdgeId) : null;

  const [label, setLabel] = useState('');
  const [nodeType, setNodeType] = useState('PERSON');
  const [edgeType, setEdgeType] = useState<EdgeType>('CONTACT');
  const [metadata, setMetadata] = useState<Array<{ key: string; value: string }>>([]);
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [nodeDate, setNodeDate] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Sync state when selection changes
  useEffect(() => {
    if (selectedNode) {
      setLabel(selectedNode.label);
      setNodeType(selectedNode.type);
      const meta = (selectedNode.metadata as Record<string, string>) || {};
      setLatitude(meta.latitude || '');
      setLongitude(meta.longitude || '');
      setNodeDate(meta.date || '');
      const filteredMeta = Object.entries(meta)
        .filter(([key]) => key !== 'latitude' && key !== 'longitude' && key !== 'date')
        .map(([key, value]) => ({ key, value }));
      setMetadata(filteredMeta);
      setShowDeleteConfirm(false);
    }
  }, [selectedNode]);

  useEffect(() => {
    if (selectedEdge) {
      setLabel(selectedEdge.label || '');
      setEdgeType(selectedEdge.type);
      setShowDeleteConfirm(false);
    }
  }, [selectedEdge]);

  const handleSaveNode = useCallback(() => {
    if (!selectedNode) return;
    const meta = metadata.reduce<Record<string, string>>((acc, { key, value }) => {
      if (key.trim()) acc[key.trim()] = value;
      return acc;
    }, {});
    if (latitude.trim()) meta.latitude = latitude.trim();
    if (longitude.trim()) meta.longitude = longitude.trim();
    if (nodeDate.trim()) meta.date = nodeDate.trim();
    updateNode(selectedNode.id, { label, type: nodeType, metadata: meta });
  }, [selectedNode, label, nodeType, metadata, latitude, longitude, nodeDate, updateNode]);

  const handleSaveEdge = useCallback(() => {
    if (!selectedEdge) return;
    updateEdge(selectedEdge.id, { label: label || null, type: edgeType });
  }, [selectedEdge, label, edgeType, updateEdge]);

  const handleDelete = async () => {
    if (selectedNode) {
      await deleteNode(selectedNode.id);
    } else if (selectedEdge) {
      await deleteEdge(selectedEdge.id);
    }
  };

  const handleClose = () => {
    setSelectedNode(null);
    setSelectedEdge(null);
  };

  if (!selectedNode && !selectedEdge) return null;

  const nodeEdgesFrom = selectedNode ? edges.filter((e) => e.sourceId === selectedNode.id) : [];
  const nodeEdgesTo = selectedNode ? edges.filter((e) => e.targetId === selectedNode.id) : [];

  const sourceNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.sourceId) : null;
  const targetNode = selectedEdge ? nodes.find((n) => n.id === selectedEdge.targetId) : null;

  const color = selectedNode
    ? getNodeColor(selectedNode.type)
    : selectedEdge
      ? EDGE_COLORS[selectedEdge.type]
      : '#a855f7';

  return (
    <div className="absolute top-0 right-0 h-full w-80 backdrop-blur-2xl border-l z-40 shadow-2xl animate-slideIn overflow-y-auto font-mono" style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--th-border)' }}>
        <div className="flex items-center gap-2">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>
            {selectedNode ? 'Nodo' : 'Conexión'}
          </span>
        </div>
        <button
          onClick={handleClose}
          className="transition-colors" style={{ color: 'var(--th-text-muted)' }}
        >
          <X size={16} />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* ID */}
        <div>
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>ID</span>
          <p className="text-xs truncate mt-0.5" style={{ color: 'var(--th-text-muted)' }}>
            {selectedNode?.id || selectedEdge?.id}
          </p>
        </div>

        {/* Label */}
        <div>
          <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
            Etiqueta
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onBlur={selectedNode ? handleSaveNode : handleSaveEdge}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                selectedNode ? handleSaveNode() : handleSaveEdge();
              }
            }}
            disabled={readOnly}
            className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
          />
        </div>

        {/* Type selector */}
        {selectedNode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
              Tipo de nodo
            </label>
            <select
              value={nodeType}
              onChange={(e) => {
                setNodeType(e.target.value);
                updateNode(selectedNode.id, { type: e.target.value });
              }}
              disabled={readOnly}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
            >
              {nodeTypes.map((t) => (
                <option key={t.name} value={t.name}>{t.label}</option>
              ))}
            </select>
          </div>
        )}

        {selectedEdge && (
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
              Tipo de conexión
            </label>
            <select
              value={edgeType}
              onChange={(e) => {
                setEdgeType(e.target.value as EdgeType);
                updateEdge(selectedEdge.id, { type: e.target.value as EdgeType });
              }}
              disabled={readOnly}
              className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono appearance-none cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
            >
              {allEdgeTypes.map((t) => (
                <option key={t} value={t}>{EDGE_LABELS[t]}</option>
              ))}
            </select>
          </div>
        )}

        {/* Edge source/target */}
        {selectedEdge && sourceNode && targetNode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
              Conexión
            </label>
            <div className="flex items-center gap-2 text-xs rounded-lg px-3 py-2" style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-tertiary)' }}>
              <span className="truncate" style={{ color: getNodeColor(sourceNode.type) }}>
                {sourceNode.label}
              </span>
              <ArrowRight size={12} className="shrink-0" style={{ color: 'var(--th-text-dimmed)' }} />
              <span className="truncate" style={{ color: getNodeColor(targetNode.type) }}>
                {targetNode.label}
              </span>
            </div>
          </div>
        )}

        {/* Geolocation fields for nodes */}
        {selectedNode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
              Geolocalización
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Latitud"
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  onBlur={handleSaveNode}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNode(); }}
                  disabled={readOnly}
                  step="any"
                  min="-90"
                  max="90"
                  className="w-full border rounded px-2 py-1.5 text-[11px] outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>
              <div className="flex-1">
                <input
                  type="number"
                  placeholder="Longitud"
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  onBlur={handleSaveNode}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSaveNode(); }}
                  disabled={readOnly}
                  step="any"
                  min="-180"
                  max="180"
                  className="w-full border rounded px-2 py-1.5 text-[11px] outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Date field for nodes */}
        {selectedNode && (
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
              Fecha / Evento temporal
            </label>
            <input
              type="datetime-local"
              value={nodeDate}
              onChange={(e) => setNodeDate(e.target.value)}
              onBlur={handleSaveNode}
              disabled={readOnly}
              className="w-full border rounded px-2 py-1.5 text-[11px] outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
            />
          </div>
        )}

        {/* Metadata editor for nodes */}
        {selectedNode && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>
                Metadata
              </label>
              {!readOnly && (
                <button
                  onClick={() => setMetadata([...metadata, { key: '', value: '' }])}
                  className="transition-colors" style={{ color: 'var(--th-text-muted)' }}
                >
                  <Plus size={14} />
                </button>
              )}
            </div>
            <div className="space-y-2">
              {metadata.map((item, i) => (
                <div key={i} className="flex gap-1.5 items-center">
                  <input
                    type="text"
                    placeholder="Clave"
                    value={item.key}
                    onChange={(e) => {
                      const newMeta = [...metadata];
                      newMeta[i].key = e.target.value;
                      setMetadata(newMeta);
                    }}
                    onBlur={handleSaveNode}
                    disabled={readOnly}
                    className="flex-1 border rounded px-2 py-1 text-[11px] outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                  />
                  <input
                    type="text"
                    placeholder="Valor"
                    value={item.value}
                    onChange={(e) => {
                      const newMeta = [...metadata];
                      newMeta[i].value = e.target.value;
                      setMetadata(newMeta);
                    }}
                    onBlur={handleSaveNode}
                    disabled={readOnly}
                    className="flex-1 border rounded px-2 py-1 text-[11px] outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-60 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                  />
                  {!readOnly && (
                    <button
                      onClick={() => {
                        setMetadata(metadata.filter((_, j) => j !== i));
                        const meta = metadata.filter((_, j) => j !== i).reduce<Record<string, string>>((acc, { key, value }) => {
                          if (key.trim()) acc[key.trim()] = value;
                          return acc;
                        }, {});
                        updateNode(selectedNode.id, { metadata: meta });
                      }}
                      className="hover:text-red-400 transition-colors" style={{ color: 'var(--th-text-dimmed)' }}
                    >
                      <Minus size={12} />
                    </button>
                  )}
                </div>
              ))}
              {metadata.length === 0 && (
                <p className="text-[10px] italic" style={{ color: 'var(--th-text-faint)' }}>Sin metadata</p>
              )}
            </div>
          </div>
        )}

        {/* Connections list for nodes */}
        {selectedNode && (nodeEdgesFrom.length > 0 || nodeEdgesTo.length > 0) && (
          <div>
            <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
              Conexiones ({nodeEdgesFrom.length + nodeEdgesTo.length})
            </label>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {nodeEdgesFrom.map((e) => {
                const target = nodes.find((n) => n.id === e.targetId);
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEdge(e.id)}
                    className="th-connection-item flex items-center gap-1.5 w-full px-2 py-1 text-[11px] rounded transition-colors"
                  >
                    <ArrowRight size={10} style={{ color: EDGE_COLORS[e.type] }} />
                    <span style={{ color: 'var(--th-text-dimmed)' }}>{EDGE_LABELS[e.type]}</span>
                    <span className="truncate">{target?.label}</span>
                  </button>
                );
              })}
              {nodeEdgesTo.map((e) => {
                const source = nodes.find((n) => n.id === e.sourceId);
                return (
                  <button
                    key={e.id}
                    onClick={() => setSelectedEdge(e.id)}
                    className="th-connection-item flex items-center gap-1.5 w-full px-2 py-1 text-[11px] rounded transition-colors"
                  >
                    <ArrowLeft size={10} style={{ color: EDGE_COLORS[e.type] }} />
                    <span style={{ color: 'var(--th-text-dimmed)' }}>{EDGE_LABELS[e.type]}</span>
                    <span className="truncate">{source?.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Delete */}
        {!readOnly && (
        <div className="pt-2 border-t" style={{ borderColor: 'var(--th-border)' }}>
          {!showDeleteConfirm ? (
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="flex items-center gap-2 w-full px-3 py-2 text-xs text-red-400 hover:bg-red-950/30 rounded-lg transition-colors"
            >
              <Trash2 size={14} />
              Eliminar {selectedNode ? 'nodo' : 'conexión'}
            </button>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-red-400">
                {selectedNode
                  ? 'Se eliminarán todas las conexiones asociadas.'
                  : '¿Confirmar eliminación?'}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  className="flex-1 px-3 py-1.5 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Confirmar
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="th-btn-secondary flex-1 px-3 py-1.5 text-xs rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}
