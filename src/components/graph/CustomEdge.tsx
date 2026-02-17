'use client';

import { memo } from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
} from '@xyflow/react';
import type { EdgeType } from '@/lib/types';
import { EDGE_COLORS, DASHED_EDGE_TYPES } from '@/lib/constants';
import { useGraphStore } from '@/lib/store';

export type CustomEdgeData = {
  edgeType: EdgeType;
  dbId: string;
  label?: string | null;
  highlighted?: boolean;
};

function CustomEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps & { data: CustomEdgeData }) {
  const setSelectedEdge = useGraphStore((s) => s.setSelectedEdge);
  const edgeType = data?.edgeType || 'CUSTOM';
  const color = EDGE_COLORS[edgeType] || '#a855f7';
  const isDashed = DASHED_EDGE_TYPES.includes(edgeType);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        path={edgePath}
        style={{
          stroke: color,
          strokeWidth: data.highlighted ? 3 : (selected ? 2.5 : 1.5),
          strokeDasharray: isDashed ? '6 4' : undefined,
          filter: data.highlighted
            ? `drop-shadow(0 0 6px ${color})`
            : (selected ? `drop-shadow(0 0 4px ${color}60)` : undefined),
          opacity: data.highlighted ? 1 : (selected ? 1 : 0.8),
          zIndex: data.highlighted ? 10 : 0,
        }}
        markerEnd={`url(#marker-${edgeType})`}
        interactionWidth={20}
      />
      {data?.label && (
        <EdgeLabelRenderer>
          <div
            className="absolute pointer-events-auto cursor-pointer font-mono text-[10px] px-2 py-0.5 rounded"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              backgroundColor: 'var(--th-bg-overlay)',
              color: color,
              border: `1px solid ${color}40`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              setSelectedEdge(data.dbId);
            }}
          >
            {data.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export default memo(CustomEdgeComponent);
