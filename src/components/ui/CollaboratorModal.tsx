'use client';

import { useState, useEffect } from 'react';
import { X, UserPlus, Trash2, Users } from 'lucide-react';

interface Collaborator {
  id: string;
  userId: string;
  user: { id: string; name: string; email: string };
}

interface CollaboratorModalProps {
  graphId: string;
  onClose: () => void;
}

export default function CollaboratorModal({ graphId, onClose }: CollaboratorModalProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchCollaborators();
  }, []);

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/graphs/${graphId}/collaborators`);
      if (res.ok) {
        setCollaborators(await res.json());
      }
    } catch { /* silent */ }
    setLoading(false);
  };

  const handleAdd = async () => {
    if (!email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const res = await fetch(`/api/graphs/${graphId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (res.ok) {
        const collab = await res.json();
        setCollaborators(prev => [...prev, collab]);
        setEmail('');
      } else {
        const data = await res.json();
        setError(data.error || 'Error al agregar colaborador');
      }
    } catch {
      setError('Error de conexión');
    }
    setAdding(false);
  };

  const handleRemove = async (collaboratorId: string) => {
    try {
      const res = await fetch(`/api/graphs/${graphId}/collaborators/${collaboratorId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setCollaborators(prev => prev.filter(c => c.id !== collaboratorId));
      }
    } catch { /* silent */ }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'var(--th-bg-backdrop)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="border rounded-xl shadow-2xl w-full max-w-md mx-4 p-6 animate-slideIn"
        style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users size={16} style={{ color: 'var(--th-text-muted)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--th-text-primary)' }}>
              Colaboradores
            </h2>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: 'var(--th-text-muted)' }}>
            <X size={16} />
          </button>
        </div>

        {/* Add collaborator */}
        <div className="flex gap-2 mb-4">
          <input
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="correo@ejemplo.com"
            className="flex-1 border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
            style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
          />
          <button
            onClick={handleAdd}
            disabled={adding || !email.trim()}
            className="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
          >
            <UserPlus size={14} />
            Agregar
          </button>
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-400 mb-3">{error}</p>
        )}

        {/* Collaborator list */}
        <div className="space-y-1 max-h-60 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-6">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : collaborators.length === 0 ? (
            <p className="text-xs py-4 text-center" style={{ color: 'var(--th-text-faint)' }}>
              Sin colaboradores. Agrega usuarios por email.
            </p>
          ) : (
            collaborators.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg group"
                style={{ backgroundColor: 'var(--th-bg-input)' }}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--th-text-primary)' }}>
                    {c.user.name}
                  </p>
                  <p className="text-[10px] truncate" style={{ color: 'var(--th-text-dimmed)' }}>
                    {c.user.email}
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(c.id)}
                  className="ml-2 shrink-0 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                  style={{ color: 'var(--th-text-faint)' }}
                  title="Remover colaborador"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
