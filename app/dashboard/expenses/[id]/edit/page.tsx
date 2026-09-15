'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';
import { Expense } from '@/lib/types';
import { ExpenseForm } from '@/components/expenses/ExpenseForm';

export default function EditExpensePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();

  const [expense, setExpense] = useState<Expense | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const fetchExpense = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from('expenses')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();
    if (!data) {
      router.push('/dashboard');
      return;
    }
    setExpense(data);
    setLoading(false);
  }, [user, id, router]);

  useEffect(() => {
    if (user) fetchExpense();
  }, [user, fetchExpense]);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="animate-spin h-8 w-8 border-2 border-violet-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user || !expense) return null;

  return <ExpenseForm expense={expense} />;
}
