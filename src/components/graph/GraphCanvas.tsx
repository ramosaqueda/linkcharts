'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node as RFNode,
  type Edge as RFEdge,
  type NodeChange,
  type EdgeChange,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import CustomNodeComponent, { type CustomNodeData } from './CustomNode';
import CustomEdgeComponent, { type CustomEdgeData } from './CustomEdge';
import EdgeMarkers from './EdgeMarkers';
import { useGraphStore } from '@/lib/store';
import type { Node as DbNode, Edge as DbEdge } from '@/lib/types';
import ContextMenu from '../ui/ContextMenu';
import PhotoModal from '../ui/PhotoModal';

const nodeTypes = { custom: CustomNodeComponent };
const edgeTypes = { custom: CustomEdgeComponent };

function dbNodeToRF(node: DbNode, highlightedPath: string[] | null): RFNode {
  return {
    id: node.id,
    type: 'custom',
    position: { x: node.positionX, y: node.positionY },
    selected: false,
    data: {
      label: node.label,
      nodeType: node.type,
      dbId: node.id,
      metadata: node.metadata,
      highlighted: highlightedPath?.includes(node.id),
    } as CustomNodeData,
  };
}

function dbEdgeToRF(edge: DbEdge, highlightedPath: string[] | null): RFEdge {
  // Highlight edge if BOTH source and target are in highlightedPath
  const isHighlighted = highlightedPath
    ? (highlightedPath.includes(edge.sourceId) && highlightedPath.includes(edge.targetId))
    : false;

  return {
    id: edge.id,
    source: edge.sourceId,
    target: edge.targetId,
    type: 'custom',
    markerEnd: `marker-${edge.type}`,
    zIndex: isHighlighted ? 10 : 0,
    data: {
      edgeType: edge.type,
      dbId: edge.id,
      label: edge.label,
      highlighted: isHighlighted,
    } as CustomEdgeData,
  };
}

function GraphCanvasInner({ readOnly = false }: { readOnly?: boolean }) {
  const { fitView } = useReactFlow();
  const store = useGraphStore();
  const {
    nodes: dbNodes,
    edges: dbEdges,
    selectedNodeId,
    selectedEdgeId,
    mode,
    graph,
    setSelectedNode,
    setSelectedEdge,
    addEdge: addDbEdge,
    updateNode,
    hiddenNodeTypes,
    setDragStartPositions,
    photoModal,
    closePhotoModal,
    highlightedPath, // Destructure highlightedPath
  } = store;

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<RFEdge>([]);
  const initialLoad = useRef(true);

  // Context menu
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    screenX: number;
    screenY: number;
    nodeId?: string;
  } | null>(null);

  // Sync DB state -> RF state (with type filter)
  useEffect(() => {
    const visibleNodes = dbNodes.filter((n) => !hiddenNodeTypes.has(n.type));
    setRfNodes(visibleNodes.map(n => dbNodeToRF(n, highlightedPath)));
  }, [dbNodes, hiddenNodeTypes, setRfNodes, highlightedPath]);

  useEffect(() => {
    const visibleNodeIds = new Set(dbNodes.filter((n) => !hiddenNodeTypes.has(n.type)).map((n) => n.id));
    const visibleEdges = dbEdges.filter((e) => visibleNodeIds.has(e.sourceId) && visibleNodeIds.has(e.targetId));
    setRfEdges(visibleEdges.map(e => dbEdgeToRF(e, highlightedPath)));
  }, [dbEdges, dbNodes, hiddenNodeTypes, setRfEdges, highlightedPath]);

  // Fit view on first load
  useEffect(() => {
    if (initialLoad.current && dbNodes.length > 0) {
      initialLoad.current = false;
      setTimeout(() => fitView({ padding: 0.2 }), 100);
    }
  }, [dbNodes, fitView]);

  // Sync selection
  useEffect(() => {
    setRfNodes((nds) =>
      nds.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      }))
    );
  }, [selectedNodeId, setRfNodes]);

  useEffect(() => {
    setRfEdges((eds) =>
      eds.map((e) => ({
        ...e,
        selected: e.id === selectedEdgeId,
      }))
    );
  }, [selectedEdgeId, setRfEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
    },
    [onNodesChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      onEdgesChange(changes);
    },
    [onEdgesChange]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!graph) return;
      const edge = await addDbEdge(
        graph.id,
        connection.source,
        connection.target,
        'CONTACT'
      );
      if (edge) {
        setRfEdges((eds) => addEdge({
          ...connection,
          id: edge.id,
          type: 'custom',
          data: {
            edgeType: edge.type,
            dbId: edge.id,
            label: edge.label,
          } as CustomEdgeData,
        }, eds));
      }
    },
    [graph, addDbEdge, setRfEdges]
  );

  const onNodeDragStart = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      if (readOnly) return;
      setDragStartPositions({ [node.id]: { x: node.position.x, y: node.position.y } });
    },
    [readOnly, setDragStartPositions]
  );

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      if (readOnly) return;
      updateNode(node.id, {
        positionX: node.position.x,
        positionY: node.position.y,
      });
    },
    [readOnly, updateNode]
  );

  const onNodeClick = useCallback(
    (_event: React.MouseEvent, node: RFNode) => {
      setSelectedNode(node.id);
    },
    [setSelectedNode]
  );

  const onEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: RFEdge) => {
      setSelectedEdge(edge.id);
    },
    [setSelectedEdge]
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
    setContextMenu(null);
  }, [setSelectedNode, setSelectedEdge]);

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      event.preventDefault();
      const reactFlowBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setContextMenu({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
        screenX: event.clientX,
        screenY: event.clientY,
      });
    },
    []
  );

  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: RFNode) => {
      event.preventDefault();
      const reactFlowBounds = (event.currentTarget as HTMLElement).getBoundingClientRect();
      setSelectedNode(node.id);
      setContextMenu({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
        screenX: event.clientX,
        screenY: event.clientY,
        nodeId: node.id,
      });
    },
    [setSelectedNode]
  );

  const miniMapNodeColor = useCallback((node: RFNode) => {
    const data = node.data as CustomNodeData;
    return store.getNodeColor(data.nodeType);
  }, [store]);

  return (
    <div className="w-full h-full relative">
      <EdgeMarkers />
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={readOnly ? undefined : onConnect}
        onNodeDragStart={readOnly ? undefined : onNodeDragStart}
        onNodeDragStop={readOnly ? undefined : onNodeDragStop}
        nodesDraggable={!readOnly}
        nodesConnectable={!readOnly}
        elementsSelectable={true}
        onNodeClick={onNodeClick}
        onEdgeClick={onEdgeClick}
        onPaneClick={onPaneClick}
        onContextMenu={onContextMenu}
        onNodeContextMenu={onNodeContextMenu}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        connectionMode={mode === 'connect' ? undefined : undefined}
        fitView={false}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
        style={{ backgroundColor: 'var(--th-bg-primary)' }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--th-dots)"
        />
        <Controls
          className="!rounded-lg"
          style={{ backgroundColor: 'var(--th-bg-overlay-light)', borderColor: 'var(--th-border)' }}
        />
        <MiniMap
          nodeColor={miniMapNodeColor}
          maskColor="var(--th-minimap-mask)"
          className="!rounded-lg"
          style={{ backgroundColor: 'var(--th-bg-overlay-light)', borderColor: 'var(--th-border)' }}
          position="bottom-right"
        />
      </ReactFlow>
      {contextMenu && !readOnly && (
        <ContextMenu
          x={contextMenu.screenX}
          y={contextMenu.screenY}
          canvasX={contextMenu.x}
          canvasY={contextMenu.y}
          nodeId={contextMenu.nodeId}
          onClose={() => setContextMenu(null)}
        />
      )}
      {photoModal && (
        <PhotoModal
          photoUrl={photoModal.photoUrl}
          label={photoModal.label}
          onClose={closePhotoModal}
        />
      )}
    </div>
  );
}

export default function GraphCanvas({ readOnly = false }: { readOnly?: boolean }) {
  return <GraphCanvasInner readOnly={readOnly} />;
}
