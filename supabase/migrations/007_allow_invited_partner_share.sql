-- Migration: Allow partner_share on 'invited' expenses too
-- Description: 'invited' ahora también puede llevar un monto (cuánto invitaste),
-- igual que 'shared'. Solo 'personal' no debe tener partner_share.

ALTER TABLE expenses DROP CONSTRAINT IF EXISTS check_settled_consistency;

ALTER TABLE expenses
ADD CONSTRAINT check_settled_consistency CHECK (
  (split_type IN ('shared', 'invited') AND partner_share IS NOT NULL) OR
  (split_type = 'personal' AND partner_share IS NULL)
);
