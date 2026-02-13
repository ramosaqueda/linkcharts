'use client';

import { useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useGraphStore } from '@/lib/store';

const LeafletMap = dynamic(() => import('./LeafletMap'), { ssr: false });

export default function MapPanel() {
  const { nodes, selectedNodeId, setSelectedNode } = useGraphStore();

  const geoNodes = useMemo(() => {
    return nodes
      .filter((n) => {
        const meta = n.metadata as Record<string, string> | null;
        if (!meta) return false;
        const lat = parseFloat(meta.latitude);
        const lng = parseFloat(meta.longitude);
        return !isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
      })
      .map((n) => {
        const meta = n.metadata as Record<string, string>;
        return {
          id: n.id,
          label: n.label,
          type: n.type,
          latitude: parseFloat(meta.latitude),
          longitude: parseFloat(meta.longitude),
        };
      });
  }, [nodes]);

  return (
    <div className="w-full h-full relative">
      {geoNodes.length === 0 ? (
        <div className="flex items-center justify-center h-full text-xs font-mono" style={{ color: 'var(--th-text-dimmed)' }}>
          Sin nodos geolocalizados. Agrega coordenadas en el panel de detalle.
        </div>
      ) : (
        <LeafletMap
          geoNodes={geoNodes}
          selectedNodeId={selectedNodeId}
          onNodeSelect={setSelectedNode}
        />
      )}
    </div>
  );
}
