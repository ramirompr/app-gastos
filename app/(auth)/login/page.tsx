'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function LoginPage() {
  const router = useRouter();
  const { signIn, loading: authLoading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validación básica
      if (!email || !password) {
        throw new Error('Por favor completa todos los campos');
      }

      if (!/\S+@\S+\.\S+/.test(email)) {
        throw new Error('Email inválido');
      }

      if (password.length < 6) {
        throw new Error('La contraseña debe tener al menos 6 caracteres');
      }

      await signIn(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-950">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-4xl font-bold text-white mb-2">
            Mis Gastos
          </h1>
        </div>

        {/* Login Card */}
        <div className="bg-slate-800 rounded-lg shadow-2xl p-6 md:p-8 border border-slate-700">
          <h2 className="text-2xl font-bold text-white mb-6">Iniciar sesión</h2>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 p-3 md:p-4 bg-red-950 border border-red-700 rounded-lg flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@ejemplo.com"
                disabled={loading || authLoading}
                className="w-full px-4 py-2.5 md:py-3 bg-slate-900 border border-slate-600 text-white rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Password Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loading || authLoading}
                className="w-full px-4 py-2.5 md:py-3 bg-slate-900 border border-slate-600 text-white rounded-lg placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition disabled:opacity-50 disabled:cursor-not-allowed"
              />
            </div>

            {/* Remember me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                className="h-4 w-4 rounded accent-violet-600 cursor-pointer"
              />
              <label
                htmlFor="remember"
                className="ml-2 block text-sm text-slate-300 cursor-pointer"
              >
                Recuérdame
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading || authLoading}
              className="w-full bg-violet-600 hover:bg-violet-700 disabled:bg-slate-700 text-white font-semibold py-2.5 md:py-3 rounded-lg transition duration-200 mt-6 flex items-center justify-center gap-2 disabled:cursor-not-allowed"
            >
              {(loading || authLoading) && (
                <svg
                  className="animate-spin h-5 w-5"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              )}
              {loading || authLoading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </button>
          </form>

          {/* Divider */}
          <div className="relative mt-6 mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-800 text-slate-400">
                ¿No tienes cuenta?
              </span>
            </div>
          </div>

          {/* Register Button */}
          <Link
            href="/signup"
            className="block w-full text-center border border-violet-600 text-violet-400 hover:bg-slate-700 font-semibold py-2.5 md:py-3 rounded-lg transition duration-200"
          >
            Crear cuenta
          </Link>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-slate-500 mt-8">
          © 2026 Mis Gastos. Todos los derechos reservados.
        </p>
      </div>
    </div>
  );
}
