'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';
import { CreateCategoryModal } from '@/components/categories/CreateCategoryModal';

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  const fetchCategories = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true });
    if (!error && data) {
      setAllCategories(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchCategories();
  }, [user, fetchCategories]);

  const topLevel = allCategories.filter((c) => !c.parent_id);
  const subCount = (catId: string) => allCategories.filter((c) => c.parent_id === catId).length;

  const handleCreated = (category: Category) => {
    setAllCategories((prev) => [...prev, category]);
    setShowCreate(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      {/* Header */}
      <div className="px-4 pt-6 pb-4">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-1 text-slate-400 hover:text-white mb-5 transition text-sm"
        >
          ← Volver
        </button>
        <h1 className="text-2xl font-bold text-white">Mis Categorías</h1>
        <p className="text-slate-500 text-sm mt-1">
          {topLevel.length} {topLevel.length === 1 ? 'categoría' : 'categorías'}
        </p>
      </div>

      {/* Content */}
      <div className="px-4">
        {topLevel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">🗂️</div>
            <p className="text-slate-400 mb-1 font-medium">No tenés categorías todavía</p>
            <p className="text-slate-600 text-sm">Tocá el + para crear la primera</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {topLevel.map((cat) => {
              const subs = subCount(cat.id);
              return (
                <div
                  key={cat.id}
                  className="bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-slate-600 active:scale-95 transition-all cursor-pointer"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                    style={{ backgroundColor: cat.color }}
                  >
                    {cat.icon}
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium text-sm leading-tight">{cat.name}</p>
                    {subs > 0 && (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {subs} {subs === 1 ? 'subcategoría' : 'subcategorías'}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white text-3xl shadow-xl active:scale-90 transition-all"
        aria-label="Nueva categoría"
      >
        +
      </button>

      {showCreate && (
        <CreateCategoryModal
          parentCategories={topLevel}
          onClose={() => setShowCreate(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
}
