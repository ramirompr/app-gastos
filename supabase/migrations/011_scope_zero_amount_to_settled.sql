-- Migration: Scope the zero-amount allowance to settled shared/invited expenses
-- Description: La migración 010 permitió amount >= 0 para toda la tabla, pero
-- el objetivo real era solo permitir que un gasto compartido quede en $0 al
-- liquidarse por completo (settleSharedExpense). Esto lo acota a ese caso:
-- cualquier otro gasto (personal, o compartido/invitado sin liquidar) sigue
-- necesitando un monto positivo.

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_amounts_positive;

ALTER TABLE expenses
ADD CONSTRAINT check_amounts_positive CHECK (
  (amount > 0 AND (amount_ars IS NULL OR amount_ars > 0) AND (amount_usd IS NULL OR amount_usd > 0))
  OR (amount = 0 AND is_settled AND split_type IN ('shared', 'invited'))
);
