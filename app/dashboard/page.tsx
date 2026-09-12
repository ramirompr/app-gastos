'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/lib/auth-context';

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleSignOut = async () => {
    try {
      await signOut();
      router.push('/login');
    } catch (err) {
      console.error('Error signing out:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
          <svg
            className="animate-spin h-8 w-8 text-violet-600"
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
          <p className="text-slate-400">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-950 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
              Mis Gastos
            </h1>
            <p className="text-slate-400">
              Bienvenido, {user.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="w-full md:w-auto px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg transition duration-200"
          >
            Cerrar sesión
          </button>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Categories Card */}
          <Link
            href="/dashboard/categories"
            className="bg-slate-800 border border-slate-700 hover:border-violet-600 rounded-lg p-6 md:p-8 transition-all group"
          >
            <div className="flex items-center justify-center h-32 md:h-40">
              <div className="text-center">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🗂️</div>
                <p className="text-white font-semibold">Categorías</p>
                <p className="text-slate-500 text-xs mt-1">Organizá tus gastos</p>
              </div>
            </div>
          </Link>

          {/* Coming Soon Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 md:p-8">
            <div className="flex items-center justify-center h-32 md:h-40">
              <div className="text-center">
                <svg
                  className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <p className="text-slate-500 text-sm font-medium">
                  Próximamente
                </p>
              </div>
            </div>
          </div>

          {/* Coming Soon Card */}
          <div className="bg-slate-800 border border-slate-700 rounded-lg p-6 md:p-8">
            <div className="flex items-center justify-center h-32 md:h-40">
              <div className="text-center">
                <svg
                  className="w-12 h-12 md:w-16 md:h-16 text-slate-600 mx-auto mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p className="text-slate-500 text-sm font-medium">
                  Próximamente
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Section */}
        <div className="mt-8 md:mt-12 p-6 md:p-8 bg-slate-800 border border-slate-700 rounded-lg">
          <h2 className="text-xl md:text-2xl font-bold text-white mb-4">
            🚀 Próximamente
          </h2>
          <ul className="space-y-2 text-slate-300">
            <li className="flex items-start gap-3">
              <span className="text-violet-500 mt-1">✓</span>
              <span>Gestión de categorías con subcategorías</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-500 mt-1">✓</span>
              <span>Carga de gastos en ARS y USD</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-500 mt-1">✓</span>
              <span>Conversión automática de monedas</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-500 mt-1">✓</span>
              <span>Seguimiento de gastos compartidos con novia</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-violet-500 mt-1">✓</span>
              <span>Reportes y análisis</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
