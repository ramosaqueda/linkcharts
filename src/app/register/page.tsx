'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Error al registrar');
        setLoading(false);
        return;
      }

      // Auto-login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError('Registro exitoso, pero error al iniciar sesión');
        setLoading(false);
      } else {
        router.push('/dashboard');
      }
    } catch {
      setError('Error de conexión');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen font-mono flex items-center justify-center px-4" style={{ backgroundColor: 'var(--th-bg-primary)' }}>
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <Image src="/logo_fiscalia.svg" alt="Logo" width={128} height={128} priority style={{ filter: 'var(--th-logo-filter)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--th-text-primary)' }}>LinkCharts</h1>
        </div>

        <div className="border rounded-xl p-6" style={{ backgroundColor: 'var(--th-bg-secondary)', borderColor: 'var(--th-border-strong)' }}>
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--th-text-primary)' }}>Crear cuenta</h2>

          {error && (
            <div className="mb-4 px-3 py-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                Nombre
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoFocus
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                placeholder="Tu nombre"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                placeholder="usuario@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs rounded-lg transition-colors mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: 'var(--th-text-on-accent)', backgroundColor: 'var(--th-accent)' }}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={14} />
                  Crear cuenta
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: 'var(--th-text-dimmed)' }}>
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="transition-colors" style={{ color: 'var(--th-accent)' }}>
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
