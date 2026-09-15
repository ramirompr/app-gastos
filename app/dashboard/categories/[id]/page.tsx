'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';
import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { PlusIcon } from '@/components/icons/PlusIcon';

type ActionSheet =
  | { type: 'menu'; category: Category }
  | { type: 'deleteConfirm'; category: Category };

export default function SubcategoriesPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [parent, setParent] = useState<Category | null>(null);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [actionSheet, setActionSheet] = useState<ActionSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchData = useCallback(async () => {
    if (!user || !id) return;
    const [{ data: parentData }, { data: subsData }] = await Promise.all([
      supabase.from('categories').select('*').eq('id', id).eq('user_id', user.id).single(),
      supabase.from('categories').select('*').eq('parent_id', id).order('created_at', { ascending: true }),
    ]);
    if (!parentData) { router.push('/dashboard/categories'); return; }
    setParent(parentData);
    setSubcategories(subsData ?? []);
    setLoading(false);
  }, [user, id, router]);

  useEffect(() => {
    if (user) fetchData();
  }, [user, fetchData]);

  const handleSaved = (saved: Category) => {
    setSubcategories((prev) => {
      const exists = prev.find((c) => c.id === saved.id);
      return exists ? prev.map((c) => (c.id === saved.id ? saved : c)) : [...prev, saved];
    });
    setShowCreate(false);
    setEditingCategory(null);
  };

  const handleDelete = async (category: Category) => {
    setDeleting(true);
    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;
      setSubcategories((prev) => prev.filter((c) => c.id !== category.id));
      setActionSheet(null);
    } catch {
      // keep sheet open on error
    } finally {
      setDeleting(false);
    }
  };

  const openMenu = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setActionSheet({ type: 'menu', category: cat });
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !parent) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Subcategorías"
        onBack={() => router.push('/dashboard/categories')}
        onMenu={() => setMenuOpen(true)}
      />
      <div className="px-4 pb-4">
        {/* Parent category info */}
        <div className="flex items-center gap-4 justify-center">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-lg flex-shrink-0"
            style={{ backgroundColor: parent.color }}
          >
            {parent.icon}
          </div>
          <div>
            <p className="text-white font-semibold">{parent.name}</p>
            <p className="text-slate-500 text-sm">
              {subcategories.length}{' '}
              {subcategories.length === 1 ? 'subcategoría' : 'subcategorías'}
            </p>
          </div>
        </div>
      </div>

      <div className="px-4">
        {subcategories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="text-6xl mb-4">📂</div>
            <p className="text-slate-400 mb-1 font-medium">Sin subcategorías</p>
            <p className="text-slate-600 text-sm">Tocá el + para agregar una</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {subcategories.map((cat) => (
              <div
                key={cat.id}
                className="relative bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-slate-600 active:scale-95 transition-all"
              >
                <button
                  onClick={(e) => openMenu(e, cat)}
                  className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition text-lg leading-none"
                >
                  ⋮
                </button>

                <div
                  className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-lg"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.icon}
                </div>
                <p className="text-white font-medium text-sm text-center leading-tight">
                  {cat.name}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
        aria-label="Nueva subcategoría"
      >
        <PlusIcon size={26} />
      </button>

      {showCreate && (
        <CategoryFormModal
          fixedParentId={id}
          parentCategories={[]}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {editingCategory && (
        <CategoryFormModal
          category={editingCategory}
          fixedParentId={id}
          parentCategories={[]}
          onClose={() => setEditingCategory(null)}
          onSaved={handleSaved}
        />
      )}

      {actionSheet && (
        <div
          className="fixed inset-0 z-40 bg-black/60"
          onClick={() => setActionSheet(null)}
        />
      )}

      {actionSheet?.type === 'menu' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="px-6 pt-3 pb-10">
            <div className="flex items-center gap-3 mb-6">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                style={{ backgroundColor: actionSheet.category.color }}
              >
                {actionSheet.category.icon}
              </div>
              <p className="text-white font-semibold">{actionSheet.category.name}</p>
            </div>

            <button
              onClick={() => {
                setEditingCategory(actionSheet.category);
                setActionSheet(null);
              }}
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
            >
              <span className="text-xl">✏️</span>
              <span className="text-white font-medium">Editar</span>
            </button>

            <button
              onClick={() =>
                setActionSheet({ type: 'deleteConfirm', category: actionSheet.category })
              }
              className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
            >
              <span className="text-xl">🗑️</span>
              <span className="text-red-400 font-medium">Eliminar</span>
            </button>
          </div>
        </div>
      )}

      {actionSheet?.type === 'deleteConfirm' && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-900 rounded-t-2xl border-t border-slate-800">
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-slate-700 rounded-full" />
          </div>
          <div className="px-6 pt-3 pb-10">
            <p className="text-white font-semibold text-lg mb-2">
              ¿Eliminar {actionSheet.category.name}?
            </p>
            <p className="text-slate-400 text-sm mb-6">Esta acción no se puede deshacer.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setActionSheet(null)}
                className="flex-1 py-4 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-xl transition"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(actionSheet.category)}
                disabled={deleting}
                className="flex-1 py-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold rounded-xl transition"
              >
                {deleting ? 'Eliminando...' : 'Eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
