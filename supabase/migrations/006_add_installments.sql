-- Migration: Add installment plans (cuotas)
-- Description: Permite cargar un gasto dividido en N cuotas mensuales.
-- Cada cuota se guarda como una fila propia en expenses (con su propia fecha
-- y montos convertidos), enlazada al plan que la originó.

CREATE TABLE IF NOT EXISTS expense_installment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  total_amount NUMERIC NOT NULL CHECK (total_amount > 0),
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  num_installments INT NOT NULL CHECK (num_installments > 1),
  split_type TEXT NOT NULL DEFAULT 'personal' CHECK (split_type IN ('personal', 'invited', 'shared')),
  partner_share NUMERIC CHECK (partner_share IS NULL OR partner_share > 0),
  start_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_installment_plans_user_id ON expense_installment_plans(user_id);

ALTER TABLE expenses
  ADD COLUMN IF NOT EXISTS installment_plan_id UUID REFERENCES expense_installment_plans(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS installment_number INT;

CREATE INDEX IF NOT EXISTS idx_expenses_installment_plan_id ON expenses(installment_plan_id);

ALTER TABLE expenses
  ADD CONSTRAINT check_installment_number CHECK (
    (installment_plan_id IS NULL AND installment_number IS NULL) OR
    (installment_plan_id IS NOT NULL AND installment_number > 0)
  );

ALTER TABLE expense_installment_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own installment plans"
  ON expense_installment_plans FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own installment plans"
  ON expense_installment_plans FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own installment plans"
  ON expense_installment_plans FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own installment plans"
  ON expense_installment_plans FOR DELETE
  USING (auth.uid() = user_id);
