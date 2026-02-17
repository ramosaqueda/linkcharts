'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/lib/store';
import { findShortestPath, calculateDegreeCentrality, calculateBetweennessCentrality, detectCommunities } from '@/lib/analysis/graph-utils';
import { Play, RotateCcw, X, GitCommitHorizontal } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export default function AnalysisPanel() {
    const { nodes, edges, selectedNodeId, toggleAnalysisPanel, setHighlightedPath, clearHighlightedPath, analysisSourceNodeId, clearAnalysisSourceNodeId } = useGraphStore();
    // const { getNodes, getEdges } = useReactFlow(); // Not needed if we use store nodes/edges which are synced
    const [algorithm, setAlgorithm] = useState<'shortest-path' | 'degree-centrality' | 'betweenness-centrality' | 'louvain-communities'>('shortest-path');
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [resultPath, setResultPath] = useState<string[] | null>(null);
    const [centralityResults, setCentralityResults] = useState<{ nodeId: string; score: number }[] | null>(null);
    const [communityResults, setCommunityResults] = useState<Record<string, string[]> | null>(null);
    const [error, setError] = useState<string | null>(null);

    // const nodes = getNodes(); // Use store nodes instead for consistency with selection
    // const edges = getEdges(); // Use store edges instead

    const handleRunAnalysis = () => {
        setError(null);
        setResultPath(null);
        setCentralityResults(null);
        setCommunityResults(null);
        clearHighlightedPath();

        if (algorithm === 'shortest-path') {
            if (!sourceId || !targetId) {
                setError('Selecciona nodo origen y destino.');
                return;
            }
            if (sourceId === targetId) {
                setError('El origen y el destino deben ser diferentes.');
                return;
            }

            const path = findShortestPath(nodes, edges, sourceId, targetId);

            if (path) {
                setResultPath(path);
                setHighlightedPath(path);
            } else {
                setError('No se encontró un camino entre estos nodos.');
            }
        } else if (algorithm === 'degree-centrality') {
            const results = calculateDegreeCentrality(nodes, edges);
            setCentralityResults(results.slice(0, 10)); // Top 10
        } else if (algorithm === 'betweenness-centrality') {
            const results = calculateBetweennessCentrality(nodes, edges);
            setCentralityResults(results.slice(0, 10)); // Top 10
        } else if (algorithm === 'louvain-communities') {
            const results = detectCommunities(nodes, edges);
            setCommunityResults(results);
        }
    };

    const handleClear = () => {
        setSourceId('');
        setTargetId('');
        setResultPath(null);
        setCentralityResults(null);
        setCommunityResults(null);
        setError(null);
        clearHighlightedPath();
    };

    const setSourceFromSelection = () => {
        if (selectedNodeId) setSourceId(selectedNodeId);
    };

    const setTargetFromSelection = () => {
        if (selectedNodeId) setTargetId(selectedNodeId);
    };

    // Pre-fill source when opened from context menu
    useEffect(() => {
        if (analysisSourceNodeId) {
            setSourceId(analysisSourceNodeId);
            setAlgorithm('shortest-path');
            clearAnalysisSourceNodeId();
        }
    }, [analysisSourceNodeId, clearAnalysisSourceNodeId]);

    // Filtrar nodos para los selects (opcional: ordenar alfabéticamente)
    const sortedNodes = [...nodes].sort((a, b) => (a.label || a.id).localeCompare(b.label || b.id));

    return (
        <div className="absolute top-20 right-4 w-80 backdrop-blur-2xl border rounded-xl shadow-2xl z-40 overflow-hidden font-mono animate-slideIn" style={{ backgroundColor: 'var(--th-bg-overlay)', borderColor: 'var(--th-border)' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--th-border)' }}>
                <div className="flex items-center gap-2">
                    <GitCommitHorizontal size={16} className="text-blue-400" />
                    <span className="text-xs uppercase tracking-wider font-semibold" style={{ color: 'var(--th-text-primary)' }}>
                        Análisis de Grafo
                    </span>
                </div>
                <button onClick={toggleAnalysisPanel} className="transition-colors hover:text-red-400" style={{ color: 'var(--th-text-muted)' }}>
                    <X size={16} />
                </button>
            </div>

            <div className="p-4 space-y-4">
                {/* Algorithm Selector */}
                <div>
                    <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                        Algoritmo
                    </label>
                    <select
                        value={algorithm}
                        onChange={(e) => setAlgorithm(e.target.value as any)}
                        className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 transition-colors font-mono appearance-none cursor-pointer"
                        style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                    >
                        <option value="shortest-path">Camino Más Corto (Shortest Path)</option>
                        <option value="degree-centrality">Centralidad de Grado (Degree)</option>
                        <option value="betweenness-centrality">Centralidad de Intermediación (Betweenness)</option>
                        <option value="louvain-communities">Detección de Comunidades (Louvain)</option>
                    </select>
                </div>

                {/* Shortest Path Inputs */}
                {algorithm === 'shortest-path' && (
                    <div className="space-y-3">
                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>Origen</label>
                                <button
                                    onClick={setSourceFromSelection}
                                    disabled={!selectedNodeId}
                                    className="text-[9px] px-1.5 py-0.5 rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                                    style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-secondary)' }}
                                >
                                    Usar selección
                                </button>
                            </div>
                            <select
                                value={sourceId}
                                onChange={(e) => setSourceId(e.target.value)}
                                className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 transition-colors bg-transparent"
                                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                            >
                                <option value="">Seleccionar nodo...</option>
                                {sortedNodes.map(n => (
                                    <option key={n.id} value={n.id}>{n.label || n.id}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2 justify-center">
                            <div className="w-px h-4 bg-gray-500/30"></div>
                        </div>

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>Destino</label>
                                <button
                                    onClick={setTargetFromSelection}
                                    disabled={!selectedNodeId}
                                    className="text-[9px] px-1.5 py-0.5 rounded border transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
                                    style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-secondary)' }}
                                >
                                    Usar selección
                                </button>
                            </div>
                            <select
                                value={targetId}
                                onChange={(e) => setTargetId(e.target.value)}
                                className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 transition-colors bg-transparent"
                                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                            >
                                <option value="">Seleccionar nodo...</option>
                                {sortedNodes.map(n => (
                                    <option key={n.id} value={n.id}>{n.label || n.id}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {(algorithm === 'degree-centrality' || algorithm === 'betweenness-centrality' || algorithm === 'louvain-communities') && (
                    <div className="text-[10px] text-gray-400 text-center italic">
                        {algorithm === 'degree-centrality'
                            ? 'Identifica los nodos con más conexiones directas (Hubs).'
                            : algorithm === 'betweenness-centrality'
                                ? 'Identifica los nodos que conectan diferentes grupos (Puentes).'
                                : 'Agrupa nodos densamente conectados entre sí (Células/Comunidades).'}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2 border-t" style={{ borderColor: 'var(--th-border)' }}>
                    <button
                        onClick={handleRunAnalysis}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors font-semibold shadow-lg shadow-blue-900/20"
                    >
                        <Play size={12} fill="currentColor" />
                        Ejecutar
                    </button>
                    <button
                        onClick={handleClear}
                        className="px-3 py-2 text-xs border rounded-lg transition-colors hover:bg-white/5"
                        style={{ borderColor: 'var(--th-border)', color: 'var(--th-text-muted)' }}
                        title="Limpiar resultados"
                    >
                        <RotateCcw size={14} />
                    </button>
                </div>

                {/* Results Area */}
                {error && (
                    <div className="p-2 rounded bg-red-950/30 border border-red-900/50 text-red-300 text-[10px]">
                        {error}
                    </div>
                )}

                {resultPath && (
                    <div className="space-y-2 animate-fadeIn">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-green-400">
                            Camino encontrado: {resultPath.length - 1} saltos
                        </div>
                        <div className="max-h-40 overflow-y-auto space-y-1 p-1 rounded" style={{ backgroundColor: 'var(--th-bg-input)' }}>
                            {resultPath.map((nodeId, idx) => {
                                const node = nodes.find(n => n.id === nodeId);
                                return (
                                    <div key={nodeId} className="flex items-center gap-2 text-xs p-1.5 rounded hover:bg-white/5">
                                        <span className="text-[9px] w-4 text-gray-500 font-mono">
                                            {idx === 0 ? 'DES' : idx === resultPath.length - 1 ? 'HAS' : idx}
                                        </span>
                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                        <span className="truncate" style={{ color: 'var(--th-text-primary)' }}>
                                            {node?.label || nodeId}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {centralityResults && (
                    <div className="space-y-2 animate-fadeIn">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-green-400">
                            Top 10 Nodos Importantes
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-1 p-1 rounded" style={{ backgroundColor: 'var(--th-bg-input)' }}>
                            {centralityResults.map((result, idx) => {
                                const node = nodes.find(n => n.id === result.nodeId);
                                const maxScore = centralityResults[0]?.score || 1;
                                const barWidth = (result.score / maxScore) * 100;

                                return (
                                    <div key={result.nodeId} className="flex flex-col gap-1 p-1.5 rounded hover:bg-white/5">
                                        <div className="flex justify-between items-center text-xs">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <span className="text-[9px] w-3 text-gray-500 font-mono">#{idx + 1}</span>
                                                <span className="truncate" style={{ color: 'var(--th-text-primary)' }}>
                                                    {node?.label || result.nodeId}
                                                </span>
                                            </div>
                                            <span className="text-[10px] font-mono" style={{ color: 'var(--th-text-muted)' }}>
                                                {result.score.toFixed(2)}
                                            </span>
                                        </div>
                                        <div className="h-1 bg-gray-700 rounded-full overflow-hidden w-full">
                                            <div
                                                className="h-full bg-blue-500 rounded-full"
                                                style={{ width: `${barWidth}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {communityResults && (
                    <div className="space-y-2 animate-fadeIn">
                        <div className="text-[10px] uppercase tracking-wider font-semibold text-green-400">
                            Comunidades Detectadas: {Object.keys(communityResults).length}
                        </div>
                        <div className="max-h-60 overflow-y-auto space-y-2 p-1 rounded" style={{ backgroundColor: 'var(--th-bg-input)' }}>
                            {Object.entries(communityResults)
                                .sort((a, b) => b[1].length - a[1].length) // Ordenar por tamaño
                                .map(([commId, nodeIds]) => (
                                    <div key={commId} className="bg-white/5 rounded p-2 text-xs">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="font-semibold text-[10px] uppercase text-purple-300">Grupo {commId}</span>
                                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10">{nodeIds.length} nodos</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1">
                                            {nodeIds.slice(0, 10).map(nid => { // Mostrar primeros 10
                                                const node = nodes.find(n => n.id === nid);
                                                return (
                                                    <span
                                                        key={nid}
                                                        className="inline-block px-1.5 py-0.5 rounded text-[10px] bg-purple-900/30 text-purple-200 truncate max-w-full"
                                                    >
                                                        {node?.label || nid}
                                                    </span>
                                                )
                                            })}
                                            {nodeIds.length > 10 && (
                                                <span className="text-[9px] text-gray-500">+{nodeIds.length - 10} más</span>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => setHighlightedPath(nodeIds)}
                                            className="mt-1.5 w-full py-1 text-[9px] text-center border border-purple-500/30 rounded hover:bg-purple-500/20 text-purple-300 transition-colors"
                                        >
                                            Resaltar grupo
                                        </button>
                                    </div>
                                ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
