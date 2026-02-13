'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { LogIn } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email o contraseña incorrectos');
      setLoading(false);
    } else {
      router.push('/dashboard');
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
          <h2 className="text-sm font-semibold mb-5" style={{ color: 'var(--th-text-primary)' }}>Iniciar sesión</h2>

          {error && (
            <div className="mb-4 px-3 py-2 text-xs text-red-400 bg-red-950/30 border border-red-900/50 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1" style={{ color: 'var(--th-text-dimmed)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
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
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-[var(--th-border-focus)] transition-colors font-mono"
                style={{ backgroundColor: 'var(--th-bg-input)', borderColor: 'var(--th-border)', color: 'var(--th-text-primary)' }}
                placeholder="••••••••"
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
                  <LogIn size={14} />
                  Ingresar
                </>
              )}
            </button>
          </form>

          <p className="text-xs text-center mt-5" style={{ color: 'var(--th-text-dimmed)' }}>
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="transition-colors" style={{ color: 'var(--th-accent)' }}>
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
