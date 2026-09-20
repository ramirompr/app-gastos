-- Migration: Allow partner_share = 0 on a settled shared expense
-- Description: Al liquidar un gasto compartido ahora se puede editar cuánto
-- te devolvieron realmente (ver settleSharedExpense en lib/expenses.ts), y
-- ese valor puede terminar siendo $0 (no te devolvieron nada). Antes
-- check_partner_share exigía siempre > 0. Se acota, igual que
-- check_amounts_positive, al caso de un gasto compartido ya liquidado.

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_partner_share;

ALTER TABLE expenses
ADD CONSTRAINT check_partner_share CHECK (
  partner_share IS NULL
  OR partner_share > 0
  OR (partner_share = 0 AND is_settled AND split_type = 'shared')
);
