'use client';

import { EDGE_COLORS } from '@/lib/constants';
import type { EdgeType } from '@/lib/types';

const edgeTypes: EdgeType[] = [
  'CONTACT', 'TRANSACTION', 'KINSHIP', 'ASSOCIATE', 'OWNERSHIP',
  'LOCATION', 'EMPLOYMENT', 'COMMUNICATION', 'TEMPORAL', 'CUSTOM',
];

export default function EdgeMarkers() {
  return (
    <svg style={{ position: 'absolute', width: 0, height: 0 }}>
      <defs>
        {edgeTypes.map((type) => (
          <marker
            key={type}
            id={`marker-${type}`}
            viewBox="0 0 12 12"
            refX="10"
            refY="6"
            markerWidth="8"
            markerHeight="8"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 12 6 L 0 12 z" fill={EDGE_COLORS[type]} />
          </marker>
        ))}
      </defs>
    </svg>
  );
}
