'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGraphStore } from '@/lib/store';

interface GeoNode {
  id: string;
  label: string;
  type: string;
  latitude: number;
  longitude: number;
}

interface LeafletMapProps {
  geoNodes: GeoNode[];
  selectedNodeId: string | null;
  onNodeSelect: (nodeId: string) => void;
}

function createMarkerIcon(color: string, isSelected: boolean): L.DivIcon {
  return L.divIcon({
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
    html: `<div style="
      width: 14px;
      height: 14px;
      border-radius: 50%;
      background: ${color};
      border: 2px solid ${isSelected ? '#fff' : 'rgba(0,0,0,0.3)'};
      box-shadow: 0 0 ${isSelected ? '8px' : '4px'} ${isSelected ? color : 'rgba(0,0,0,0.4)'};
      transition: all 0.2s;
    "></div>`,
  });
}

function FlyToSelected({ geoNodes, selectedNodeId }: { geoNodes: GeoNode[]; selectedNodeId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!selectedNodeId) return;
    const node = geoNodes.find((n) => n.id === selectedNodeId);
    if (node) {
      map.flyTo([node.latitude, node.longitude], Math.max(map.getZoom(), 6), { duration: 0.8 });
    }
  }, [selectedNodeId, geoNodes, map]);

  return null;
}

export default function LeafletMap({ geoNodes, selectedNodeId, onNodeSelect }: LeafletMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const { getNodeColor, getNodeLabel } = useGraphStore();

  const bounds = useMemo(() => {
    if (geoNodes.length === 0) return null;
    if (geoNodes.length === 1) return null;
    return L.latLngBounds(geoNodes.map((n) => [n.latitude, n.longitude] as [number, number]));
  }, [geoNodes]);

  useEffect(() => {
    if (mapRef.current && bounds) {
      mapRef.current.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    }
  }, [bounds]);

  return (
    <MapContainer
      center={[20, 0]}
      zoom={2}
      className="w-full h-full"
      ref={mapRef}
      style={{ background: 'var(--th-leaflet-bg)' }}
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      />
      <FlyToSelected geoNodes={geoNodes} selectedNodeId={selectedNodeId} />
      {geoNodes.map((node) => (
        <Marker
          key={node.id}
          position={[node.latitude, node.longitude]}
          icon={createMarkerIcon(getNodeColor(node.type), node.id === selectedNodeId)}
          eventHandlers={{
            click: () => onNodeSelect(node.id),
          }}
        >
          <Tooltip
            direction="top"
            offset={[0, -10]}
            className="leaflet-tooltip-dark"
          >
            <span style={{ fontSize: '11px', fontFamily: 'monospace' }}>
              <span style={{ color: getNodeColor(node.type) }}>{getNodeLabel(node.type)}</span>
              {': '}
              {node.label}
            </span>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
