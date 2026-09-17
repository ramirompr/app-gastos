-- Migration: Confirmaciones de gastos recurrentes sin gasto asociado
-- Description: Permite marcar un gasto recurrente como pagado en un mes
-- puntual sin crear un registro en `expenses` (ej. porque ya se cargó por
-- otro lado, o se pagó pero no se quiere trackear el monto exacto).

CREATE TABLE IF NOT EXISTS recurring_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recurring_expense_id UUID NOT NULL REFERENCES recurring_expenses(id) ON DELETE CASCADE,
  month DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (recurring_expense_id, month)
);

CREATE INDEX IF NOT EXISTS idx_recurring_confirmations_user_id ON recurring_confirmations(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_confirmations_recurring_id ON recurring_confirmations(recurring_expense_id);

ALTER TABLE recurring_confirmations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recurring confirmations"
  ON recurring_confirmations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own recurring confirmations"
  ON recurring_confirmations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own recurring confirmations"
  ON recurring_confirmations FOR DELETE
  USING (auth.uid() = user_id);
