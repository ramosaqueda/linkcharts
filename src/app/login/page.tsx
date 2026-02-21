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
    <div className="min-h-screen font-mono flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background image */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/59271.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
          quality={90}
        />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      <div className="w-full max-w-sm relative z-10">
        <div className="flex flex-col items-center justify-center gap-3 mb-8">
          <Image src="/logo_fiscalia.svg" alt="Logo" width={128} height={128} priority className="drop-shadow-2xl" style={{ filter: 'brightness(0) invert(1)' }} />
          <h1 className="text-2xl font-bold text-white drop-shadow-lg">LinkCharts</h1>
        </div>

        <div className="backdrop-blur-xl border rounded-xl p-6 shadow-2xl" style={{ backgroundColor: 'rgba(0, 20, 30, 0.7)', borderColor: 'rgba(255, 255, 255, 0.1)' }}>
          <h2 className="text-sm font-semibold mb-5 text-white">Iniciar sesión</h2>

          {error && (
            <div className="mb-4 px-3 py-2 text-xs text-red-400 bg-red-950/50 border border-red-500/30 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1 text-cyan-200/70">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-400/50 transition-colors font-mono text-white placeholder-white/30"
                style={{ backgroundColor: 'rgba(0, 50, 60, 0.5)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                placeholder="usuario@email.com"
              />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider block mb-1 text-cyan-200/70">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-400/50 transition-colors font-mono text-white placeholder-white/30"
                style={{ backgroundColor: 'rgba(0, 50, 60, 0.5)', borderColor: 'rgba(255, 255, 255, 0.15)' }}
                placeholder="••••••••"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs rounded-lg transition-all mt-4 disabled:opacity-50 disabled:cursor-not-allowed bg-cyan-600 hover:bg-cyan-500 text-white font-semibold shadow-lg shadow-cyan-900/30"
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

          <p className="text-xs text-center mt-5 text-white/50">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-cyan-400 hover:text-cyan-300 transition-colors">
              Registrarse
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
