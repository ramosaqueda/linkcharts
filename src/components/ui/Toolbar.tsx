'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  MousePointer2, Spline, Plus, Search, Download, ImageDown,
  ChevronRight, ChevronLeft, Filter, Eye, EyeOff, Undo2, Redo2,
  LayoutGrid, Map, Clock, GitCommitHorizontal, Menu, X,
  ChevronDown, ChevronUp,
} from 'lucide-react';
import { useGraphStore } from '@/lib/store';
import { getIconComponent } from '@/lib/icon-map';
import { useReactFlow } from '@xyflow/react';
import ThemeSelector from './ThemeSelector';

export default function Toolbar({ readOnly = false }: { readOnly?: boolean }) {
  const {
    mode, setMode, graph, nodes, edges, addNode,
    hiddenNodeTypes, toggleNodeTypeVisibility, showAllNodeTypes, hideAllNodeTypes,
    canUndo, canRedo, undo, redo, applyLayout,
    showMap, toggleMap, showTimeline, toggleTimeline,
    showAnalysisPanel, toggleAnalysisPanel,
    nodeTypes, getNodeColor, getNodeLabel, getNodeIcon,
  } = useGraphStore();
  const { setCenter, getZoom } = useReactFlow();

  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showLayoutMenu, setShowLayoutMenu] = useState(false);
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [searchResults, setSearchResults] = useState<typeof nodes>([]);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-collapse on mouse leave (if not pinned)
  const handleMouseEnter = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsExpanded(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (isPinned) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsExpanded(false);
      setShowAddMenu(false);
      setShowLayoutMenu(false);
      setShowFilterMenu(false);
    }, 300);
  }, [isPinned]);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
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
        setIsExpanded(true);
        setIsPinned(true);
        setTimeout(() => {
          const input = document.getElementById('node-search-input');
          input?.focus();
        }, 100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const geoCount = nodes.filter((n) => {
    const meta = n.metadata as Record<string, string> | null;
    if (!meta) return false;
    const lat = parseFloat(meta.latitude);
    const lng = parseFloat(meta.longitude);
    return !isNaN(lat) && !isNaN(lng);
  }).length;

  const dateCount = nodes.filter((n) => {
    const meta = n.metadata as Record<string, string> | null;
    return meta?.date && !isNaN(new Date(meta.date).getTime());
  }).length;

  return (
    <div
      ref={sidebarRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`absolute left-0 top-0 h-full z-50 flex flex-col backdrop-blur-xl border-r shadow-2xl font-mono sidebar-transition ${
        isExpanded ? 'sidebar-expanded' : 'sidebar-collapsed'
      }`}
      style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-3 border-b" style={{ borderColor: 'var(--th-border)' }}>
        {isExpanded ? (
          <>
            <div className="flex items-center gap-2 min-w-0">
              <Menu size={18} style={{ color: 'var(--th-text-muted)' }} className="flex-shrink-0" />
              <span className="text-xs font-medium truncate" style={{ color: 'var(--th-text-primary)' }}>
                {graph?.name || 'Grafo'}
              </span>
            </div>
            <button
              onClick={() => setIsPinned(!isPinned)}
              className="p-1 rounded transition-colors hover:bg-[var(--th-bg-hover)]"
              title={isPinned ? 'Desfijar menú' : 'Fijar menú abierto'}
            >
              {isPinned ? (
                <X size={14} style={{ color: 'var(--th-text-muted)' }} />
              ) : (
                <ChevronLeft size={14} style={{ color: 'var(--th-text-muted)' }} />
              )}
            </button>
          </>
        ) : (
          <button
            onClick={() => { setIsExpanded(true); setIsPinned(true); }}
            className="w-full flex justify-center p-1"
          >
            <ChevronRight size={18} style={{ color: 'var(--th-text-muted)' }} />
          </button>
        )}
      </div>

      {/* Case info badge */}
      {graph?.caseNumber && isExpanded && (
        <div className="px-3 py-2 border-b" style={{ borderColor: 'var(--th-border)' }}>
          <span className="text-[10px] px-2 py-1 rounded" style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-input)' }}>
            Caso: {graph.caseNumber}
          </span>
        </div>
      )}

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Mode selection */}
        {!readOnly && (
          <>
            {isExpanded && <div className="sidebar-section-title">Modo</div>}
            <div className="px-2 space-y-1">
              <button
                onClick={() => setMode('select')}
                className={`sidebar-item w-full relative ${mode === 'select' ? 'active' : ''}`}
              >
                <span className="sidebar-item-icon"><MousePointer2 size={16} /></span>
                <span className="sidebar-item-label">Seleccionar</span>
                {!isExpanded && <span className="sidebar-tooltip">Seleccionar</span>}
              </button>
              <button
                onClick={() => setMode('connect')}
                className={`sidebar-item w-full relative ${mode === 'connect' ? 'active' : ''}`}
                style={mode === 'connect' ? { backgroundColor: '#16a34a' } : undefined}
              >
                <span className="sidebar-item-icon"><Spline size={16} /></span>
                <span className="sidebar-item-label">Conectar</span>
                {!isExpanded && <span className="sidebar-tooltip">Conectar</span>}
              </button>
            </div>
          </>
        )}

        {/* Edit actions */}
        {!readOnly && (
          <>
            <div className="sidebar-divider" />
            {isExpanded && <div className="sidebar-section-title">Editar</div>}
            <div className="px-2 space-y-1">
              <button
                onClick={() => undo()}
                disabled={!canUndo}
                className="sidebar-item w-full relative disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="sidebar-item-icon"><Undo2 size={16} /></span>
                <span className="sidebar-item-label">Deshacer</span>
                {!isExpanded && <span className="sidebar-tooltip">Deshacer (Ctrl+Z)</span>}
              </button>
              <button
                onClick={() => redo()}
                disabled={!canRedo}
                className="sidebar-item w-full relative disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <span className="sidebar-item-icon"><Redo2 size={16} /></span>
                <span className="sidebar-item-label">Rehacer</span>
                {!isExpanded && <span className="sidebar-tooltip">Rehacer (Ctrl+Shift+Z)</span>}
              </button>
            </div>
          </>
        )}

        {/* Add nodes */}
        {!readOnly && (
          <>
            <div className="sidebar-divider" />
            {isExpanded && <div className="sidebar-section-title">Agregar</div>}
            <div className="px-2">
              <button
                onClick={() => setShowAddMenu(!showAddMenu)}
                className="sidebar-item w-full relative"
              >
                <span className="sidebar-item-icon"><Plus size={16} /></span>
                <span className="sidebar-item-label flex-1 flex items-center justify-between">
                  Agregar nodo
                  {showAddMenu ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
                {!isExpanded && <span className="sidebar-tooltip">Agregar nodo</span>}
              </button>
              <div className={`sidebar-submenu ${showAddMenu && isExpanded ? 'open' : ''}`}>
                <div className="pl-4 py-1 space-y-1">
                  {nodeTypes.map((nt) => {
                    const Icon = getIconComponent(nt.icon);
                    return (
                      <button
                        key={nt.name}
                        onClick={() => handleAddNode(nt.name)}
                        className="sidebar-item w-full text-xs"
                      >
                        <span className="sidebar-item-icon"><Icon size={14} style={{ color: nt.color }} /></span>
                        <span className="sidebar-item-label">{nt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Layout */}
        {!readOnly && (
          <>
            <div className="px-2 mt-1">
              <button
                onClick={() => setShowLayoutMenu(!showLayoutMenu)}
                className="sidebar-item w-full relative"
              >
                <span className="sidebar-item-icon"><LayoutGrid size={16} /></span>
                <span className="sidebar-item-label flex-1 flex items-center justify-between">
                  Layout
                  {showLayoutMenu ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </span>
                {!isExpanded && <span className="sidebar-tooltip">Layout automático</span>}
              </button>
              <div className={`sidebar-submenu ${showLayoutMenu && isExpanded ? 'open' : ''}`}>
                <div className="pl-4 py-1 space-y-1">
                  {([
                    { dir: 'TB' as const, label: 'Arriba → Abajo', icon: '↓' },
                    { dir: 'LR' as const, label: 'Izquierda → Derecha', icon: '→' },
                    { dir: 'BT' as const, label: 'Abajo → Arriba', icon: '↑' },
                    { dir: 'RL' as const, label: 'Derecha → Izquierda', icon: '←' },
                  ]).map(({ dir, label, icon }) => (
                    <button
                      key={dir}
                      onClick={() => { applyLayout(dir); setShowLayoutMenu(false); }}
                      className="sidebar-item w-full text-xs"
                    >
                      <span className="sidebar-item-icon text-sm">{icon}</span>
                      <span className="sidebar-item-label">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Filter */}
        <div className="sidebar-divider" />
        {isExpanded && <div className="sidebar-section-title">Filtros</div>}
        <div className="px-2">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`sidebar-item w-full relative ${hiddenNodeTypes.size > 0 ? 'text-amber-400' : ''}`}
          >
            <span className="sidebar-item-icon">
              <Filter size={16} />
              {hiddenNodeTypes.size > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-amber-600 text-white rounded-full w-3 h-3 flex items-center justify-center">
                  {hiddenNodeTypes.size}
                </span>
              )}
            </span>
            <span className="sidebar-item-label flex-1 flex items-center justify-between">
              Filtrar tipos
              {showFilterMenu ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </span>
            {!isExpanded && <span className="sidebar-tooltip">Filtrar por tipo</span>}
          </button>
          <div className={`sidebar-submenu ${showFilterMenu && isExpanded ? 'open' : ''}`}>
            <div className="pl-2 py-1 space-y-1">
              <div className="flex items-center justify-between px-2 py-1 text-[10px]" style={{ color: 'var(--th-text-dimmed)' }}>
                <button onClick={showAllNodeTypes} style={{ color: 'var(--th-accent)' }}>Todos</button>
                <span>|</span>
                <button onClick={hideAllNodeTypes}>Ninguno</button>
              </div>
              {nodeTypes.map((nt) => {
                const Icon = getIconComponent(nt.icon);
                const isHidden = hiddenNodeTypes.has(nt.name);
                const count = nodes.filter((n) => n.type === nt.name).length;
                return (
                  <button
                    key={nt.name}
                    onClick={() => toggleNodeTypeVisibility(nt.name)}
                    className={`sidebar-item w-full text-xs ${isHidden ? 'opacity-50' : ''}`}
                  >
                    <span className="sidebar-item-icon">
                      {isHidden ? <EyeOff size={12} /> : <Eye size={12} />}
                    </span>
                    <Icon size={14} style={{ color: isHidden ? 'var(--th-text-faint)' : nt.color }} className="flex-shrink-0" />
                    <span className={`sidebar-item-label ${isHidden ? 'line-through' : ''}`}>
                      {nt.label}
                      {count > 0 && <span className="ml-1 opacity-50">({count})</span>}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="sidebar-divider" />
        {isExpanded && <div className="sidebar-section-title">Buscar</div>}
        <div className="px-2">
          {isExpanded ? (
            <div className="relative">
              <div className="flex items-center rounded-lg px-2 py-1.5" style={{ backgroundColor: 'var(--th-bg-input)' }}>
                <Search size={14} style={{ color: 'var(--th-text-dimmed)' }} />
                <input
                  id="node-search-input"
                  type="text"
                  placeholder="Buscar nodos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-transparent border-none outline-none text-xs ml-1.5 w-full font-mono"
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
                        className="sidebar-item w-full text-xs"
                      >
                        <Icon size={12} style={{ color: getNodeColor(node.type) }} />
                        <span className="truncate">{node.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => { setIsExpanded(true); setIsPinned(true); setTimeout(() => document.getElementById('node-search-input')?.focus(), 100); }}
              className="sidebar-item w-full relative"
            >
              <span className="sidebar-item-icon"><Search size={16} /></span>
              <span className="sidebar-tooltip">Buscar (Ctrl+F)</span>
            </button>
          )}
        </div>

        {/* Panels */}
        <div className="sidebar-divider" />
        {isExpanded && <div className="sidebar-section-title">Paneles</div>}
        <div className="px-2 space-y-1">
          <button
            onClick={toggleMap}
            className={`sidebar-item w-full relative ${showMap ? 'text-blue-400' : ''}`}
            style={showMap ? { backgroundColor: 'rgba(37, 99, 235, 0.2)' } : undefined}
          >
            <span className="sidebar-item-icon relative">
              <Map size={16} />
              {geoCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-blue-600 text-white rounded-full w-3 h-3 flex items-center justify-center">
                  {geoCount}
                </span>
              )}
            </span>
            <span className="sidebar-item-label">Mapa</span>
            {!isExpanded && <span className="sidebar-tooltip">Mapa</span>}
          </button>
          <button
            onClick={toggleTimeline}
            className={`sidebar-item w-full relative ${showTimeline ? 'text-orange-400' : ''}`}
            style={showTimeline ? { backgroundColor: 'rgba(234, 88, 12, 0.2)' } : undefined}
          >
            <span className="sidebar-item-icon relative">
              <Clock size={16} />
              {dateCount > 0 && (
                <span className="absolute -top-1 -right-1 text-[8px] bg-orange-600 text-white rounded-full w-3 h-3 flex items-center justify-center">
                  {dateCount}
                </span>
              )}
            </span>
            <span className="sidebar-item-label">Timeline</span>
            {!isExpanded && <span className="sidebar-tooltip">Timeline</span>}
          </button>
          <button
            onClick={toggleAnalysisPanel}
            className={`sidebar-item w-full relative ${showAnalysisPanel ? 'text-purple-400' : ''}`}
            style={showAnalysisPanel ? { backgroundColor: 'rgba(147, 51, 234, 0.2)' } : undefined}
          >
            <span className="sidebar-item-icon"><GitCommitHorizontal size={16} /></span>
            <span className="sidebar-item-label">Análisis</span>
            {!isExpanded && <span className="sidebar-tooltip">Análisis</span>}
          </button>
        </div>

        {/* Export */}
        <div className="sidebar-divider" />
        {isExpanded && <div className="sidebar-section-title">Exportar</div>}
        <div className="px-2 space-y-1">
          <button onClick={handleExport} className="sidebar-item w-full relative">
            <span className="sidebar-item-icon"><Download size={16} /></span>
            <span className="sidebar-item-label">Exportar JSON</span>
            {!isExpanded && <span className="sidebar-tooltip">Exportar JSON</span>}
          </button>
          <button onClick={handleExportPNG} className="sidebar-item w-full relative">
            <span className="sidebar-item-icon"><ImageDown size={16} /></span>
            <span className="sidebar-item-label">Exportar PNG</span>
            {!isExpanded && <span className="sidebar-tooltip">Exportar PNG</span>}
          </button>
        </div>
      </div>

      {/* Footer - Theme selector */}
      <div className="border-t p-2" style={{ borderColor: 'var(--th-border)' }}>
        <div className={`flex ${isExpanded ? 'justify-between items-center' : 'justify-center'}`}>
          {isExpanded && (
            <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-faint)' }}>
              Tema
            </span>
          )}
          <ThemeSelector compact={!isExpanded} />
        </div>
      </div>
    </div>
  );
}
