'use client';

import { useState, useEffect } from 'react';
import { useGraphStore } from '@/lib/store';
import {
    findShortestPath,
    calculateDegreeCentrality,
    calculateBetweennessCentrality,
    detectCommunities,
    analyzeHierarchy,
    calculateHierarchyLayout,
    type HierarchyResult,
    type HierarchyNode,
} from '@/lib/analysis/graph-utils';
import { Play, RotateCcw, X, GitCommitHorizontal, Crown, Users, User, UserMinus, LayoutTemplate } from 'lucide-react';
import { useReactFlow } from '@xyflow/react';

export default function AnalysisPanel() {
    const { nodes, edges, selectedNodeId, toggleAnalysisPanel, setHighlightedPath, clearHighlightedPath, analysisSourceNodeId, clearAnalysisSourceNodeId, applyHierarchyLayout } = useGraphStore();
    const { fitView } = useReactFlow();
    const [algorithm, setAlgorithm] = useState<'shortest-path' | 'degree-centrality' | 'betweenness-centrality' | 'louvain-communities' | 'hierarchy'>('shortest-path');
    const [sourceId, setSourceId] = useState<string>('');
    const [targetId, setTargetId] = useState<string>('');
    const [leaderCount, setLeaderCount] = useState<number>(3);
    const [resultPath, setResultPath] = useState<string[] | null>(null);
    const [centralityResults, setCentralityResults] = useState<{ nodeId: string; score: number }[] | null>(null);
    const [communityResults, setCommunityResults] = useState<Record<string, string[]> | null>(null);
    const [hierarchyResults, setHierarchyResults] = useState<HierarchyResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    // const nodes = getNodes(); // Use store nodes instead for consistency with selection
    // const edges = getEdges(); // Use store edges instead

    const handleRunAnalysis = () => {
        setError(null);
        setResultPath(null);
        setCentralityResults(null);
        setCommunityResults(null);
        setHierarchyResults(null);
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
        } else if (algorithm === 'hierarchy') {
            if (nodes.length < 2) {
                setError('Se necesitan al menos 2 nodos para analizar jerarquía.');
                return;
            }
            const results = analyzeHierarchy(nodes, edges, leaderCount);
            setHierarchyResults(results);
            // Highlight leaders
            if (results.leaders.length > 0) {
                setHighlightedPath(results.leaders);
            }
        }
    };

    const handleClear = () => {
        setSourceId('');
        setTargetId('');
        setResultPath(null);
        setCentralityResults(null);
        setCommunityResults(null);
        setHierarchyResults(null);
        setError(null);
        clearHighlightedPath();
    };

    const handleApplyHierarchyLayout = async () => {
        if (!hierarchyResults) return;
        const positions = calculateHierarchyLayout(hierarchyResults, {
            nodeWidth: 150,
            nodeHeight: 80,
            levelGap: 180,
            nodeGap: 100,
            startX: 100,
            startY: 50,
        });
        await applyHierarchyLayout(positions);
        setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
    };

    const getRoleIcon = (role: HierarchyNode['role']) => {
        switch (role) {
            case 'leader': return <Crown size={12} className="text-yellow-400" />;
            case 'lieutenant': return <Users size={12} className="text-orange-400" />;
            case 'operative': return <User size={12} className="text-blue-400" />;
            case 'peripheral': return <UserMinus size={12} className="text-gray-400" />;
        }
    };

    const getRoleLabel = (role: HierarchyNode['role']) => {
        switch (role) {
            case 'leader': return 'Líder';
            case 'lieutenant': return 'Teniente';
            case 'operative': return 'Operativo';
            case 'peripheral': return 'Periférico';
        }
    };

    const getRoleColor = (role: HierarchyNode['role']) => {
        switch (role) {
            case 'leader': return 'bg-yellow-900/30 border-yellow-700/50 text-yellow-300';
            case 'lieutenant': return 'bg-orange-900/30 border-orange-700/50 text-orange-300';
            case 'operative': return 'bg-blue-900/30 border-blue-700/50 text-blue-300';
            case 'peripheral': return 'bg-gray-800/30 border-gray-700/50 text-gray-400';
        }
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
                        <option value="hierarchy">Estructura Jerárquica (Bandas)</option>
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

                {algorithm === 'hierarchy' && (
                    <div className="space-y-3">
                        <div className="text-[10px] text-gray-400 text-center italic">
                            Identifica líderes y estructura de mando basándose en centralidad combinada.
                        </div>
                        <div className="flex flex-col gap-1">
                            <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>
                                Número de líderes a detectar
                            </label>
                            <input
                                type="number"
                                min={1}
                                max={10}
                                value={leaderCount}
                                onChange={(e) => setLeaderCount(Math.max(1, Math.min(10, parseInt(e.target.value) || 1)))}
                                className="w-full border rounded-lg px-2 py-1.5 text-xs outline-none focus:border-blue-500 transition-colors"
                                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                            />
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

                {hierarchyResults && (
                    <div className="space-y-3 animate-fadeIn">
                        {/* Summary */}
                        <div className="flex items-center justify-between">
                            <div className="text-[10px] uppercase tracking-wider font-semibold text-yellow-400">
                                Estructura Jerárquica
                            </div>
                            <button
                                onClick={handleApplyHierarchyLayout}
                                className="flex items-center gap-1.5 px-2 py-1 text-[9px] bg-yellow-600 hover:bg-yellow-700 text-white rounded transition-colors"
                                title="Reorganizar nodos en layout jerárquico"
                            >
                                <LayoutTemplate size={10} />
                                Aplicar Layout
                            </button>
                        </div>

                        {/* Leaders */}
                        <div className="rounded p-2 border" style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)' }}>
                            <div className="flex items-center gap-1.5 mb-2">
                                <Crown size={12} className="text-yellow-400" />
                                <span className="text-[10px] uppercase tracking-wider font-semibold text-yellow-300">
                                    Líderes Identificados ({hierarchyResults.leaders.length})
                                </span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                                {hierarchyResults.leaders.map(leaderId => {
                                    const node = nodes.find(n => n.id === leaderId);
                                    const hNode = hierarchyResults.nodes.find(h => h.nodeId === leaderId);
                                    return (
                                        <button
                                            key={leaderId}
                                            onClick={() => setHighlightedPath([leaderId])}
                                            className="flex items-center gap-1 px-2 py-1 rounded border text-[10px] bg-yellow-900/30 border-yellow-700/50 text-yellow-200 hover:bg-yellow-800/40 transition-colors"
                                        >
                                            <Crown size={10} />
                                            <span className="truncate max-w-[100px]">{node?.label || leaderId}</span>
                                            <span className="text-[8px] text-yellow-400/70">
                                                {((hNode?.leadershipScore || 0) * 100).toFixed(0)}%
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Levels breakdown */}
                        <div className="rounded p-2 border" style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)' }}>
                            <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--th-text-muted)' }}>
                                Niveles Jerárquicos
                            </div>
                            <div className="space-y-1.5 max-h-32 overflow-y-auto">
                                {Object.entries(hierarchyResults.levels)
                                    .filter(([level]) => parseInt(level) >= 0)
                                    .sort((a, b) => parseInt(a[0]) - parseInt(b[0]))
                                    .map(([level, nodeIds]) => {
                                        const levelNum = parseInt(level);
                                        const role = levelNum === 0 ? 'leader' : levelNum === 1 ? 'lieutenant' : levelNum <= 3 ? 'operative' : 'peripheral';
                                        return (
                                            <div
                                                key={level}
                                                className="flex items-center justify-between text-[10px] py-1 px-2 rounded hover:bg-white/5 cursor-pointer"
                                                onClick={() => setHighlightedPath(nodeIds)}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {getRoleIcon(role as HierarchyNode['role'])}
                                                    <span style={{ color: 'var(--th-text-primary)' }}>
                                                        Nivel {level}
                                                    </span>
                                                    <span className="text-[9px]" style={{ color: 'var(--th-text-dimmed)' }}>
                                                        ({getRoleLabel(role as HierarchyNode['role'])})
                                                    </span>
                                                </div>
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10">
                                                    {nodeIds.length} nodos
                                                </span>
                                            </div>
                                        );
                                    })}
                                {hierarchyResults.levels[-1] && hierarchyResults.levels[-1].length > 0 && (
                                    <div
                                        className="flex items-center justify-between text-[10px] py-1 px-2 rounded hover:bg-white/5 cursor-pointer opacity-60"
                                        onClick={() => setHighlightedPath(hierarchyResults.levels[-1])}
                                    >
                                        <div className="flex items-center gap-2">
                                            <UserMinus size={12} className="text-gray-500" />
                                            <span style={{ color: 'var(--th-text-muted)' }}>
                                                Desconectados
                                            </span>
                                        </div>
                                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10">
                                            {hierarchyResults.levels[-1].length} nodos
                                        </span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Detailed node list by role */}
                        <div className="rounded p-2 border" style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)' }}>
                            <div className="text-[10px] uppercase tracking-wider font-semibold mb-2" style={{ color: 'var(--th-text-muted)' }}>
                                Miembros por Rol
                            </div>
                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                {(['leader', 'lieutenant', 'operative', 'peripheral'] as const).map(role => {
                                    const roleNodes = hierarchyResults.nodes.filter(n => n.role === role);
                                    if (roleNodes.length === 0) return null;
                                    return (
                                        <div key={role} className="space-y-1">
                                            <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-wider">
                                                {getRoleIcon(role)}
                                                <span className={getRoleColor(role).split(' ').pop()}>
                                                    {getRoleLabel(role)} ({roleNodes.length})
                                                </span>
                                            </div>
                                            <div className="flex flex-wrap gap-1 pl-4">
                                                {roleNodes.slice(0, 8).map(hNode => (
                                                    <button
                                                        key={hNode.nodeId}
                                                        onClick={() => setHighlightedPath([hNode.nodeId])}
                                                        className={`px-1.5 py-0.5 rounded border text-[9px] transition-colors hover:brightness-110 ${getRoleColor(role)}`}
                                                    >
                                                        {hNode.label}
                                                    </button>
                                                ))}
                                                {roleNodes.length > 8 && (
                                                    <span className="text-[9px] text-gray-500 self-center">
                                                        +{roleNodes.length - 8} más
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
