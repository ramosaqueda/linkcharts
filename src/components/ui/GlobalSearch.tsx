'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  X,
  Network,
  Circle,
  Hash,
  Globe,
  Lock,
  ArrowRight,
  Loader2,
  FileText,
} from 'lucide-react';
import { getIconComponent } from '@/lib/icon-map';

interface GraphResult {
  id: string;
  name: string;
  description: string | null;
  caseNumber: string | null;
  isPublic: boolean;
  isOwner: boolean;
  ownerName: string;
  nodeCount: number;
  edgeCount: number;
}

interface NodeResult {
  id: string;
  label: string;
  type: string;
  graphId: string;
  graphName: string;
  matchingField: string | null;
}

interface SearchResults {
  graphs: GraphResult[];
  nodes: NodeResult[];
}

interface GlobalSearchProps {
  nodeTypes?: { name: string; icon: string; color: string }[];
}

export default function GlobalSearch({ nodeTypes = [] }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const getNodeTypeInfo = (typeName: string) => {
    const type = nodeTypes.find((t) => t.name === typeName);
    return {
      icon: type?.icon || 'Circle',
      color: type?.color || '#a855f7',
    };
  };

  const search = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null);
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data);
      }
    } catch {
      // Silent error
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length >= 2) {
      debounceRef.current = setTimeout(() => {
        search(query.trim());
      }, 300);
    } else {
      setResults(null);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, search]);

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Keyboard shortcut (Ctrl+K or Cmd+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
        setTimeout(() => inputRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setIsOpen(false);
        setQuery('');
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleGraphClick = (graphId: string) => {
    setIsOpen(false);
    setQuery('');
    router.push(`/editor/${graphId}`);
  };

  const handleNodeClick = (graphId: string, nodeId: string) => {
    setIsOpen(false);
    setQuery('');
    // Navigate to graph with node selection
    router.push(`/editor/${graphId}?select=${nodeId}`);
  };

  const handleClear = () => {
    setQuery('');
    setResults(null);
    inputRef.current?.focus();
  };

  const hasResults = results && (results.graphs.length > 0 || results.nodes.length > 0);
  const noResults = results && results.graphs.length === 0 && results.nodes.length === 0 && query.length >= 2;

  return (
    <div ref={containerRef} className="relative">
      {/* Search Button (collapsed) */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            setTimeout(() => inputRef.current?.focus(), 50);
          }}
          className="flex items-center gap-2 px-3 py-2 text-xs border rounded-lg transition-all hover:border-blue-500/50"
          style={{
            backgroundColor: 'var(--th-bg-input)',
            borderColor: 'var(--th-border)',
            color: 'var(--th-text-muted)',
          }}
        >
          <Search size={14} />
          <span className="hidden sm:inline">Buscar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] rounded border" style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-faint)' }}>
            <span className="text-[9px]">Ctrl</span>K
          </kbd>
        </button>
      )}

      {/* Search Input (expanded) */}
      {isOpen && (
        <div
          className="absolute right-0 top-0 z-50 w-[400px] border rounded-xl shadow-2xl overflow-hidden animate-slideIn"
          style={{
            backgroundColor: 'var(--th-bg-overlay)',
            borderColor: 'var(--th-border)',
          }}
        >
          {/* Input */}
          <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: 'var(--th-border)' }}>
            {isLoading ? (
              <Loader2 size={16} className="animate-spin" style={{ color: 'var(--th-text-muted)' }} />
            ) : (
              <Search size={16} style={{ color: 'var(--th-text-muted)' }} />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar grafos, entidades, metadata..."
              className="flex-1 bg-transparent border-none outline-none text-sm font-mono"
              style={{ color: 'var(--th-text-primary)' }}
            />
            {query && (
              <button onClick={handleClear} style={{ color: 'var(--th-text-faint)' }}>
                <X size={14} />
              </button>
            )}
            <button
              onClick={() => {
                setIsOpen(false);
                setQuery('');
              }}
              className="text-[10px] px-1.5 py-0.5 rounded border"
              style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-faint)' }}
            >
              ESC
            </button>
          </div>

          {/* Results */}
          {(hasResults || noResults) && (
            <div className="max-h-[400px] overflow-y-auto">
              {noResults && (
                <div className="px-4 py-8 text-center">
                  <FileText size={24} className="mx-auto mb-2 opacity-30" style={{ color: 'var(--th-text-muted)' }} />
                  <p className="text-xs" style={{ color: 'var(--th-text-muted)' }}>
                    No se encontraron resultados para &quot;{query}&quot;
                  </p>
                </div>
              )}

              {/* Graphs */}
              {results && results.graphs.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold border-b" style={{ color: 'var(--th-text-dimmed)', borderColor: 'var(--th-border)', backgroundColor: 'var(--th-bg-tertiary)' }}>
                    <div className="flex items-center gap-1.5">
                      <Network size={10} />
                      Grafos ({results.graphs.length})
                    </div>
                  </div>
                  {results.graphs.map((graph) => (
                    <button
                      key={graph.id}
                      onClick={() => handleGraphClick(graph.id)}
                      className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors hover:bg-white/5 border-b"
                      style={{ borderColor: 'var(--th-border)' }}
                    >
                      <div className="mt-0.5">
                        {graph.isPublic ? (
                          <Globe size={14} className="text-green-400" />
                        ) : (
                          <Lock size={14} style={{ color: 'var(--th-text-faint)' }} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate" style={{ color: 'var(--th-text-primary)' }}>
                            {graph.name}
                          </span>
                          {graph.caseNumber && (
                            <span className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--th-bg-input)', color: 'var(--th-text-muted)' }}>
                              <Hash size={8} />
                              {graph.caseNumber}
                            </span>
                          )}
                        </div>
                        {graph.description && (
                          <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--th-text-dimmed)' }}>
                            {graph.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-1 text-[10px]" style={{ color: 'var(--th-text-faint)' }}>
                          <span>{graph.nodeCount} nodos</span>
                          <span>{graph.edgeCount} conexiones</span>
                          {!graph.isOwner && <span>por {graph.ownerName}</span>}
                        </div>
                      </div>
                      <ArrowRight size={14} className="mt-1" style={{ color: 'var(--th-text-faint)' }} />
                    </button>
                  ))}
                </div>
              )}

              {/* Nodes */}
              {results && results.nodes.length > 0 && (
                <div>
                  <div className="px-4 py-2 text-[10px] uppercase tracking-wider font-semibold border-b" style={{ color: 'var(--th-text-dimmed)', borderColor: 'var(--th-border)', backgroundColor: 'var(--th-bg-tertiary)' }}>
                    <div className="flex items-center gap-1.5">
                      <Circle size={10} />
                      Entidades ({results.nodes.length})
                    </div>
                  </div>
                  {results.nodes.map((node) => {
                    const typeInfo = getNodeTypeInfo(node.type);
                    const IconComponent = getIconComponent(typeInfo.icon);
                    return (
                      <button
                        key={node.id}
                        onClick={() => handleNodeClick(node.graphId, node.id)}
                        className="w-full px-4 py-3 flex items-start gap-3 text-left transition-colors hover:bg-white/5 border-b"
                        style={{ borderColor: 'var(--th-border)' }}
                      >
                        <div
                          className="mt-0.5 p-1.5 rounded-full"
                          style={{ backgroundColor: `${typeInfo.color}20` }}
                        >
                          <IconComponent size={12} style={{ color: typeInfo.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--th-text-primary)' }}>
                              {node.label}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}>
                              {node.type}
                            </span>
                          </div>
                          {node.matchingField && (
                            <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--th-accent)' }}>
                              {node.matchingField}
                            </p>
                          )}
                          <div className="flex items-center gap-1 mt-1 text-[10px]" style={{ color: 'var(--th-text-faint)' }}>
                            <Network size={10} />
                            <span className="truncate">{node.graphName}</span>
                          </div>
                        </div>
                        <ArrowRight size={14} className="mt-1" style={{ color: 'var(--th-text-faint)' }} />
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Hint when empty */}
          {!hasResults && !noResults && query.length < 2 && (
            <div className="px-4 py-6 text-center">
              <p className="text-[11px]" style={{ color: 'var(--th-text-dimmed)' }}>
                Escribe al menos 2 caracteres para buscar
              </p>
              <p className="text-[10px] mt-2" style={{ color: 'var(--th-text-faint)' }}>
                Busca por nombre, RUC, descripción o metadata de entidades
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
