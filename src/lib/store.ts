'use client';

import { create } from 'zustand';
import dagre from '@dagrejs/dagre';
import type { Node as DbNode, Edge as DbEdge, NodeType, EdgeType, Graph, NodeTypeConfig } from '@/lib/types';
import { DEFAULT_NODE_COLOR, DEFAULT_NODE_ICON, DEFAULT_NODE_LABEL } from '@/lib/constants';
import type { ThemeId } from '@/lib/themes';

type Mode = 'select' | 'connect';

interface ClipboardNode {
  type: NodeType;
  label: string;
  metadata: Record<string, string> | null;
}

// --- History system (module-level, not serialized) ---
interface HistoryAction {
  undo: () => Promise<void>;
  redo: () => Promise<void>;
}

const historyStack: HistoryAction[] = [];
const MAX_HISTORY = 50;
let _isUndoRedoing = false;

// Pre-drag position capture (set by GraphCanvas onNodeDragStart)
let _dragStartPositions: Record<string, { x: number; y: number }> = {};

interface PhotoModalState {
  photoUrl: string;
  label: string;
}

interface GraphStore {
  graph: Graph | null;
  nodes: DbNode[];
  edges: DbEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  mode: Mode;
  clipboard: ClipboardNode | null;
  hiddenNodeTypes: Set<string>;
  showMap: boolean;
  showTimeline: boolean;
  theme: ThemeId;
  nodeTypes: NodeTypeConfig[];
  photoModal: PhotoModalState | null;

  // Analysis state
  showAnalysisPanel: boolean;
  highlightedPath: string[] | null;
  analysisSourceNodeId: string | null;

  // History state (reactive, for UI)
  historyIndex: number;
  historySize: number;
  canUndo: boolean;
  canRedo: boolean;

  setGraph: (graph: Graph) => void;
  setNodes: (nodes: DbNode[]) => void;
  setEdges: (edges: DbEdge[]) => void;
  setSelectedNode: (id: string | null) => void;
  setSelectedEdge: (id: string | null) => void;
  setMode: (mode: Mode) => void;
  setClipboard: (node: ClipboardNode | null) => void;
  toggleNodeTypeVisibility: (type: string) => void;
  showAllNodeTypes: () => void;
  hideAllNodeTypes: () => void;
  fetchNodeTypes: () => Promise<void>;
  getNodeColor: (type: string) => string;
  getNodeLabel: (type: string) => string;
  getNodeIcon: (type: string) => string;
  toggleMap: () => void;
  toggleTimeline: () => void;
  toggleAnalysisPanel: () => void;
  openAnalysisPanelWithSource: (nodeId: string) => void;
  setHighlightedPath: (path: string[] | null) => void;
  clearHighlightedPath: () => void;
  clearAnalysisSourceNodeId: () => void;
  setTheme: (theme: ThemeId) => void;
  openPhotoModal: (photoUrl: string, label: string) => void;
  closePhotoModal: () => void;

  addNode: (graphId: string, type: NodeType, label: string, positionX: number, positionY: number, metadata?: Record<string, string>) => Promise<DbNode | null>;
  updateNode: (id: string, data: Partial<Pick<DbNode, 'label' | 'type' | 'positionX' | 'positionY' | 'metadata' | 'color' | 'icon'>>) => Promise<void>;
  deleteNode: (id: string) => Promise<void>;

  addEdge: (graphId: string, sourceId: string, targetId: string, type: EdgeType, label?: string) => Promise<DbEdge | null>;
  updateEdge: (id: string, data: Partial<Pick<DbEdge, 'type' | 'label' | 'weight' | 'directed' | 'metadata' | 'color'>>) => Promise<void>;
  deleteEdge: (id: string) => Promise<void>;

  // History actions
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  clearHistory: () => void;

  // Layout
  applyLayout: (direction: 'TB' | 'LR' | 'BT' | 'RL') => Promise<void>;

  // Drag position capture
  setDragStartPositions: (positions: Record<string, { x: number; y: number }>) => void;
}

let positionDebounceTimers: Record<string, ReturnType<typeof setTimeout>> = {};

export const useGraphStore = create<GraphStore>((set, get) => {
  // --- History helpers (closured over set/get) ---
  function _pushHistory(action: HistoryAction) {
    const { historyIndex } = get();
    // Truncate future if in middle of history
    historyStack.splice(historyIndex + 1);
    historyStack.push(action);
    // Respect max size
    if (historyStack.length > MAX_HISTORY) {
      historyStack.shift();
    }
    const newIndex = historyStack.length - 1;
    set({
      historyIndex: newIndex,
      historySize: historyStack.length,
      canUndo: newIndex >= 0,
      canRedo: false,
    });
  }

  function _updateHistoryState() {
    const idx = get().historyIndex;
    set({
      historySize: historyStack.length,
      canUndo: idx >= 0,
      canRedo: idx < historyStack.length - 1,
    });
  }

  return {
    graph: null,
    nodes: [],
    edges: [],
    selectedNodeId: null,
    selectedEdgeId: null,
    mode: 'select',
    clipboard: null,
    hiddenNodeTypes: new Set<string>(),
    showMap: false,
    showTimeline: false,
    nodeTypes: [],
    theme: (typeof window !== 'undefined' ? localStorage.getItem('linkcharts-theme') as ThemeId : null) || 'dark',
    photoModal: null,

    // Analysis state
    showAnalysisPanel: false,
    highlightedPath: null,
    analysisSourceNodeId: null,

    historyIndex: -1,
    historySize: 0,
    canUndo: false,
    canRedo: false,

    setGraph: (graph) => {
      // Clear history when switching graphs
      historyStack.length = 0;
      set({
        graph,
        historyIndex: -1,
        historySize: 0,
        canUndo: false,
        canRedo: false,
      });
    },
    setNodes: (nodes) => set({ nodes }),
    setEdges: (edges) => set({ edges }),
    setSelectedNode: (id) => set({ selectedNodeId: id, selectedEdgeId: null }),
    setSelectedEdge: (id) => set({ selectedEdgeId: id, selectedNodeId: null }),
    setMode: (mode) => set({ mode }),
    setClipboard: (node) => set({ clipboard: node }),
    toggleNodeTypeVisibility: (type) => set((state) => {
      const next = new Set(state.hiddenNodeTypes);
      if (next.has(type)) next.delete(type); else next.add(type);
      return { hiddenNodeTypes: next };
    }),
    showAllNodeTypes: () => set({ hiddenNodeTypes: new Set<string>() }),
    hideAllNodeTypes: () => set((state) => ({
      hiddenNodeTypes: new Set<string>(state.nodeTypes.map((t) => t.name)),
    })),
    fetchNodeTypes: async () => {
      try {
        const res = await fetch('/api/node-types');
        if (res.ok) {
          const types: NodeTypeConfig[] = await res.json();
          set({ nodeTypes: types });
        }
      } catch { /* silent */ }
    },
    getNodeColor: (type: string) => {
      const config = get().nodeTypes.find((t) => t.name === type);
      return config?.color ?? DEFAULT_NODE_COLOR;
    },
    getNodeLabel: (type: string) => {
      const config = get().nodeTypes.find((t) => t.name === type);
      return config?.label ?? DEFAULT_NODE_LABEL;
    },
    getNodeIcon: (type: string) => {
      const config = get().nodeTypes.find((t) => t.name === type);
      return config?.icon ?? DEFAULT_NODE_ICON;
    },
    toggleMap: () => set((state) => ({ showMap: !state.showMap })),
    toggleTimeline: () => set((state) => ({ showTimeline: !state.showTimeline })),
    toggleAnalysisPanel: () => set((state) => ({ showAnalysisPanel: !state.showAnalysisPanel })),
    openAnalysisPanelWithSource: (nodeId) => set({ showAnalysisPanel: true, analysisSourceNodeId: nodeId }),
    setHighlightedPath: (path) => set({ highlightedPath: path }),
    clearHighlightedPath: () => set({ highlightedPath: null }),
    clearAnalysisSourceNodeId: () => set({ analysisSourceNodeId: null }),

    setTheme: (theme) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('linkcharts-theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
      }
      set({ theme });
    },
    openPhotoModal: (photoUrl, label) => set({ photoModal: { photoUrl, label } }),
    closePhotoModal: () => set({ photoModal: null }),

    setDragStartPositions: (positions) => {
      _dragStartPositions = positions;
    },

    // --- Mutations with history ---

    addNode: async (graphId, type, label, positionX, positionY, metadata) => {
      try {
        const res = await fetch('/api/nodes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graphId, type, label, positionX, positionY, metadata }),
        });
        if (!res.ok) return null;
        const node: DbNode = await res.json();
        set((state) => ({ nodes: [...state.nodes, node] }));

        if (!_isUndoRedoing) {
          _pushHistory({
            undo: async () => {
              await fetch(`/api/nodes/${node.id}`, { method: 'DELETE' });
              set((state) => ({
                nodes: state.nodes.filter((n) => n.id !== node.id),
                edges: state.edges.filter((e) => e.sourceId !== node.id && e.targetId !== node.id),
                selectedNodeId: state.selectedNodeId === node.id ? null : state.selectedNodeId,
              }));
            },
            redo: async () => {
              const r = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: node.id, graphId, type, label, positionX, positionY, metadata }),
              });
              if (r.ok) {
                const restored: DbNode = await r.json();
                set((state) => ({ nodes: [...state.nodes, restored] }));
              }
            },
          });
        }
        return node;
      } catch {
        return null;
      }
    },

    updateNode: async (id, data) => {
      const isPositionOnly = Object.keys(data).every((k) => k === 'positionX' || k === 'positionY');

      if (isPositionOnly) {
        // Optimistic update + debounce API call
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? { ...n, ...data } : n)),
        }));

        if (positionDebounceTimers[id]) clearTimeout(positionDebounceTimers[id]);
        positionDebounceTimers[id] = setTimeout(async () => {
          try {
            await fetch(`/api/nodes/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(data),
            });
          } catch { /* silent */ }
          delete positionDebounceTimers[id];

          // Push history after debounce completes (only for actual drag, not undo/redo)
          if (!_isUndoRedoing) {
            const oldPos = _dragStartPositions[id];
            if (oldPos) {
              const newPos = { positionX: data.positionX!, positionY: data.positionY! };
              _pushHistory({
                undo: async () => {
                  await fetch(`/api/nodes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ positionX: oldPos.x, positionY: oldPos.y }),
                  });
                  set((state) => ({
                    nodes: state.nodes.map((n) =>
                      n.id === id ? { ...n, positionX: oldPos.x, positionY: oldPos.y } : n
                    ),
                  }));
                },
                redo: async () => {
                  await fetch(`/api/nodes/${id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newPos),
                  });
                  set((state) => ({
                    nodes: state.nodes.map((n) =>
                      n.id === id ? { ...n, ...newPos } : n
                    ),
                  }));
                },
              });
              delete _dragStartPositions[id];
            }
          }
        }, 300);
        return;
      }

      // Non-position update
      const oldNode = get().nodes.find((n) => n.id === id);
      if (!oldNode) return;

      // Capture old values for the fields being updated
      const oldData: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        oldData[key] = (oldNode as Record<string, unknown>)[key];
      }

      try {
        const res = await fetch(`/api/nodes/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) return;
        const updated: DbNode = await res.json();
        set((state) => ({
          nodes: state.nodes.map((n) => (n.id === id ? updated : n)),
        }));

        if (!_isUndoRedoing) {
          const newData = { ...data };
          _pushHistory({
            undo: async () => {
              const r = await fetch(`/api/nodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(oldData),
              });
              if (r.ok) {
                const reverted: DbNode = await r.json();
                set((state) => ({
                  nodes: state.nodes.map((n) => (n.id === id ? reverted : n)),
                }));
              }
            },
            redo: async () => {
              const r = await fetch(`/api/nodes/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
              });
              if (r.ok) {
                const reapplied: DbNode = await r.json();
                set((state) => ({
                  nodes: state.nodes.map((n) => (n.id === id ? reapplied : n)),
                }));
              }
            },
          });
        }
      } catch { /* silent */ }
    },

    deleteNode: async (id) => {
      // Capture node + connected edges before deletion
      const nodeToDelete = get().nodes.find((n) => n.id === id);
      if (!nodeToDelete) return;
      const connectedEdges = get().edges.filter((e) => e.sourceId === id || e.targetId === id);

      try {
        const res = await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
        if (!res.ok) return;
        set((state) => ({
          nodes: state.nodes.filter((n) => n.id !== id),
          edges: state.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
          selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
        }));

        if (!_isUndoRedoing) {
          _pushHistory({
            undo: async () => {
              // Re-create node with same ID
              const r = await fetch('/api/nodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: nodeToDelete.id,
                  graphId: nodeToDelete.graphId,
                  type: nodeToDelete.type,
                  label: nodeToDelete.label,
                  positionX: nodeToDelete.positionX,
                  positionY: nodeToDelete.positionY,
                  metadata: nodeToDelete.metadata,
                  color: nodeToDelete.color,
                  icon: nodeToDelete.icon,
                }),
              });
              if (r.ok) {
                const restored: DbNode = await r.json();
                set((state) => ({ nodes: [...state.nodes, restored] }));
              }
              // Re-create connected edges
              for (const edge of connectedEdges) {
                const er = await fetch('/api/edges', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    id: edge.id,
                    graphId: edge.graphId,
                    sourceId: edge.sourceId,
                    targetId: edge.targetId,
                    type: edge.type,
                    label: edge.label,
                    weight: edge.weight,
                    directed: edge.directed,
                    metadata: edge.metadata,
                    color: edge.color,
                  }),
                });
                if (er.ok) {
                  const restoredEdge: DbEdge = await er.json();
                  set((state) => ({ edges: [...state.edges, restoredEdge] }));
                }
              }
            },
            redo: async () => {
              await fetch(`/api/nodes/${id}`, { method: 'DELETE' });
              set((state) => ({
                nodes: state.nodes.filter((n) => n.id !== id),
                edges: state.edges.filter((e) => e.sourceId !== id && e.targetId !== id),
                selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
              }));
            },
          });
        }
      } catch { /* silent */ }
    },

    addEdge: async (graphId, sourceId, targetId, type, label) => {
      try {
        const res = await fetch('/api/edges', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ graphId, sourceId, targetId, type, label }),
        });
        if (!res.ok) return null;
        const edge: DbEdge = await res.json();
        set((state) => ({ edges: [...state.edges, edge] }));

        if (!_isUndoRedoing) {
          _pushHistory({
            undo: async () => {
              await fetch(`/api/edges/${edge.id}`, { method: 'DELETE' });
              set((state) => ({
                edges: state.edges.filter((e) => e.id !== edge.id),
                selectedEdgeId: state.selectedEdgeId === edge.id ? null : state.selectedEdgeId,
              }));
            },
            redo: async () => {
              const r = await fetch('/api/edges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: edge.id, graphId, sourceId, targetId, type, label }),
              });
              if (r.ok) {
                const restored: DbEdge = await r.json();
                set((state) => ({ edges: [...state.edges, restored] }));
              }
            },
          });
        }
        return edge;
      } catch {
        return null;
      }
    },

    updateEdge: async (id, data) => {
      const oldEdge = get().edges.find((e) => e.id === id);
      if (!oldEdge) return;

      const oldData: Record<string, unknown> = {};
      for (const key of Object.keys(data)) {
        oldData[key] = (oldEdge as Record<string, unknown>)[key];
      }

      try {
        const res = await fetch(`/api/edges/${id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) return;
        const updated: DbEdge = await res.json();
        set((state) => ({
          edges: state.edges.map((e) => (e.id === id ? updated : e)),
        }));

        if (!_isUndoRedoing) {
          const newData = { ...data };
          _pushHistory({
            undo: async () => {
              const r = await fetch(`/api/edges/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(oldData),
              });
              if (r.ok) {
                const reverted: DbEdge = await r.json();
                set((state) => ({
                  edges: state.edges.map((e) => (e.id === id ? reverted : e)),
                }));
              }
            },
            redo: async () => {
              const r = await fetch(`/api/edges/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newData),
              });
              if (r.ok) {
                const reapplied: DbEdge = await r.json();
                set((state) => ({
                  edges: state.edges.map((e) => (e.id === id ? reapplied : e)),
                }));
              }
            },
          });
        }
      } catch { /* silent */ }
    },

    deleteEdge: async (id) => {
      const edgeToDelete = get().edges.find((e) => e.id === id);
      if (!edgeToDelete) return;

      try {
        const res = await fetch(`/api/edges/${id}`, { method: 'DELETE' });
        if (!res.ok) return;
        set((state) => ({
          edges: state.edges.filter((e) => e.id !== id),
          selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
        }));

        if (!_isUndoRedoing) {
          _pushHistory({
            undo: async () => {
              const r = await fetch('/api/edges', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  id: edgeToDelete.id,
                  graphId: edgeToDelete.graphId,
                  sourceId: edgeToDelete.sourceId,
                  targetId: edgeToDelete.targetId,
                  type: edgeToDelete.type,
                  label: edgeToDelete.label,
                  weight: edgeToDelete.weight,
                  directed: edgeToDelete.directed,
                  metadata: edgeToDelete.metadata,
                  color: edgeToDelete.color,
                }),
              });
              if (r.ok) {
                const restored: DbEdge = await r.json();
                set((state) => ({ edges: [...state.edges, restored] }));
              }
            },
            redo: async () => {
              await fetch(`/api/edges/${id}`, { method: 'DELETE' });
              set((state) => ({
                edges: state.edges.filter((e) => e.id !== id),
                selectedEdgeId: state.selectedEdgeId === id ? null : state.selectedEdgeId,
              }));
            },
          });
        }
      } catch { /* silent */ }
    },

    // --- Layout ---

    applyLayout: async (direction) => {
      const { nodes, edges } = get();
      if (nodes.length === 0) return;

      const NODE_WIDTH = 172;
      const NODE_HEIGHT = 50;

      // Capture old positions
      const oldPositions = new Map(nodes.map(n => [n.id, { x: n.positionX, y: n.positionY }]));

      // Build dagre graph
      const g = new dagre.graphlib.Graph();
      g.setDefaultEdgeLabel(() => ({}));
      g.setGraph({ rankdir: direction, nodesep: 60, ranksep: 80 });
      nodes.forEach(n => g.setNode(n.id, { width: NODE_WIDTH, height: NODE_HEIGHT }));
      edges.forEach(e => g.setEdge(e.sourceId, e.targetId));
      dagre.layout(g);

      // Extract new positions (dagre centers nodes, adjust to top-left)
      const newPositions = new Map<string, { x: number; y: number }>();
      nodes.forEach(n => {
        const pos = g.node(n.id);
        newPositions.set(n.id, { x: pos.x - NODE_WIDTH / 2, y: pos.y - NODE_HEIGHT / 2 });
      });

      // Helper to batch update positions in state + API
      const batchUpdate = async (positions: Map<string, { x: number; y: number }>) => {
        set(state => ({
          nodes: state.nodes.map(n => {
            const p = positions.get(n.id);
            return p ? { ...n, positionX: p.x, positionY: p.y } : n;
          }),
        }));
        await Promise.all(
          Array.from(positions.entries()).map(([id, p]) =>
            fetch(`/api/nodes/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ positionX: p.x, positionY: p.y }),
            }).catch(() => { })
          )
        );
      };

      // Apply new positions
      await batchUpdate(newPositions);

      // Push history entry
      if (!_isUndoRedoing) {
        _pushHistory({
          undo: async () => { await batchUpdate(oldPositions); },
          redo: async () => { await batchUpdate(newPositions); },
        });
      }
    },

    // --- Undo / Redo ---

    undo: async () => {
      const { historyIndex } = get();
      if (historyIndex < 0) return;
      _isUndoRedoing = true;
      try {
        await historyStack[historyIndex].undo();
        const newIndex = historyIndex - 1;
        set({ historyIndex: newIndex });
        _updateHistoryState();
      } finally {
        _isUndoRedoing = false;
      }
    },

    redo: async () => {
      const { historyIndex } = get();
      if (historyIndex >= historyStack.length - 1) return;
      _isUndoRedoing = true;
      try {
        await historyStack[historyIndex + 1].redo();
        const newIndex = historyIndex + 1;
        set({ historyIndex: newIndex });
        _updateHistoryState();
      } finally {
        _isUndoRedoing = false;
      }
    },

    clearHistory: () => {
      historyStack.length = 0;
      set({
        historyIndex: -1,
        historySize: 0,
        canUndo: false,
        canRedo: false,
      });
    },
  };
});
