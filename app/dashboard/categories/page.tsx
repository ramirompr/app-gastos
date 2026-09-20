'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Category } from '@/lib/types';
import { peekCategories, getCategoriesCached, useCachedResource, invalidateAppData } from '@/lib/app-data';
import { pluralize } from '@/lib/pluralize';
import { CategoryFormModal } from '@/components/categories/CategoryFormModal';
import { AppMenu } from '@/components/layout/AppMenu';
import { PageHeader } from '@/components/layout/PageHeader';
import { PlusIcon } from '@/components/icons/PlusIcon';
import { BottomSheet } from '@/components/ui/BottomSheet';
import { Container } from '@/components/layout/Container';
import { Emoji } from '@/components/ui/Emoji';
import { SkeletonGrid } from '@/components/ui/Skeleton';
import { MoreVertical, Pencil, Trash2, Tags } from 'lucide-react';

type ActionSheet =
  | { type: 'menu'; category: Category }
  | { type: 'deleteConfirm'; category: Category; subCount: number };

export default function CategoriesPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [actionSheet, setActionSheet] = useState<ActionSheet | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  // Ediciones optimistas locales (crear/editar/borrar) que todavía no se
  // reflejan en el cache compartido — así la pantalla responde al instante
  // sin esperar el refetch. Se combinan con lo que venga del cache.
  const [localOverride, setLocalOverride] = useState<Category[] | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const { data: cachedCategories, loading } = useCachedResource(
    peekCategories,
    () => (user ? getCategoriesCached(user.id) : null),
    [user?.id]
  );

  const allCategories = localOverride ?? cachedCategories ?? [];
  const topLevel = allCategories.filter((c) => !c.parent_id);
  const subCount = (catId: string) => allCategories.filter((c) => c.parent_id === catId).length;

  const handleSaved = (saved: Category) => {
    setLocalOverride((prev) => {
      const base = prev ?? cachedCategories ?? [];
      const exists = base.find((c) => c.id === saved.id);
      return exists ? base.map((c) => (c.id === saved.id ? saved : c)) : [...base, saved];
    });
    invalidateAppData();
    setShowCreate(false);
    setEditingCategory(null);
  };

  const handleDelete = async (category: Category) => {
    setDeleting(true);
    setDeleteError('');
    try {
      const { error } = await supabase.from('categories').delete().eq('id', category.id);
      if (error) throw error;
      setLocalOverride((prev) =>
        (prev ?? cachedCategories ?? []).filter(
          (c) => c.id !== category.id && c.parent_id !== category.id
        )
      );
      invalidateAppData();
      setActionSheet(null);
    } catch {
      setDeleteError(
        'No se pudo eliminar. Puede que todavía tenga movimientos asociados: movelos o borralos primero.'
      );
    } finally {
      setDeleting(false);
    }
  };

  const openMenu = (e: React.MouseEvent, cat: Category) => {
    e.stopPropagation();
    setActionSheet({ type: 'menu', category: cat });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-950 pb-24">
      <PageHeader
        title="Mis Categorías"
        onBack={() => router.push('/dashboard')}
        onMenu={() => setMenuOpen(true)}
      />
      <p className="text-slate-500 text-sm text-center px-4 mb-2">
        {loading ? '' : `${topLevel.length} ${pluralize(topLevel.length, 'categoría')}`}
      </p>

      <Container>
        {loading ? (
          <SkeletonGrid />
        ) : topLevel.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Tags size={56} strokeWidth={1.25} className="text-slate-700 mb-4" />
            <p className="text-slate-400 mb-1 font-medium">No tenés categorías todavía</p>
            <p className="text-slate-600 text-sm">Tocá el + para crear la primera</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {topLevel.map((cat) => {
              const subs = subCount(cat.id);
              return (
                <div
                  key={cat.id}
                  onClick={() => router.push(`/dashboard/categories/${cat.id}`)}
                  className="relative bg-slate-800 border border-slate-700/50 rounded-2xl p-4 flex flex-col items-center gap-3 hover:border-slate-600 active:scale-95 transition-all cursor-pointer"
                >
                  <button
                    onClick={(e) => openMenu(e, cat)}
                    aria-label="Opciones"
                    className="absolute top-2 right-2 w-7 h-7 flex items-center justify-center text-slate-500 hover:text-slate-300 rounded-lg hover:bg-slate-700 transition"
                  >
                    <MoreVertical size={18} />
                  </button>

                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg"
                    style={{ backgroundColor: cat.color }}
                  >
                    <Emoji emoji={cat.icon} size={30} />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-medium text-sm leading-tight">{cat.name}</p>
                    {subs > 0 ? (
                      <p className="text-slate-500 text-xs mt-0.5">
                        {subs} {pluralize(subs, 'subcategoría')}
                      </p>
                    ) : (
                      <p className="text-slate-600 text-xs mt-0.5">Sin subcategorías</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Container>

      {/* FAB */}
      <button
        onClick={() => setShowCreate(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-violet-600 hover:bg-violet-700 rounded-full flex items-center justify-center text-white shadow-xl active:scale-90 transition-all"
        aria-label="Nueva categoría"
      >
        <PlusIcon size={26} />
      </button>

      {/* Create modal */}
      {showCreate && (
        <CategoryFormModal
          parentCategories={topLevel}
          onClose={() => setShowCreate(false)}
          onSaved={handleSaved}
        />
      )}

      {/* Edit modal */}
      {editingCategory && (
        <CategoryFormModal
          category={editingCategory}
          parentCategories={topLevel.filter((c) => c.id !== editingCategory.id)}
          onClose={() => setEditingCategory(null)}
          onSaved={handleSaved}
        />
      )}

      {/* Action sheet: menu */}
      {actionSheet?.type === 'menu' && (
        <BottomSheet onClose={() => setActionSheet(null)}>
          {/* Category header */}
          <div className="flex items-center gap-3 mb-6">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: actionSheet.category.color }}
            >
              <Emoji emoji={actionSheet.category.icon} size={22} />
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
            <Pencil size={20} strokeWidth={1.75} className="text-slate-400" />
            <span className="text-white font-medium">Editar</span>
          </button>

          <button
            onClick={() => {
              setDeleteError('');
              setActionSheet({
                type: 'deleteConfirm',
                category: actionSheet.category,
                subCount: subCount(actionSheet.category.id),
              });
            }}
            className="w-full flex items-center gap-4 px-4 py-4 rounded-xl hover:bg-slate-800 transition text-left"
          >
            <Trash2 size={20} strokeWidth={1.75} className="text-red-400" />
            <span className="text-red-400 font-medium">Eliminar</span>
          </button>
        </BottomSheet>
      )}

      {/* Action sheet: delete confirm */}
      {actionSheet?.type === 'deleteConfirm' && (
        <BottomSheet onClose={() => setActionSheet(null)}>
          <p className="text-white font-semibold text-lg mb-2">
            ¿Eliminar {actionSheet.category.name}?
          </p>
          {actionSheet.subCount > 0 && (
            <p className="text-amber-400 text-sm mb-4">
              También se van a eliminar sus {actionSheet.subCount}{' '}
              {pluralize(actionSheet.subCount, 'subcategoría')}.
            </p>
          )}
          <p className="text-slate-400 text-sm mb-2">Esta acción no se puede deshacer.</p>
          {deleteError && <p className="text-red-400 text-sm mb-4">{deleteError}</p>}
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
        </BottomSheet>
      )}

      <AppMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}
