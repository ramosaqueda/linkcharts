'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useGraphStore } from '@/lib/store';
import type { GraphWithRelations } from '@/lib/types';
import GraphCanvas from '@/components/graph/GraphCanvas';
import Toolbar from '@/components/ui/Toolbar';
import DetailPanel from '@/components/ui/DetailPanel';
import MapPanel from '@/components/map/MapPanel';
import TimelinePanel from '@/components/timeline/TimelinePanel';
import { ArrowLeft, Globe, Lock, Eye, Users } from 'lucide-react';
import CollaboratorModal from '@/components/ui/CollaboratorModal';
import { ReactFlowProvider } from '@xyflow/react';

export default function EditorPage() {
  const params = useParams<{ graphId: string }>();
  const router = useRouter();
  const { data: session } = useSession();
  const {
    setGraph, setNodes, setEdges,
    selectedNodeId, selectedEdgeId,
    deleteNode, deleteEdge,
    setSelectedNode, setSelectedEdge,
    undo, redo,
    showMap, showTimeline,
    fetchNodeTypes,
  } = useGraphStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [isCollaborator, setIsCollaborator] = useState(false);
  const [isPublic, setIsPublic] = useState(false);
  const [showCollaborators, setShowCollaborators] = useState(false);

  const isAdmin = (session?.user as Record<string, unknown> | undefined)?.role === 'ADMIN';
  const canEdit = isOwner || isCollaborator;

  // Resizable map panel
  const TIMELINE_HEIGHT = 220;
  const MIN_MAP_HEIGHT = 150;
  const DEFAULT_MAP_HEIGHT = 300;
  const [mapHeight, setMapHeight] = useState(DEFAULT_MAP_HEIGHT);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef({ showTimeline, showMap });
  resizeRef.current = { showTimeline, showMap };

  const startResize = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  useEffect(() => {
    if (!isResizing) return;

    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';

    const handleMouseMove = (e: MouseEvent) => {
      const windowHeight = window.innerHeight;
      const bottomFromMouse = windowHeight - e.clientY;
      const timelineOffset = resizeRef.current.showTimeline ? TIMELINE_HEIGHT : 0;
      const handleOffset = 10; // resize handle height
      const newMapHeight = bottomFromMouse - timelineOffset - handleOffset;
      setMapHeight(Math.max(MIN_MAP_HEIGHT, Math.min(newMapHeight, windowHeight * 0.7)));
    };

    const handleMouseUp = () => setIsResizing(false);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  useEffect(() => {
    fetchNodeTypes();
  }, [fetchNodeTypes]);

  useEffect(() => {
    const fetchGraph = async () => {
      try {
        const res = await fetch(`/api/graphs/${params.graphId}`);
        if (!res.ok) {
          setError(res.status === 403 ? 'No tienes acceso a este grafo' : 'Grafo no encontrado');
          return;
        }
        const data: GraphWithRelations = await res.json();
        setGraph({
          id: data.id,
          name: data.name,
          description: data.description,
          caseNumber: data.caseNumber,
          isPublic: data.isPublic,
          userId: data.userId,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
        setNodes(data.nodes);
        setEdges(data.edges);
        const owner = data.userId === session?.user?.id;
        setIsOwner(owner);
        setIsCollaborator(!owner && (data.collaborators?.some(c => c.userId === session?.user?.id) ?? false));
        setIsPublic(data.isPublic);
      } catch {
        setError('Error al cargar el grafo');
      }
      setLoading(false);
    };

    if (session) {
      fetchGraph();
    }
  }, [params.graphId, session, setGraph, setNodes, setEdges]);

  const handleTogglePublic = async () => {
    try {
      const res = await fetch(`/api/graphs/${params.graphId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !isPublic }),
      });
      if (res.ok) {
        setIsPublic(!isPublic);
      }
    } catch { /* silent */ }
  };

  // Keyboard shortcuts — only for editors (owner or collaborator)
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!canEdit) return;

      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT';

      // Undo: Ctrl+Z
      if (e.ctrlKey && !e.shiftKey && e.key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      // Redo: Ctrl+Shift+Z or Ctrl+Y
      if ((e.ctrlKey && e.shiftKey && e.key === 'Z') || (e.ctrlKey && e.key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (isInput) return;

        if (selectedNodeId) {
          deleteNode(selectedNodeId);
        } else if (selectedEdgeId) {
          deleteEdge(selectedEdgeId);
        }
      }
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    },
    [canEdit, selectedNodeId, selectedEdgeId, deleteNode, deleteEdge, setSelectedNode, setSelectedEdge, undo, redo]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen font-mono gap-4" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
        <p className="text-sm text-red-400">{error}</p>
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 px-4 py-2 text-xs rounded-lg transition-colors"
          style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
        >
          <ArrowLeft size={14} />
          Volver al dashboard
        </button>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen overflow-hidden flex flex-col" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
        <div className="flex-1 relative overflow-hidden min-h-0">
          {/* Back button */}
          <button
            onClick={() => router.push('/dashboard')}
            className="absolute top-4 left-4 z-50 flex items-center gap-1.5 px-3 py-1.5 text-xs backdrop-blur-xl border rounded-lg transition-colors font-mono"
            style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-overlay-light)', borderColor: 'var(--th-border)' }}
          >
            <ArrowLeft size={14} />
            Dashboard
          </button>

          {/* Badges & controls — top right */}
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
            {/* Collaborator badge */}
            {isCollaborator && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-purple-400 bg-purple-950/50 backdrop-blur-xl border border-purple-700/50 rounded-lg font-mono">
                <Users size={14} />
                Colaborador
              </div>
            )}

            {/* Read-only badge for non-editors */}
            {!canEdit && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-amber-400 bg-amber-950/50 backdrop-blur-xl border border-amber-700/50 rounded-lg font-mono">
                <Eye size={14} />
                Solo lectura
              </div>
            )}

            {/* Manage collaborators button — owner only */}
            {isOwner && (
              <button
                onClick={() => setShowCollaborators(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs backdrop-blur-xl border rounded-lg transition-colors font-mono"
                style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-overlay-light)', borderColor: 'var(--th-border)' }}
                title="Gestionar colaboradores"
              >
                <Users size={14} />
              </button>
            )}

            {/* Public/Private toggle — owner or admin */}
            {(isOwner || isAdmin) && (
              <button
                onClick={handleTogglePublic}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs backdrop-blur-xl border rounded-lg transition-colors font-mono ${
                  isPublic
                    ? 'text-green-400 bg-green-950/50 border-green-700/50 hover:bg-green-950/70'
                    : ''
                }`}
                style={!isPublic ? { color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-overlay-light)', borderColor: 'var(--th-border)' } : undefined}
                title={isPublic ? 'Público — clic para hacer privado' : 'Privado — clic para hacer público'}
              >
                {isPublic ? <Globe size={14} /> : <Lock size={14} />}
                {isPublic ? 'Público' : 'Privado'}
              </button>
            )}
          </div>

          <Toolbar readOnly={!canEdit} />
          <GraphCanvas readOnly={!canEdit} />
          <DetailPanel readOnly={!canEdit} />
        </div>

        {(showMap || showTimeline) && (
          <div className="flex flex-col shrink-0 animate-slideUp" style={{ borderTop: '1px solid var(--th-border)' }}>
            {/* Resize handle — only when map is visible */}
            {showMap && (
              <div className="resize-handle" onMouseDown={startResize}>
                <div className="resize-bar" />
              </div>
            )}

            {/* Map panel — resizable */}
            {showMap && (
              <div
                className="shrink-0 overflow-hidden"
                style={{
                  height: mapHeight,
                  borderBottom: showTimeline ? '1px solid var(--th-border)' : undefined,
                }}
              >
                <MapPanel />
              </div>
            )}

            {/* Timeline panel — fixed height */}
            {showTimeline && (
              <div className="shrink-0 overflow-hidden" style={{ height: TIMELINE_HEIGHT }}>
                <TimelinePanel />
              </div>
            )}
          </div>
        )}
      </div>

      {showCollaborators && (
        <CollaboratorModal
          graphId={params.graphId}
          onClose={() => setShowCollaborators(false)}
        />
      )}
    </ReactFlowProvider>
  );
}
