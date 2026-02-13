'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import {
  Plus, Trash2, Calendar, Hash, X,
  LogOut, Globe, Lock, User, Settings, Users,
  Upload, Download, FileSpreadsheet, AlertTriangle,
} from 'lucide-react';
import Image from 'next/image';
import type { GraphSummary } from '@/lib/types';
import type { ParseResult } from '@/lib/import-parser';
import ThemeSelector from '@/components/ui/ThemeSelector';

export default function DashboardPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [graphs, setGraphs] = useState<GraphSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newCase, setNewCase] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<ParseResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userId = session?.user?.id;
  const userRole = (session?.user as Record<string, unknown> | undefined)?.role as string | undefined;
  const isAdmin = userRole === 'ADMIN';

  const myGraphs = graphs.filter((g) => g.userId === userId);
  const sharedGraphs = graphs.filter(
    (g) => g.userId !== userId && g.collaborators?.some((c) => c.userId === userId)
  );
  const sharedIds = new Set(sharedGraphs.map((g) => g.id));
  const publicGraphs = graphs.filter((g) => g.isPublic && g.userId !== userId && !sharedIds.has(g.id));

  const fetchGraphs = async () => {
    try {
      const res = await fetch('/api/graphs');
      if (res.ok) {
        const data = await res.json();
        setGraphs(data);
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => {
    fetchGraphs();
  }, []);

  const handleFileSelect = async (file: File) => {
    setImportFile(file);
    setImportError(null);
    setImportPreview(null);
    try {
      const { parseImportFile } = await import('@/lib/import-parser');
      const typesRes = await fetch('/api/node-types');
      const nodeTypes = typesRes.ok ? (await typesRes.json()).map((t: { name: string }) => t.name) : [];
      const result = await parseImportFile(file, nodeTypes);
      setImportPreview(result);
    } catch {
      setImportError('No se pudo leer el archivo');
    }
  };

  const handleClearFile = () => {
    setImportFile(null);
    setImportPreview(null);
    setImportError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownloadTemplate = async () => {
    const { downloadTemplate } = await import('@/lib/import-template');
    downloadTemplate();
  };

  const resetCreateModal = () => {
    setShowCreate(false);
    setNewName('');
    setNewCase('');
    setNewDesc('');
    handleClearFile();
    setImporting(false);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;

    // Import flow
    if (importPreview && importPreview.nodes.length > 0 && importPreview.errors.length === 0) {
      setImporting(true);
      try {
        const res = await fetch('/api/graphs/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: newName.trim(),
            caseNumber: newCase.trim() || null,
            description: newDesc.trim() || null,
            nodes: importPreview.nodes,
            edges: importPreview.edges,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          router.push(`/editor/${data.graph.id}`);
        } else {
          const err = await res.json();
          setImportError(err.details?.join(', ') || err.error || 'Error al importar');
          setImporting(false);
        }
      } catch {
        setImportError('Error de conexión');
        setImporting(false);
      }
      return;
    }

    // Normal flow (no file)
    try {
      const res = await fetch('/api/graphs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newName.trim(),
          caseNumber: newCase.trim() || null,
          description: newDesc.trim() || null,
        }),
      });
      if (res.ok) {
        const graph = await res.json();
        router.push(`/editor/${graph.id}`);
      }
    } catch { /* silent */ }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/graphs/${id}`, { method: 'DELETE' });
      setGraphs(graphs.filter((g) => g.id !== id));
      setDeleteId(null);
    } catch { /* silent */ }
  };

  const handleTogglePublic = async (e: React.MouseEvent, graph: GraphSummary) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/graphs/${graph.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isPublic: !graph.isPublic }),
      });
      if (res.ok) {
        setGraphs(graphs.map((g) =>
          g.id === graph.id ? { ...g, isPublic: !g.isPublic } : g
        ));
      }
    } catch { /* silent */ }
  };

  const GraphCard = ({ graph, isOwner, isShared }: { graph: GraphSummary; isOwner: boolean; isShared?: boolean }) => {
    const canControl = isOwner || isAdmin;
    return (
    <div
      key={graph.id}
      className="group relative border rounded-xl p-5 cursor-pointer transition-all hover:shadow-lg hover:shadow-black/20"
      style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border-strong)' }}
      onClick={() => router.push(`/editor/${graph.id}`)}
    >
      <div className="flex items-start justify-between mb-3">
        <h3 className="text-sm font-semibold truncate pr-16" style={{ color: 'var(--th-text-primary)' }}>{graph.name}</h3>
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {canControl && (
            <button
              onClick={(e) => handleTogglePublic(e, graph)}
              className="transition-colors"
              style={{ color: graph.isPublic ? '#4ade80' : 'var(--th-text-faint)' }}
              title={graph.isPublic ? 'Público — clic para hacer privado' : 'Privado — clic para hacer público'}
            >
              {graph.isPublic ? <Globe size={14} /> : <Lock size={14} />}
            </button>
          )}
          {canControl && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteId(graph.id);
              }}
              className="hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100" style={{ color: 'var(--th-text-faint)' }}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {graph.caseNumber && (
        <div className="flex items-center gap-1.5 mb-2">
          <Hash size={12} style={{ color: 'var(--th-text-dimmed)' }} />
          <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>{graph.caseNumber}</span>
        </div>
      )}

      {graph.description && (
        <p className="text-xs mb-3 line-clamp-2" style={{ color: 'var(--th-text-dimmed)' }}>{graph.description}</p>
      )}

      <div className="flex items-center gap-4 text-[11px]" style={{ color: 'var(--th-text-dimmed)' }}>
        <span>{graph._count.nodes} nodos</span>
        <span>{graph._count.edges} conexiones</span>
      </div>

      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: 'var(--th-text-faint)' }}>
          <Calendar size={10} />
          {new Date(graph.updatedAt).toLocaleDateString('es', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })}
        </div>
        {!isOwner && (
          <div className="flex items-center gap-2">
            {isShared && (
              <div className="flex items-center gap-1 text-[10px] text-purple-400">
                <Users size={10} />
                Colaborador
              </div>
            )}
            <div className="flex items-center gap-1 text-[10px]" style={{ color: 'var(--th-text-dimmed)' }}>
              <User size={10} />
              {graph.user.name}
            </div>
          </div>
        )}
      </div>
    </div>
  );
  };

  return (
    <div className="min-h-screen font-mono" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--th-border-strong)' }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo_fiscalia.svg" alt="Logo" width={128} height={128} style={{ filter: 'var(--th-logo-filter)' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--th-text-primary)' }}>LinkCharts</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>{session?.user?.name}</span>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} />
              Nuevo Grafo
            </button>
            {isAdmin && (
              <button
                onClick={() => router.push('/admin/node-types')}
                className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-input)' }}
                title="Admin — Tipos de Nodo"
              >
                <Settings size={14} />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            <ThemeSelector />
            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors"
              style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-input)' }}
              title="Cerrar sesión"
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : myGraphs.length === 0 && sharedGraphs.length === 0 && publicGraphs.length === 0 ? (
          <div className="text-center py-20">
            <Image src="/logo_fiscalia.svg" alt="Logo" width={48} height={48} className="mx-auto mb-4 opacity-30" style={{ filter: 'var(--th-logo-filter)' }} />
            <h2 className="text-lg mb-2" style={{ color: 'var(--th-text-muted)' }}>Sin grafos</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--th-text-faint)' }}>Crea tu primer grafo para comenzar el análisis.</p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Crear Grafo
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* My Graphs */}
            <section>
              <h2 className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--th-text-dimmed)' }}>
                Mis Grafos ({myGraphs.length})
              </h2>
              {myGraphs.length === 0 ? (
                <p className="text-xs py-4" style={{ color: 'var(--th-text-faint)' }}>No tienes grafos aún. Crea uno para comenzar.</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {myGraphs.map((graph) => (
                    <GraphCard key={graph.id} graph={graph} isOwner={true} />
                  ))}
                </div>
              )}
            </section>

            {/* Shared with me */}
            {sharedGraphs.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--th-text-dimmed)' }}>
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={12} className="text-purple-400" />
                    Grafos Compartidos Conmigo ({sharedGraphs.length})
                  </span>
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {sharedGraphs.map((graph) => (
                    <GraphCard key={graph.id} graph={graph} isOwner={false} isShared={true} />
                  ))}
                </div>
              </section>
            )}

            {/* Public Graphs */}
            {publicGraphs.length > 0 && (
              <section>
                <h2 className="text-xs uppercase tracking-wider mb-4" style={{ color: 'var(--th-text-dimmed)' }}>
                  Grafos Públicos ({publicGraphs.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {publicGraphs.map((graph) => (
                    <GraphCard key={graph.id} graph={graph} isOwner={false} />
                  ))}
                </div>
              </section>
            )}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'var(--th-bg-backdrop)' }}>
          <div className="border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-slideIn max-h-[90vh] overflow-y-auto" style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--th-text-primary)' }}>Nuevo Grafo</h2>
              <button
                onClick={resetCreateModal}
                className="transition-colors" style={{ color: 'var(--th-text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Nombre *
                </label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !importing && handleCreate()}
                  placeholder="Operación..."
                  autoFocus
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  RUC
                </label>
                <input
                  type="text"
                  value={newCase}
                  onChange={(e) => setNewCase(e.target.value)}
                  placeholder="CAU-2026-..."
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Descripción
                </label>
                <textarea
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Descripción del caso..."
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono resize-none"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>

              {/* Import section */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--th-border)' }}>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--th-text-dimmed)' }}>
                    Importar desde archivo (opcional)
                  </label>
                  <button
                    onClick={handleDownloadTemplate}
                    className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <Download size={10} />
                    Plantilla
                  </button>
                </div>

                {!importFile ? (
                  <div
                    className="border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors hover:border-blue-500/50"
                    style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-bg-input)' }}
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const file = e.dataTransfer.files[0];
                      if (file) handleFileSelect(file);
                    }}
                  >
                    <Upload size={20} className="mx-auto mb-2" style={{ color: 'var(--th-text-faint)' }} />
                    <p className="text-[11px]" style={{ color: 'var(--th-text-muted)' }}>
                      Arrastra un archivo CSV o Excel aquí
                    </p>
                    <p className="text-[10px] mt-1" style={{ color: 'var(--th-text-faint)' }}>
                      o haz clic para seleccionar
                    </p>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.xls,.xlsx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(file);
                      }}
                    />
                  </div>
                ) : (
                  <div className="border rounded-lg p-3" style={{ borderColor: 'var(--th-border)', backgroundColor: 'var(--th-bg-input)' }}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <FileSpreadsheet size={14} className="text-green-400" />
                        <span className="text-xs truncate max-w-[200px]" style={{ color: 'var(--th-text-primary)' }}>
                          {importFile.name}
                        </span>
                      </div>
                      <button
                        onClick={handleClearFile}
                        className="transition-colors" style={{ color: 'var(--th-text-faint)' }}
                      >
                        <X size={14} />
                      </button>
                    </div>

                    {importPreview && (
                      <>
                        <div className="flex items-center gap-3 text-[11px]" style={{ color: 'var(--th-text-muted)' }}>
                          <span>{importPreview.nodes.length} nodos</span>
                          <span>{importPreview.edges.length} conexiones</span>
                        </div>
                        {importPreview.errors.length > 0 && (
                          <div className="mt-2 p-2 rounded border border-amber-500/30 bg-amber-500/10 max-h-24 overflow-y-auto">
                            <div className="flex items-center gap-1 mb-1">
                              <AlertTriangle size={11} className="text-amber-400 shrink-0" />
                              <span className="text-[10px] font-semibold text-amber-400">
                                {importPreview.errors.length} error{importPreview.errors.length > 1 ? 'es' : ''}
                              </span>
                            </div>
                            {importPreview.errors.map((err, i) => (
                              <p key={i} className="text-[10px] text-amber-300/80 pl-4">{err}</p>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}

                {importError && (
                  <p className="text-[10px] text-red-400 mt-1">{importError}</p>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleCreate}
                disabled={!newName.trim() || importing || (importPreview !== null && (importPreview.errors.length > 0 || importPreview.nodes.length === 0))}
                className="flex-1 px-4 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                {importing ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Importando...
                  </>
                ) : importPreview && importPreview.nodes.length > 0 && importPreview.errors.length === 0 ? (
                  <>
                    <Upload size={12} />
                    Crear e importar
                  </>
                ) : (
                  'Crear'
                )}
              </button>
              <button
                onClick={resetCreateModal}
                disabled={importing}
                className="px-4 py-2 text-xs rounded-lg transition-colors disabled:opacity-50"
                style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'var(--th-bg-backdrop)' }}>
          <div className="border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--th-text-primary)' }}>Eliminar grafo</h2>
            <p className="text-xs mb-5" style={{ color: 'var(--th-text-muted)' }}>
              Se eliminarán todos los nodos y conexiones permanentemente.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handleDelete(deleteId)}
                className="flex-1 px-4 py-2 text-xs text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
              >
                Eliminar
              </button>
              <button
                onClick={() => setDeleteId(null)}
                className="th-btn-secondary flex-1 px-4 py-2 text-xs rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
