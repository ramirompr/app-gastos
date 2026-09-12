'use client';

import { useEffect, useState } from 'react';

export default function Home() {
  const [supabaseConnected, setSupabaseConnected] = useState(false);

  useEffect(() => {
    // Check if Supabase environment variables are set
    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    const hasSupabaseKey = !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    setSupabaseConnected(hasSupabaseUrl && hasSupabaseKey);
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4">App de Gastos</h1>
          <p className="text-gray-600 mb-8">Seguimiento personal de gastos en ARS y USD</p>

          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Supabase</span>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                  supabaseConnected
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {supabaseConnected ? 'Conectado' : 'Configura env vars'}
                </span>
              </div>
            </div>
          </div>

          <div className="text-sm text-gray-500">
            <p>🚀 Próximamente:</p>
            <ul className="mt-4 space-y-2 text-left">
              <li>✓ Autenticación</li>
              <li>✓ CRUD de categorías</li>
              <li>✓ Carga de gastos</li>
              <li>✓ Conversión ARS/USD</li>
            </ul>
          </div>
        </div>
      </div>
    </main>
  );
}
