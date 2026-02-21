'use client';

import { useEffect, useRef } from 'react';
import { useReactFlow, useViewport } from '@xyflow/react';
import { useGraphStore } from '@/lib/store';

interface UseFocusOnSelectionOptions {
  /** Animation duration in ms */
  duration?: number;
  /** Padding from viewport edge (0-1, percentage of viewport) */
  edgeThreshold?: number;
  /** Whether the effect is enabled */
  enabled?: boolean;
}

/**
 * Hook that creates a smooth "Prezi-like" focus animation when a node is selected.
 * Only triggers when the selected node is outside the visible viewport or near the edges.
 */
export function useFocusOnSelection(options: UseFocusOnSelectionOptions = {}) {
  const {
    duration = 400,
    edgeThreshold = 0.15, // 15% from edges triggers animation
    enabled = true,
  } = options;

  const { setCenter, getNodes } = useReactFlow();
  const viewport = useViewport();
  const { selectedNodeId } = useGraphStore();

  // Track previous selection to avoid animating on initial load
  const prevSelectedRef = useRef<string | null>(null);
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip on initial mount
    if (isInitialMount.current) {
      isInitialMount.current = false;
      prevSelectedRef.current = selectedNodeId;
      return;
    }

    // Skip if disabled or no selection change
    if (!enabled || !selectedNodeId || selectedNodeId === prevSelectedRef.current) {
      prevSelectedRef.current = selectedNodeId;
      return;
    }

    prevSelectedRef.current = selectedNodeId;

    // Find the selected node
    const nodes = getNodes();
    const selectedNode = nodes.find((n) => n.id === selectedNodeId);
    if (!selectedNode) return;

    // Get node center position (React Flow coordinates)
    const nodeWidth = selectedNode.measured?.width ?? 80;
    const nodeHeight = selectedNode.measured?.height ?? 80;
    const nodeCenterX = selectedNode.position.x + nodeWidth / 2;
    const nodeCenterY = selectedNode.position.y + nodeHeight / 2;

    // Calculate viewport bounds in flow coordinates
    const viewportElement = document.querySelector('.react-flow__viewport')?.parentElement;
    if (!viewportElement) return;

    const { width: viewportWidth, height: viewportHeight } = viewportElement.getBoundingClientRect();

    // Convert viewport dimensions to flow coordinates
    const flowViewportWidth = viewportWidth / viewport.zoom;
    const flowViewportHeight = viewportHeight / viewport.zoom;

    // Viewport bounds in flow coordinates
    const viewportLeft = -viewport.x / viewport.zoom;
    const viewportTop = -viewport.y / viewport.zoom;
    const viewportRight = viewportLeft + flowViewportWidth;
    const viewportBottom = viewportTop + flowViewportHeight;

    // Calculate edge thresholds
    const edgeX = flowViewportWidth * edgeThreshold;
    const edgeY = flowViewportHeight * edgeThreshold;

    // Check if node is outside the "safe zone" (inside viewport but away from edges)
    const isOutsideX = nodeCenterX < viewportLeft + edgeX || nodeCenterX > viewportRight - edgeX;
    const isOutsideY = nodeCenterY < viewportTop + edgeY || nodeCenterY > viewportBottom - edgeY;

    // Only animate if node is in the edge zone or completely outside
    if (isOutsideX || isOutsideY) {
      setCenter(nodeCenterX, nodeCenterY, {
        duration,
        zoom: viewport.zoom, // Maintain current zoom
      });
    }
  }, [selectedNodeId, enabled, duration, edgeThreshold, setCenter, getNodes, viewport]);
}
