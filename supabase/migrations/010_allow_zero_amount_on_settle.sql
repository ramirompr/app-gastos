-- Migration: Allow a fully-reimbursed expense to settle down to zero
-- Description: Si adelantás el 100% de un gasto y te lo devuelven entero,
-- el gasto queda en $0 al marcarlo como pagado (settleSharedExpense).
-- Antes la restricción exigía amount > 0 siempre, lo que bloqueaba ese caso.

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_amounts_positive;

ALTER TABLE expenses
ADD CONSTRAINT check_amounts_positive CHECK (
  amount >= 0 AND amount_ars >= 0 AND amount_usd >= 0
);
