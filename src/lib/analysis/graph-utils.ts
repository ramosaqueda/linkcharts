import Graph from 'graphology';
import { bidirectional, singleSource } from 'graphology-shortest-path/unweighted';
import { degreeCentrality } from 'graphology-metrics/centrality/degree';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import type { Node as DbNode, Edge as DbEdge } from '@/lib/types';

export interface CentralityResult {
    nodeId: string;
    score: number;
}

export interface HierarchyNode {
    nodeId: string;
    label: string;
    level: number;
    role: 'leader' | 'lieutenant' | 'operative' | 'peripheral';
    leadershipScore: number;
    parentId: string | null;
    childrenIds: string[];
}

export interface HierarchyResult {
    nodes: HierarchyNode[];
    levels: Record<number, string[]>;
    leaders: string[];
    chains: string[][];
}

/**
 * Calcula la centralidad de grado (Degree Centrality) para todos los nodos.
 * Retorna una lista ordenada de nodos y su puntuación.
 */
export function calculateDegreeCentrality(nodes: DbNode[], edges: DbEdge[]): CentralityResult[] {
    const graph = buildGraph({ nodes, edges });
    const scores = degreeCentrality(graph);

    return Object.entries(scores)
        .map(([nodeId, score]) => ({ nodeId, score }))
        .sort((a, b) => b.score - a.score);
}

/**
 * Calcula la centralidad de intermediación (Betweenness Centrality).
 * Identifica nodos "puente" o "gatekeepers".
 */
export function calculateBetweennessCentrality(nodes: DbNode[], edges: DbEdge[]): CentralityResult[] {
    const graph = buildGraph({ nodes, edges });
    const scores = betweennessCentrality(graph);

    return Object.entries(scores)
        .map(([nodeId, score]) => ({ nodeId, score }))
        .sort((a, b) => b.score - a.score);
}

/**
 * Detecta comunidades usando el algoritmo de Louvain.
 * Retorna un objeto donde las claves son IDs de comunidad y los valores son listas de IDs de nodos.
 */
import louvain from 'graphology-communities-louvain';

export function detectCommunities(nodes: DbNode[], edges: DbEdge[]): Record<string, string[]> {
    const graph = buildGraph({ nodes, edges });
    const communities = louvain(graph); // { nodeId: communityId }

    const groups: Record<string, string[]> = {};
    Object.entries(communities).forEach(([nodeId, communityId]) => {
        const commIdStr = String(communityId);
        if (!groups[commIdStr]) {
            groups[commIdStr] = [];
        }
        groups[commIdStr].push(nodeId);
    });

    return groups;
}
interface GraphData {
    nodes: DbNode[];
    edges: DbEdge[];
}

/**
 * Convierte los nodos y edges del store a una instancia de Graphology.
 */
export function buildGraph({ nodes, edges }: GraphData): Graph {
    const graph = new Graph({ type: 'mixed' }); // 'mixed' permite aristas dirigidas y no dirigidas

    nodes.forEach((node) => {
        if (!graph.hasNode(node.id)) {
            graph.addNode(node.id, {
                label: node.label,
                type: node.type,
            });
        }
    });

    edges.forEach((edge) => {
        // Evitar duplicados y auto-bucles si es necesario
        if (graph.hasNode(edge.sourceId) && graph.hasNode(edge.targetId)) {
            if (!graph.hasEdge(edge.id)) {
                graph.addEdgeWithKey(edge.id, edge.sourceId, edge.targetId, {
                    type: edge.type,
                    label: edge.label,
                });
            }
        }
    });

    return graph;
}

/**
 * Encuentra el camino más corto entre dos nodos usando BFS (para grafos no ponderados).
 * Retorna la lista de IDs de nodos en el camino, o null si no hay camino.
 */
export function findShortestPath(nodes: DbNode[], edges: DbEdge[], sourceId: string, targetId: string): string[] | null {
    const graph = buildGraph({ nodes, edges });

    try {
        // bidirectional es generalmente más rápido que el BFS simple para s-t path
        const path = bidirectional(graph, sourceId, targetId);
        return path || null;
    } catch (error) {
        console.error("Error finding shortest path:", error);
        return null;
    }
}

/**
 * Analiza la estructura jerárquica de una red criminal.
 * Combina métricas de centralidad para identificar líderes y calcular niveles jerárquicos.
 *
 * Metodología:
 * 1. Calcula un "leadership score" combinando degree + betweenness centrality
 * 2. Identifica líderes (top nodes por leadership score)
 * 3. Calcula niveles basados en distancia mínima a cualquier líder
 * 4. Asigna roles basados en nivel y conexiones
 */
export function analyzeHierarchy(nodes: DbNode[], edges: DbEdge[], leaderCount: number = 3): HierarchyResult {
    if (nodes.length === 0) {
        return { nodes: [], levels: {}, leaders: [], chains: [] };
    }

    const graph = buildGraph({ nodes, edges });

    // Calcular métricas de centralidad
    const degreeScores = degreeCentrality(graph);
    const betweennessScores = betweennessCentrality(graph);

    // Normalizar scores
    const maxDegree = Math.max(...Object.values(degreeScores), 0.001);
    const maxBetweenness = Math.max(...Object.values(betweennessScores), 0.001);

    // Calcular leadership score combinado (70% betweenness, 30% degree)
    // Betweenness es más indicativo de control de información en redes criminales
    const leadershipScores: Record<string, number> = {};
    nodes.forEach((node) => {
        const normalizedDegree = (degreeScores[node.id] || 0) / maxDegree;
        const normalizedBetweenness = (betweennessScores[node.id] || 0) / maxBetweenness;
        leadershipScores[node.id] = normalizedBetweenness * 0.7 + normalizedDegree * 0.3;
    });

    // Identificar líderes (top N por leadership score)
    const sortedByLeadership = Object.entries(leadershipScores)
        .sort((a, b) => b[1] - a[1]);

    const actualLeaderCount = Math.min(leaderCount, Math.ceil(nodes.length * 0.1), nodes.length);
    const leaders = sortedByLeadership.slice(0, actualLeaderCount).map(([id]) => id);

    // Calcular distancias desde cada líder a todos los nodos
    const distancesFromLeaders: Record<string, number> = {};
    nodes.forEach((node) => {
        distancesFromLeaders[node.id] = Infinity;
    });

    leaders.forEach((leaderId) => {
        try {
            const distances = singleSource(graph, leaderId);
            Object.entries(distances).forEach(([nodeId, path]) => {
                const dist = path ? path.length - 1 : Infinity;
                if (dist < distancesFromLeaders[nodeId]) {
                    distancesFromLeaders[nodeId] = dist;
                }
            });
        } catch {
            // Node might be disconnected
        }
    });

    // Asignar líderes distancia 0
    leaders.forEach((leaderId) => {
        distancesFromLeaders[leaderId] = 0;
    });

    // Construir jerarquía
    const hierarchyNodes: HierarchyNode[] = [];
    const levels: Record<number, string[]> = {};

    nodes.forEach((node) => {
        const distance = distancesFromLeaders[node.id];
        const level = distance === Infinity ? -1 : distance;
        const isLeader = leaders.includes(node.id);

        // Determinar rol basado en nivel y score
        let role: HierarchyNode['role'];
        if (isLeader) {
            role = 'leader';
        } else if (level === 1) {
            role = 'lieutenant';
        } else if (level === 2 || level === 3) {
            role = 'operative';
        } else {
            role = 'peripheral';
        }

        // Encontrar parent (nodo más cercano de nivel superior con conexión directa)
        let parentId: string | null = null;
        if (!isLeader && level > 0 && level !== Infinity) {
            const neighbors = graph.neighbors(node.id);
            for (const neighbor of neighbors) {
                const neighborLevel = distancesFromLeaders[neighbor];
                if (neighborLevel === level - 1) {
                    parentId = neighbor;
                    break;
                }
            }
        }

        // Encontrar children (nodos de nivel inferior conectados directamente)
        const childrenIds: string[] = [];
        if (level !== Infinity && level >= 0) {
            const neighbors = graph.neighbors(node.id);
            for (const neighbor of neighbors) {
                const neighborLevel = distancesFromLeaders[neighbor];
                if (neighborLevel === level + 1) {
                    childrenIds.push(neighbor);
                }
            }
        }

        hierarchyNodes.push({
            nodeId: node.id,
            label: node.label,
            level,
            role,
            leadershipScore: leadershipScores[node.id] || 0,
            parentId,
            childrenIds,
        });

        // Agrupar por nivel
        if (!levels[level]) {
            levels[level] = [];
        }
        levels[level].push(node.id);
    });

    // Construir cadenas de mando (desde cada líder hacia abajo)
    const chains: string[][] = [];
    leaders.forEach((leaderId) => {
        const chain = buildChainFromLeader(leaderId, hierarchyNodes);
        if (chain.length > 1) {
            chains.push(chain);
        }
    });

    return {
        nodes: hierarchyNodes.sort((a, b) => a.level - b.level),
        levels,
        leaders,
        chains,
    };
}

/**
 * Construye una cadena de mando desde un líder hacia abajo (DFS)
 */
function buildChainFromLeader(leaderId: string, hierarchyNodes: HierarchyNode[]): string[] {
    const chain: string[] = [leaderId];
    const nodeMap = new Map(hierarchyNodes.map((n) => [n.nodeId, n]));

    const visited = new Set<string>();
    visited.add(leaderId);

    function dfs(nodeId: string) {
        const node = nodeMap.get(nodeId);
        if (!node) return;

        // Ordenar children por leadership score (más importante primero)
        const sortedChildren = [...node.childrenIds]
            .filter((id) => !visited.has(id))
            .sort((a, b) => {
                const nodeA = nodeMap.get(a);
                const nodeB = nodeMap.get(b);
                return (nodeB?.leadershipScore || 0) - (nodeA?.leadershipScore || 0);
            });

        for (const childId of sortedChildren) {
            if (!visited.has(childId)) {
                visited.add(childId);
                chain.push(childId);
                dfs(childId);
            }
        }
    }

    dfs(leaderId);
    return chain;
}

/**
 * Genera posiciones para un layout jerárquico.
 * Los líderes van arriba, subordinados abajo.
 */
export function calculateHierarchyLayout(
    hierarchyResult: HierarchyResult,
    options: {
        nodeWidth?: number;
        nodeHeight?: number;
        levelGap?: number;
        nodeGap?: number;
        startX?: number;
        startY?: number;
    } = {}
): Record<string, { x: number; y: number }> {
    const {
        nodeWidth = 120,
        nodeHeight = 60,
        levelGap = 150,
        nodeGap = 80,
        startX = 100,
        startY = 100,
    } = options;

    const positions: Record<string, { x: number; y: number }> = {};
    const { levels } = hierarchyResult;

    // Ordenar niveles (0 = líderes arriba, luego 1, 2, etc.)
    const sortedLevels = Object.keys(levels)
        .map(Number)
        .filter((l) => l >= 0)
        .sort((a, b) => a - b);

    // Calcular ancho máximo para centrar
    let maxWidth = 0;
    sortedLevels.forEach((level) => {
        const nodesInLevel = levels[level]?.length || 0;
        const levelWidth = nodesInLevel * nodeWidth + (nodesInLevel - 1) * nodeGap;
        maxWidth = Math.max(maxWidth, levelWidth);
    });

    // Posicionar nodos por nivel
    sortedLevels.forEach((level, levelIndex) => {
        const nodesInLevel = levels[level] || [];
        const levelWidth = nodesInLevel.length * nodeWidth + (nodesInLevel.length - 1) * nodeGap;
        const levelStartX = startX + (maxWidth - levelWidth) / 2;

        nodesInLevel.forEach((nodeId, nodeIndex) => {
            positions[nodeId] = {
                x: levelStartX + nodeIndex * (nodeWidth + nodeGap),
                y: startY + levelIndex * levelGap,
            };
        });
    });

    // Posicionar nodos desconectados (level -1) al final
    const disconnected = levels[-1] || [];
    if (disconnected.length > 0) {
        const lastLevelY = startY + sortedLevels.length * levelGap;
        disconnected.forEach((nodeId, idx) => {
            positions[nodeId] = {
                x: startX + idx * (nodeWidth + nodeGap),
                y: lastLevelY,
            };
        });
    }

    return positions;
}
