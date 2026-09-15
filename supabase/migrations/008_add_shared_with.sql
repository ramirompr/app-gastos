-- Migration: Add shared_with free-text field
-- Description: Nombre(s) de quién(es) te deben en un gasto compartido.

ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shared_with TEXT;
ALTER TABLE expense_installment_plans ADD COLUMN IF NOT EXISTS shared_with TEXT;
