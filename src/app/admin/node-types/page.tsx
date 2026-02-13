'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Plus, Pencil, Trash2, X, LogOut, LayoutDashboard } from 'lucide-react';
import Image from 'next/image';
import ThemeSelector from '@/components/ui/ThemeSelector';
import { getIconComponent, AVAILABLE_ICONS } from '@/lib/icon-map';
import type { NodeTypeConfig } from '@/lib/types';

export default function AdminNodeTypesPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const [nodeTypes, setNodeTypes] = useState<NodeTypeConfig[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<NodeTypeConfig | null>(null);
  const [formName, setFormName] = useState('');
  const [formLabel, setFormLabel] = useState('');
  const [formColor, setFormColor] = useState('#3b82f6');
  const [formIcon, setFormIcon] = useState('UserRound');
  const [formOrder, setFormOrder] = useState(0);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // Delete dialog state
  const [deleteTarget, setDeleteTarget] = useState<NodeTypeConfig | null>(null);
  const [deleteError, setDeleteError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const fetchTypes = async () => {
    try {
      const res = await fetch('/api/node-types');
      if (res.ok) setNodeTypes(await res.json());
    } catch { /* silent */ }
    setLoading(false);
  };

  useEffect(() => { fetchTypes(); }, []);

  const openCreate = () => {
    setEditing(null);
    setFormName('');
    setFormLabel('');
    setFormColor('#3b82f6');
    setFormIcon('UserRound');
    setFormOrder(0);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (t: NodeTypeConfig) => {
    setEditing(t);
    setFormName(t.name);
    setFormLabel(t.label);
    setFormColor(t.color);
    setFormIcon(t.icon);
    setFormOrder(t.sortOrder);
    setFormError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    const name = formName.trim().toUpperCase();
    const label = formLabel.trim();
    if (!name || !label) { setFormError('Nombre y label son requeridos'); return; }

    setSaving(true);
    setFormError('');

    try {
      if (editing) {
        // Update — don't send name
        const res = await fetch(`/api/node-types/${editing.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ label, color: formColor, icon: formIcon, sortOrder: formOrder }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || 'Error al actualizar');
          setSaving(false);
          return;
        }
        const updated: NodeTypeConfig = await res.json();
        setNodeTypes((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
      } else {
        // Create
        const res = await fetch('/api/node-types', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, label, color: formColor, icon: formIcon, sortOrder: formOrder }),
        });
        if (!res.ok) {
          const data = await res.json();
          setFormError(data.error || 'Error al crear');
          setSaving(false);
          return;
        }
        const created: NodeTypeConfig = await res.json();
        setNodeTypes((prev) => [...prev, created].sort((a, b) => a.sortOrder - b.sortOrder));
      }
      setShowModal(false);
    } catch {
      setFormError('Error de conexión');
    }
    setSaving(false);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');

    try {
      const res = await fetch(`/api/node-types/${deleteTarget.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        setDeleteError(data.error || 'Error al eliminar');
        setDeleting(false);
        return;
      }
      setNodeTypes((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch {
      setDeleteError('Error de conexión');
    }
    setDeleting(false);
  };

  const PreviewIcon = getIconComponent(formIcon);

  return (
    <div className="min-h-screen font-mono" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
      {/* Header */}
      <header className="border-b" style={{ borderColor: 'var(--th-border-strong)' }}>
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Image src="/logo_fiscalia.svg" alt="Logo" width={128} height={128} style={{ filter: 'var(--th-logo-filter)' }} />
            <h1 className="text-xl font-bold" style={{ color: 'var(--th-text-primary)' }}>
              Admin — Tipos de Nodo
            </h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs" style={{ color: 'var(--th-text-muted)' }}>{session?.user?.name}</span>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-lg shadow-blue-600/20"
            >
              <Plus size={16} />
              Nuevo Tipo
            </button>
            <ThemeSelector />
            <button
              onClick={() => router.push('/dashboard')}
              className="flex items-center gap-1.5 px-3 py-2 text-xs rounded-lg transition-colors"
              style={{ color: 'var(--th-text-muted)', backgroundColor: 'var(--th-bg-input)' }}
              title="Dashboard"
            >
              <LayoutDashboard size={14} />
            </button>
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
        ) : nodeTypes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-sm mb-4" style={{ color: 'var(--th-text-muted)' }}>No hay tipos de nodo configurados.</p>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
            >
              <Plus size={16} />
              Crear Tipo
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {nodeTypes.map((t) => {
              const Icon = getIconComponent(t.icon);
              return (
                <div
                  key={t.id}
                  className="group relative border rounded-xl p-5 transition-all hover:shadow-lg hover:shadow-black/20"
                  style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border-strong)' }}
                >
                  <div className="flex items-start gap-3 mb-2">
                    <div
                      className="flex items-center justify-center w-10 h-10 rounded-full shrink-0"
                      style={{ backgroundColor: `${t.color}20`, border: `2px solid ${t.color}` }}
                    >
                      <Icon size={18} style={{ color: t.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-bold tracking-wide truncate" style={{ color: 'var(--th-text-primary)' }}>
                        {t.name}
                      </p>
                      <p className="text-xs truncate" style={{ color: 'var(--th-text-muted)' }}>
                        {t.label}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono" style={{ color: 'var(--th-text-dimmed)' }}>{t.color}</span>
                    <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: t.color }} />
                  </div>

                  <p className="text-[10px]" style={{ color: 'var(--th-text-dimmed)' }}>
                    Orden: {t.sortOrder}
                  </p>

                  <div className="absolute bottom-4 right-4 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-md transition-colors hover:bg-blue-600/20"
                      style={{ color: 'var(--th-text-muted)' }}
                      title="Editar"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => { setDeleteTarget(t); setDeleteError(''); }}
                      className="p-1.5 rounded-md transition-colors hover:bg-red-600/20 hover:text-red-400"
                      style={{ color: 'var(--th-text-muted)' }}
                      title="Eliminar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'var(--th-bg-backdrop)' }}>
          <div
            className="border rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6 animate-slideIn max-h-[90vh] overflow-y-auto"
            style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-sm font-semibold" style={{ color: 'var(--th-text-primary)' }}>
                {editing ? 'Editar Tipo de Nodo' : 'Nuevo Tipo de Nodo'}
              </h2>
              <button onClick={() => setShowModal(false)} className="transition-colors" style={{ color: 'var(--th-text-muted)' }}>
                <X size={16} />
              </button>
            </div>

            <div className="space-y-4">
              {/* Name */}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Nombre (código) *
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value.toUpperCase())}
                  disabled={!!editing}
                  placeholder="PERSON"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono disabled:opacity-50"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
                {editing && (
                  <p className="text-[10px] mt-1" style={{ color: 'var(--th-text-faint)' }}>
                    No editable — cambiar el nombre rompería nodos existentes.
                  </p>
                )}
              </div>

              {/* Label */}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Label *
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="Persona"
                  className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>

              {/* Color */}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Color
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border cursor-pointer"
                    style={{ borderColor: 'var(--th-border)' }}
                  />
                  <input
                    type="text"
                    value={formColor}
                    onChange={(e) => setFormColor(e.target.value)}
                    className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                    style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                  />
                </div>
              </div>

              {/* Icon selector */}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Icono
                </label>
                <div className="grid grid-cols-10 gap-1">
                  {AVAILABLE_ICONS.map((iconName) => {
                    const Ic = getIconComponent(iconName);
                    const selected = formIcon === iconName;
                    return (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setFormIcon(iconName)}
                        className="flex items-center justify-center w-8 h-8 rounded-lg border transition-all"
                        style={{
                          borderColor: selected ? formColor : 'var(--th-border)',
                          backgroundColor: selected ? `${formColor}20` : 'transparent',
                          color: selected ? formColor : 'var(--th-text-muted)',
                        }}
                        title={iconName}
                      >
                        <Ic size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sort order */}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                  Orden
                </label>
                <input
                  type="number"
                  value={formOrder}
                  onChange={(e) => setFormOrder(parseInt(e.target.value) || 0)}
                  className="w-24 border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                  style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                />
              </div>

              {/* Preview */}
              <div>
                <label className="text-[10px] uppercase tracking-wider block mb-2" style={{ color: 'var(--th-text-dimmed)' }}>
                  Vista previa
                </label>
                <div className="flex flex-col items-center py-4">
                  <div
                    className="flex items-center justify-center w-14 h-14 rounded-full"
                    style={{
                      backgroundColor: 'var(--th-bg-node, var(--th-bg-primary))',
                      border: `2px solid ${formColor}`,
                      boxShadow: `0 2px 8px rgba(0,0,0,0.3)`,
                    }}
                  >
                    <PreviewIcon size={24} style={{ color: formColor }} />
                  </div>
                  <span
                    className="mt-1.5 px-2 py-0.5 rounded text-[10px] font-mono leading-tight text-center"
                    style={{ backgroundColor: `${formColor}20`, color: formColor }}
                  >
                    {formLabel || 'Label'}
                  </span>
                </div>
              </div>

              {/* Error */}
              {formError && (
                <p className="text-xs text-red-400">{formError}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim() || !formLabel.trim()}
                className="flex-1 px-4 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {saving ? 'Guardando...' : editing ? 'Guardar' : 'Crear'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm" style={{ backgroundColor: 'var(--th-bg-backdrop)' }}>
          <div className="border rounded-xl shadow-2xl w-full max-w-sm mx-4 p-6" style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}>
            <h2 className="text-sm font-semibold mb-2" style={{ color: 'var(--th-text-primary)' }}>Eliminar tipo de nodo</h2>
            <p className="text-xs mb-1" style={{ color: 'var(--th-text-muted)' }}>
              ¿Eliminar <strong>{deleteTarget.name}</strong> ({deleteTarget.label})?
            </p>
            <p className="text-[10px] mb-4" style={{ color: 'var(--th-text-faint)' }}>
              Solo se puede eliminar si ningún nodo usa este tipo.
            </p>
            {deleteError && (
              <p className="text-xs text-red-400 mb-3">{deleteError}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2 text-xs text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2 text-xs rounded-lg transition-colors"
                style={{ color: 'var(--th-text-secondary)', backgroundColor: 'var(--th-bg-input)' }}
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
