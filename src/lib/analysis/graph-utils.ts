import Graph from 'graphology';
import { bidirectional } from 'graphology-shortest-path/unweighted';
import { degreeCentrality } from 'graphology-metrics/centrality/degree';
import betweennessCentrality from 'graphology-metrics/centrality/betweenness';
import type { Node as DbNode, Edge as DbEdge } from '@/lib/types';

export interface CentralityResult {
    nodeId: string;
    score: number;
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
