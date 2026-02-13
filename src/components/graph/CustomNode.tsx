'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { useGraphStore } from '@/lib/store';
import { getIconComponent } from '@/lib/icon-map';

export type CustomNodeData = {
  label: string;
  nodeType: string;
  dbId: string;
  metadata?: Record<string, string> | null;
};

function CustomNodeComponent({ data, selected }: NodeProps & { data: CustomNodeData }) {
  const { getNodeColor, getNodeIcon } = useGraphStore();
  const color = getNodeColor(data.nodeType);
  const IconComponent = getIconComponent(getNodeIcon(data.nodeType));

  return (
    <div className="relative flex flex-col items-center group">
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2 !h-2 !border-[var(--th-border)] hover:!bg-[var(--th-text-primary)] transition-colors" style={{ background: 'var(--th-text-dimmed)' }}
      />
      <Handle
        type="target"
        position={Position.Bottom}
        className="!w-2 !h-2 !border-[var(--th-border)] hover:!bg-[var(--th-text-primary)] transition-colors" style={{ background: 'var(--th-text-dimmed)' }}
      />

      <div
        className="relative flex items-center justify-center w-14 h-14 rounded-full transition-all duration-200"
        style={{
          backgroundColor: 'var(--th-bg-node)',
          border: `2px solid ${color}`,
          boxShadow: selected
            ? `0 0 0 3px ${color}40, 0 0 16px ${color}30`
            : `0 2px 8px rgba(0,0,0,0.3)`,
        }}
      >
        {selected && (
          <div
            className="absolute inset-0 rounded-full animate-ping opacity-20"
            style={{ border: `2px solid ${color}` }}
          />
        )}
        <span style={{ color: color }}><IconComponent size={24} /></span>
      </div>

      <span
        className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono leading-tight text-center max-w-[100px] truncate"
        style={{
          backgroundColor: `${color}20`,
          color: color,
        }}
      >
        {data.label}
      </span>

      <Handle
        type="source"
        position={Position.Top}
        className="!w-2 !h-2 !border-[var(--th-border)] hover:!bg-[var(--th-text-primary)] transition-colors" style={{ background: 'var(--th-text-dimmed)' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2 !h-2 !border-[var(--th-border)] hover:!bg-[var(--th-text-primary)] transition-colors" style={{ background: 'var(--th-text-dimmed)' }}
      />
    </div>
  );
}

export default memo(CustomNodeComponent);
