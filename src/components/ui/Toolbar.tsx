'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer2, Spline, Plus, Search, Download, ImageDown,
  ChevronDown, Filter, Eye, EyeOff, Undo2, Redo2,
  LayoutGrid, Map, Clock, GitCommitHorizontal,
} from 'lucide-react';
import { useGraphStore } from '@/lib/store';
import { getIconComponent } from '@/lib/icon-map';
import { useReactFlow } from '@xyflow/react';
import ThemeSelector from './ThemeSelector';

export default function Toolbar({ readOnly = false }: { readOnly?: boolean }) {
  const { mode, setMode, graph, nodes, edges, addNode, hiddenNodeTypes, toggleNodeTypeVisibility, showAllNodeTypes, hideAllNodeTypes, canUndo, canRedo, undo, redo, applyLayout, showMap, toggleMap, showTimeline, toggleTimeline, showAnalysisPanel, toggleAnalysisPanel, nodeTypes, getNodeColor, getNodeLabel, getNodeIcon } = useGraphStore();
  const { setCenter, getZoom } = useReactFlow();

  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof nodes>([]);
  const addMenuRef = useRef<HTMLDivElement>(null);
  const layoutMenuRef = useRef<HTMLDivElement>(null);
  const filterMenuRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(e.target as HTMLElement)) {
        setShowAddMenu(false);
      }
      if (layoutMenuRef.current && !layoutMenuRef.current.contains(e.target as HTMLElement)) {
        setShowLayoutMenu(false);
      }
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target as HTMLElement)) {
        setShowFilterMenu(false);
      }
      if (searchRef.current && !searchRef.current.contains(e.target as HTMLElement)) {
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      setSearchResults(nodes.filter((n) => n.label.toLowerCase().includes(q)));
      setShowSearch(true);
    } else {
      setSearchResults([]);
      setShowSearch(false);
    }
  }, [searchQuery, nodes]);

  const handleAddNode = async (typeName: string) => {
    if (!graph) return;
    const x = Math.random() * 400 + 100;
    const y = Math.random() * 400 + 100;
    await addNode(graph.id, typeName, getNodeLabel(typeName), x, y);
    setShowAddMenu(false);
  };

  const handleFocusNode = (nodeId: string) => {
    const node = nodes.find((n) => n.id === nodeId);
    if (node) {
      setCenter(node.positionX, node.positionY, { zoom: getZoom(), duration: 500 });
    }
    setSearchQuery('');
    setShowSearch(false);
  };

  const handleExport = () => {
    if (!graph) return;
    const data = { graph, nodes, edges };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${graph.name.replace(/\s+/g, '_')}_export.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportPNG = useCallback(async () => {
    const viewport = document.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport || !graph) return;
    try {
      const { toPng } = await import('html-to-image');
      const dataUrl = await toPng(viewport, {
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--th-bg-primary').trim(),
        quality: 1,
        pixelRatio: 2,
      });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${graph.name.replace(/\s+/g, '_')}.png`;
      a.click();
    } catch { /* silent */ }
  }, [graph]);

  // Keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.key === 'f') {
        e.preventDefault();
        const input = document.getElementById('node-search-input');
        input?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-2 backdrop-blur-xl border rounded-xl shadow-2xl font-mono" style={{ backgroundColor: 'var(--th-bg-overlay-light)', borderColor: 'var(--th-border)' }}>
      {/* Case info */}
      {graph && (
        <div className="flex items-center gap-2 pr-3 border-r" style={{ borderColor: 'var(--th-border)' }}>
          <span className="text-xs font-medium truncate max-w-[120px]" style={{ color: 'var(--th-text-primary)' }}>{graph.name}</span>
          {graph.caseNumber && (
            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-input)' }}>
              {graph.caseNumber}
            </span>
          )}
        </div>
      )}

      {/* Mode toggle */}
      {!readOnly && (
        <div className="flex items-center rounded-lg p-0.5" style={{ backgroundColor: 'var(--th-bg-input)' }}>
          <button
            onClick={() => setMode('select')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-all ${mode === 'select'
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
              : ''
              }`}
            style={mode !== 'select' ? { color: 'var(--th-text-muted)' } : undefined}
            title="Modo selección"
          >
            <MousePointer2 size={14} />
            <span className="hidden sm:inline">Seleccionar</span>
          </button>
          <button
            onClick={() => setMode('connect')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs transition-all ${mode === 'connect'
              ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
              : ''
              }`}
            style={mode !== 'connect' ? { color: 'var(--th-text-muted)' } : undefined}
            title="Modo conexión"
          >
            <Spline size={14} />
            <span className="hidden sm:inline">Conectar</span>
          </button>
        </div>
      )}

      {/* Undo / Redo */}
      {!readOnly && (
        <div className="flex items-center gap-0.5 pr-2 border-r" style={{ borderColor: 'var(--th-border)' }}>
          <button
            onClick={() => undo()}
            disabled={!canUndo}
            className="th-btn-ghost flex items-center justify-center w-7 h-7 rounded-md text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Deshacer (Ctrl+Z)"
          >
            <Undo2 size={14} />
          </button>
          <button
            onClick={() => redo()}
            disabled={!canRedo}
            className="th-btn-ghost flex items-center justify-center w-7 h-7 rounded-md text-xs transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            title="Rehacer (Ctrl+Shift+Z)"
          >
            <Redo2 size={14} />
          </button>
        </div>
      )}

      {/* Layout dropdown */}
      {!readOnly && (
        <div className="relative" ref={layoutMenuRef}>
          <button
            onClick={() => setShowLayoutMenu(!showLayoutMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors" style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
            title="Layout automático"
          >
            <LayoutGrid size={14} />
            <span className="hidden sm:inline">Layout</span>
            <ChevronDown size={10} />
          </button>
          {showLayoutMenu && (
            <div className="absolute top-full mt-1 left-0 backdrop-blur-xl border rounded-lg shadow-2xl py-1 min-w-[200px] z-50" style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}>
              {([
                { dir: 'TB' as const, label: 'Arriba \u2192 Abajo', icon: '\u2193' },
                { dir: 'LR' as const, label: 'Izquierda \u2192 Derecha', icon: '\u2192' },
                { dir: 'BT' as const, label: 'Abajo \u2192 Arriba', icon: '\u2191' },
                { dir: 'RL' as const, label: 'Derecha \u2192 Izquierda', icon: '\u2190' },
              ]).map(({ dir, label, icon }) => (
                <button
                  key={dir}
                  onClick={() => { applyLayout(dir); setShowLayoutMenu(false); }}
                  className="th-menu-item flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs transition-colors"
                >
                  <span className="w-4 text-center text-sm">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add node dropdown */}
      {!readOnly && (
        <div className="relative" ref={addMenuRef}>
          <button
            onClick={() => setShowAddMenu(!showAddMenu)}
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors" style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
          >
            <Plus size={14} />
            <span className="hidden sm:inline">Agregar</span>
            <ChevronDown size={10} />
          </button>
          {showAddMenu && (
            <div className="absolute top-full mt-1 left-0 backdrop-blur-xl border rounded-lg shadow-2xl py-1 min-w-[180px] z-50" style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}>
              {nodeTypes.map((nt) => {
                const Icon = getIconComponent(nt.icon);
                return (
                  <button
                    key={nt.name}
                    onClick={() => handleAddNode(nt.name)}
                    className="th-menu-item flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs transition-colors"
                  >
                    <Icon size={14} style={{ color: nt.color }} />
                    {nt.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Filter by type */}
      <div className="relative" ref={filterMenuRef}>
        <button
          onClick={() => setShowFilterMenu(!showFilterMenu)}
          className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${hiddenNodeTypes.size > 0
            ? 'text-amber-400 bg-amber-950/40 border border-amber-700/50'
            : ''
            }`}
          style={hiddenNodeTypes.size === 0 ? { color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' } : undefined}
          title="Filtrar por tipo"
        >
          <Filter size={14} />
          <span className="hidden sm:inline">Filtro</span>
          {hiddenNodeTypes.size > 0 && (
            <span className="text-[9px] bg-amber-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
              {hiddenNodeTypes.size}
            </span>
          )}
        </button>
        {showFilterMenu && (
          <div className="absolute top-full mt-1 left-0 backdrop-blur-xl border rounded-lg shadow-2xl py-1 min-w-[200px] z-50" style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}>
            <div className="flex items-center justify-between px-3 py-1.5 border-b" style={{ borderColor: 'var(--th-border)' }}>
              <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>Visibilidad</span>
              <div className="flex gap-1">
                <button
                  onClick={showAllNodeTypes}
                  className="text-[10px] transition-colors" style={{ color: 'var(--th-accent)' }}
                >
                  Todos
                </button>
                <span style={{ color: 'var(--th-text-faint)' }}>|</span>
                <button
                  onClick={hideAllNodeTypes}
                  className="text-[10px] transition-colors" style={{ color: 'var(--th-text-muted)' }}
                >
                  Ninguno
                </button>
              </div>
            </div>
            {nodeTypes.map((nt) => {
              const Icon = getIconComponent(nt.icon);
              const isHidden = hiddenNodeTypes.has(nt.name);
              const count = nodes.filter((n) => n.type === nt.name).length;
              return (
                <button
                  key={nt.name}
                  onClick={() => toggleNodeTypeVisibility(nt.name)}
                  className={`flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs transition-colors ${isHidden ? '' : 'th-menu-item'
                    }`}
                  style={isHidden ? { color: 'var(--th-text-faint)' } : undefined}
                >
                  {isHidden ? <EyeOff size={12} style={{ color: 'var(--th-text-faint)' }} /> : <Eye size={12} style={{ color: 'var(--th-text-muted)' }} />}
                  <Icon size={14} style={{ color: isHidden ? 'var(--th-text-faint)' : nt.color }} />
                  <span className={isHidden ? 'line-through' : ''}>{nt.label}</span>
                  {count > 0 && (
                    <span className="ml-auto text-[10px]" style={{ color: isHidden ? 'var(--th-text-faint)' : 'var(--th-text-dimmed)' }}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative" ref={searchRef}>
        <div className="flex items-center rounded-lg px-2 py-1" style={{ backgroundColor: 'var(--th-bg-input)' }}>
          <Search size={14} style={{ color: 'var(--th-text-dimmed)' }} />
          <input
            id="node-search-input"
            type="text"
            placeholder="Buscar... (Ctrl+F)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-transparent border-none outline-none text-xs ml-1.5 w-32 font-mono"
            style={{ color: 'var(--th-text-primary)' }}
          />
        </div>
        {showSearch && searchResults.length > 0 && (
          <div className="absolute top-full mt-1 left-0 right-0 backdrop-blur-xl border rounded-lg shadow-2xl py-1 max-h-48 overflow-y-auto z-50" style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}>
            {searchResults.map((node) => {
              const Icon = getIconComponent(getNodeIcon(node.type));
              return (
                <button
                  key={node.id}
                  onClick={() => handleFocusNode(node.id)}
                  className="th-menu-item flex items-center gap-2 w-full px-3 py-1.5 text-left text-xs transition-colors"
                >
                  <Icon size={12} style={{ color: getNodeColor(node.type) }} />
                  <span className="truncate">{node.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Export */}
      <button
        onClick={handleExport}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors" style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
        title="Exportar JSON"
      >
        <Download size={14} />
      </button>
      <button
        onClick={handleExportPNG}
        className="flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors" style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
        title="Exportar PNG"
      >
        <ImageDown size={14} />
      </button>

      {/* Map toggle */}
      <button
        onClick={toggleMap}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${showMap
          ? 'text-blue-400 bg-blue-950/40 border border-blue-700/50'
          : ''
          }`}
        style={!showMap ? { color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' } : undefined}
        title="Mapa de geolocalización"
      >
        <Map size={14} />
        <span className="hidden sm:inline">Mapa</span>
        {(() => {
          const geoCount = nodes.filter((n) => {
            const meta = n.metadata as Record<string, string> | null;
            if (!meta) return false;
            const lat = parseFloat(meta.latitude);
            const lng = parseFloat(meta.longitude);
            return !isNaN(lat) && !isNaN(lng);
          }).length;
          return geoCount > 0 ? (
            <span className="text-[9px] bg-blue-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
              {geoCount}
            </span>
          ) : null;
        })()}
      </button>

      {/* Timeline toggle */}
      <button
        onClick={toggleTimeline}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${showTimeline
          ? 'text-orange-400 bg-orange-950/40 border border-orange-700/50'
          : ''
          }`}
        style={!showTimeline ? { color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' } : undefined}
        title="Línea temporal"
      >
        <Clock size={14} />
        <span className="hidden sm:inline">Timeline</span>
        {(() => {
          const dateCount = nodes.filter((n) => {
            const meta = n.metadata as Record<string, string> | null;
            return meta?.date && !isNaN(new Date(meta.date).getTime());
          }).length;
          return dateCount > 0 ? (
            <span className="text-[9px] bg-orange-600 text-white rounded-full w-4 h-4 flex items-center justify-center">
              {dateCount}
            </span>
          ) : null;
        })()}
      </button>

      {/* Analysis toggle */}
      <button
        onClick={toggleAnalysisPanel}
        className={`flex items-center gap-1 px-2.5 py-1.5 text-xs rounded-lg transition-colors ${showAnalysisPanel
            ? 'text-purple-400 bg-purple-950/40 border border-purple-700/50'
            : ''
          }`}
        style={!showAnalysisPanel ? { color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' } : undefined}
        title="Panel de Análisis (Shortest Path)"
      >
        <GitCommitHorizontal size={14} />
        <span className="hidden sm:inline">Análisis</span>
      </button>

      {/* Theme selector */}
      <ThemeSelector />
    </div>
  );
}
