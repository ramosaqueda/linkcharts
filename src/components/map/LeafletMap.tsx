'use client';

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, Tooltip, useMap, LayersControl } from 'react-leaflet';
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

// Tile layer configurations
const TILE_LAYERS = {
  dark: {
    name: 'Oscuro',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
  satellite: {
    name: 'Satelital',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: '&copy; <a href="https://www.esri.com/">Esri</a> &mdash; Source: Esri, Maxar, Earthstar Geographics',
    maxZoom: 19,
  },
  streets: {
    name: 'Calles',
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 20,
  },
  topo: {
    name: 'Topográfico',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://opentopomap.org">OpenTopoMap</a>',
    maxZoom: 17,
  },
};

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

function FitBounds({ geoNodes }: { geoNodes: GeoNode[] }) {
  const map = useMap();
  const fitted = useRef(false);

  useEffect(() => {
    if (fitted.current || geoNodes.length < 2) return;
    const bounds = L.latLngBounds(geoNodes.map((n) => [n.latitude, n.longitude] as [number, number]));
    map.fitBounds(bounds, { padding: [30, 30], maxZoom: 12 });
    fitted.current = true;
  }, [geoNodes, map]);

  return null;
}

export default function LeafletMap({ geoNodes, selectedNodeId, onNodeSelect }: LeafletMapProps) {
  const { getNodeColor, getNodeLabel } = useGraphStore();

  const center = useMemo(() => {
    if (geoNodes.length === 0) return [20, 0] as [number, number];
    if (geoNodes.length === 1) return [geoNodes[0].latitude, geoNodes[0].longitude] as [number, number];
    const avgLat = geoNodes.reduce((sum, n) => sum + n.latitude, 0) / geoNodes.length;
    const avgLng = geoNodes.reduce((sum, n) => sum + n.longitude, 0) / geoNodes.length;
    return [avgLat, avgLng] as [number, number];
  }, [geoNodes]);

  return (
    <MapContainer
      center={center}
      zoom={geoNodes.length === 1 ? 10 : 2}
      className="w-full h-full"
      style={{ background: 'var(--th-leaflet-bg)' }}
    >
      <LayersControl position="topright">
        <LayersControl.BaseLayer name={TILE_LAYERS.dark.name}>
          <TileLayer
            attribution={TILE_LAYERS.dark.attribution}
            url={TILE_LAYERS.dark.url}
            maxZoom={TILE_LAYERS.dark.maxZoom}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer checked name={TILE_LAYERS.satellite.name}>
          <TileLayer
            attribution={TILE_LAYERS.satellite.attribution}
            url={TILE_LAYERS.satellite.url}
            maxZoom={TILE_LAYERS.satellite.maxZoom}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={TILE_LAYERS.streets.name}>
          <TileLayer
            attribution={TILE_LAYERS.streets.attribution}
            url={TILE_LAYERS.streets.url}
            maxZoom={TILE_LAYERS.streets.maxZoom}
          />
        </LayersControl.BaseLayer>

        <LayersControl.BaseLayer name={TILE_LAYERS.topo.name}>
          <TileLayer
            attribution={TILE_LAYERS.topo.attribution}
            url={TILE_LAYERS.topo.url}
            maxZoom={TILE_LAYERS.topo.maxZoom}
          />
        </LayersControl.BaseLayer>
      </LayersControl>

      <FlyToSelected geoNodes={geoNodes} selectedNodeId={selectedNodeId} />
      <FitBounds geoNodes={geoNodes} />

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
