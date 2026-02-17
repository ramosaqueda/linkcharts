'use client';

import { X, ExternalLink, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

interface PhotoModalProps {
  photoUrl: string;
  label: string;
  onClose: () => void;
}

export default function PhotoModal({ photoUrl, label, onClose }: PhotoModalProps) {
  const [zoom, setZoom] = useState(1);
  const [imageError, setImageError] = useState(false);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.25, 3));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.5));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-sm"
      style={{ backgroundColor: 'var(--th-bg-backdrop)' }}
      onClick={handleBackdropClick}
    >
      <div
        className="relative border rounded-xl shadow-2xl w-full max-w-3xl mx-4 animate-slideIn overflow-hidden"
        style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border)' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--th-border)' }}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm font-mono" style={{ color: 'var(--th-text-primary)' }}>
              {label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded transition-colors hover:bg-[var(--th-bg-tertiary)]"
              style={{ color: 'var(--th-text-muted)' }}
              title="Reducir"
            >
              <ZoomOut size={16} />
            </button>
            <span className="text-xs font-mono min-w-[3rem] text-center" style={{ color: 'var(--th-text-dimmed)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded transition-colors hover:bg-[var(--th-bg-tertiary)]"
              style={{ color: 'var(--th-text-muted)' }}
              title="Ampliar"
            >
              <ZoomIn size={16} />
            </button>
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded transition-colors hover:bg-[var(--th-bg-tertiary)]"
              style={{ color: 'var(--th-text-muted)' }}
              title="Abrir en nueva pestaña"
            >
              <ExternalLink size={16} />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded transition-colors hover:bg-[var(--th-bg-tertiary)]"
              style={{ color: 'var(--th-text-muted)' }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Image container */}
        <div
          className="overflow-auto"
          style={{ maxHeight: 'calc(80vh - 60px)', backgroundColor: 'var(--th-bg-primary)' }}
        >
          <div className="flex items-center justify-center min-h-[300px] p-4">
            {imageError ? (
              <div className="text-center p-8">
                <p className="text-sm font-mono" style={{ color: 'var(--th-text-muted)' }}>
                  No se pudo cargar la imagen
                </p>
                <p className="text-xs font-mono mt-2 break-all" style={{ color: 'var(--th-text-dimmed)' }}>
                  {photoUrl}
                </p>
              </div>
            ) : (
              <img
                src={photoUrl}
                alt={label}
                className="max-w-full h-auto rounded transition-transform duration-200"
                style={{ transform: `scale(${zoom})`, transformOrigin: 'center' }}
                onError={() => setImageError(true)}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
