'use client';

import { useMemo, useRef, useEffect, useState } from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { useGraphStore } from '@/lib/store';

interface TimelineNode {
  id: string;
  label: string;
  type: string;
  date: Date;
  dateStr: string;
}

function parseDate(value: string): Date | null {
  const d = new Date(value);
  if (!isNaN(d.getTime())) return d;
  // Try DD/MM/YYYY
  const parts = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/);
  if (parts) {
    const parsed = new Date(+parts[3], +parts[2] - 1, +parts[1]);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function formatDate(d: Date): string {
  return d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatFullDate(d: Date): string {
  const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
  if (hasTime) {
    return d.toLocaleString('es-ES', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  }
  return formatDate(d);
}

const ZOOM_LEVELS = [0.5, 0.75, 1, 1.5, 2, 3];

export default function TimelinePanel() {
  const { nodes, selectedNodeId, setSelectedNode, getNodeColor, getNodeLabel } = useGraphStore();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLButtonElement>(null);
  const [zoomIndex, setZoomIndex] = useState(2); // default = 1x
  const zoom = ZOOM_LEVELS[zoomIndex];

  const timelineNodes = useMemo<TimelineNode[]>(() => {
    return nodes
      .filter((n) => {
        const meta = n.metadata as Record<string, string> | null;
        return meta?.date && parseDate(meta.date) !== null;
      })
      .map((n) => {
        const meta = n.metadata as Record<string, string>;
        const date = parseDate(meta.date)!;
        return { id: n.id, label: n.label, type: n.type, date, dateStr: meta.date };
      })
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [nodes]);

  // Auto-scroll to selected node
  useEffect(() => {
    if (selectedRef.current) {
      selectedRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [selectedNodeId]);

  if (timelineNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-xs font-mono" style={{ color: 'var(--th-text-dimmed)' }}>
        Sin nodos con fecha. Agrega una fecha en el panel de detalle.
      </div>
    );
  }

  const minTime = timelineNodes[0].date.getTime();
  const maxTime = timelineNodes[timelineNodes.length - 1].date.getTime();
  const timeSpan = maxTime - minTime || 1;

  // Group nodes by same date (within same day) for stacking
  const dayGroups = new Map<string, TimelineNode[]>();
  for (const tn of timelineNodes) {
    const dayKey = tn.date.toISOString().slice(0, 10);
    const group = dayGroups.get(dayKey) || [];
    group.push(tn);
    dayGroups.set(dayKey, group);
  }

  // Calculate horizontal width scaled by zoom
  const MIN_WIDTH = Math.max(800, timelineNodes.length * 120) * zoom;

  return (
    <div className="h-full flex flex-col font-mono" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 border-b shrink-0" style={{ borderColor: 'var(--th-border)' }}>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-orange-500" />
          <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-muted)' }}>
            Línea temporal
          </span>
          <span className="text-[10px]" style={{ color: 'var(--th-text-faint)' }}>
            {timelineNodes.length} evento{timelineNodes.length !== 1 && 's'}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-[10px]" style={{ color: 'var(--th-text-dimmed)' }}>
            {formatDate(timelineNodes[0].date)} — {formatDate(timelineNodes[timelineNodes.length - 1].date)}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setZoomIndex(Math.max(0, zoomIndex - 1))}
              disabled={zoomIndex === 0}
              className="th-btn-ghost p-0.5 rounded disabled:opacity-30 transition-colors"
              title="Reducir espacio"
            >
              <ZoomOut size={13} />
            </button>
            <span className="text-[9px] w-7 text-center tabular-nums" style={{ color: 'var(--th-text-dimmed)' }}>
              {zoom}x
            </span>
            <button
              onClick={() => setZoomIndex(Math.min(ZOOM_LEVELS.length - 1, zoomIndex + 1))}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className="th-btn-ghost p-0.5 rounded disabled:opacity-30 transition-colors"
              title="Aumentar espacio"
            >
              <ZoomIn size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable timeline */}
      <div ref={scrollRef} className="flex-1 overflow-x-auto overflow-y-hidden relative">
        <div className="relative h-full" style={{ minWidth: `${MIN_WIDTH}px` }}>
          {/* Horizontal axis line */}
          <div className="absolute left-8 right-8 top-1/2 h-px" style={{ backgroundColor: 'var(--th-border)' }} />

          {/* Tick marks and date labels */}
          {timelineNodes.map((tn) => {
            const pct = timelineNodes.length === 1 ? 50 : 4 + ((tn.date.getTime() - minTime) / timeSpan) * 92;
            const stackIndex = dayGroups.get(tn.date.toISOString().slice(0, 10))!.indexOf(tn);
            const isSelected = tn.id === selectedNodeId;
            const nodeColor = getNodeColor(tn.type);

            return (
              <div
                key={tn.id}
                className="absolute flex flex-col items-center"
                style={{
                  left: `${pct}%`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                }}
              >
                {/* Date label (below) */}
                <div
                  className="absolute text-[9px] whitespace-nowrap"
                  style={{ color: 'var(--th-text-dimmed)', top: '36px' }}
                >
                  {formatFullDate(tn.date)}
                </div>

                {/* Vertical tick */}
                <div className="absolute w-px h-3" style={{ top: '16px', backgroundColor: 'var(--th-text-faint)' }} />

                {/* Node marker (above axis) */}
                <button
                  ref={isSelected ? selectedRef : undefined}
                  onClick={() => setSelectedNode(tn.id)}
                  className={`relative flex flex-col items-center gap-1 group transition-all ${
                    isSelected ? 'z-20' : 'z-10 hover:z-20'
                  }`}
                  style={{ marginTop: `${-60 - stackIndex * 32}px` }}
                  title={`${tn.label}\n${formatFullDate(tn.date)}`}
                >
                  {/* Label */}
                  <span
                    className="text-[10px] max-w-[100px] truncate px-1.5 py-0.5 rounded transition-all"
                    style={{
                      backgroundColor: isSelected ? 'var(--th-bg-hover)' : 'transparent',
                      color: isSelected ? 'var(--th-text-primary)' : 'var(--th-text-muted)',
                    }}
                  >
                    {tn.label}
                  </span>

                  {/* Dot */}
                  <div
                    className="rounded-full transition-all"
                    style={{
                      width: isSelected ? 14 : 10,
                      height: isSelected ? 14 : 10,
                      backgroundColor: nodeColor,
                      border: isSelected ? '2px solid #fff' : '2px solid rgba(0,0,0,0.3)',
                      boxShadow: isSelected
                        ? `0 0 8px ${nodeColor}`
                        : `0 0 4px rgba(0,0,0,0.4)`,
                    }}
                  />

                  {/* Type badge on hover */}
                  <span
                    className="absolute -top-5 text-[8px] uppercase tracking-wider opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap"
                    style={{ color: nodeColor }}
                  >
                    {getNodeLabel(tn.type)}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
