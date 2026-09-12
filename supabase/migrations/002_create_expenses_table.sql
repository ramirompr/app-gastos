-- Migration: Create expenses table
-- Description: Tabla de gastos con soporte de múltiples monedas (ARS/USD) y tipos de split

CREATE TABLE IF NOT EXISTS expenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
  amount_ars NUMERIC NOT NULL,
  amount_usd NUMERIC NOT NULL,
  exchange_rate_used NUMERIC NOT NULL,
  date DATE NOT NULL,
  split_type TEXT NOT NULL DEFAULT 'personal' CHECK (split_type IN ('personal', 'invited', 'shared')),
  partner_share NUMERIC,
  is_settled BOOLEAN DEFAULT FALSE,
  settled_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Constraints para garantizar integridad de datos
ALTER TABLE expenses
ADD CONSTRAINT check_amounts_positive CHECK (amount > 0 AND amount_ars > 0 AND amount_usd > 0),
ADD CONSTRAINT check_exchange_rate_positive CHECK (exchange_rate_used > 0),
ADD CONSTRAINT check_partner_share CHECK (partner_share IS NULL OR partner_share > 0),
ADD CONSTRAINT check_settled_consistency CHECK (
  (split_type = 'shared' AND partner_share IS NOT NULL) OR
  (split_type IN ('personal', 'invited') AND partner_share IS NULL)
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_expenses_user_id ON expenses(user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_category_id ON expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_split_type ON expenses(split_type);
CREATE INDEX IF NOT EXISTS idx_expenses_user_date ON expenses(user_id, date);
CREATE INDEX IF NOT EXISTS idx_expenses_user_category ON expenses(user_id, category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_unsettled ON expenses(user_id, is_settled) WHERE split_type = 'shared' AND NOT is_settled;

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION update_expenses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS expenses_updated_at_trigger ON expenses;
CREATE TRIGGER expenses_updated_at_trigger
BEFORE UPDATE ON expenses
FOR EACH ROW
EXECUTE FUNCTION update_expenses_updated_at();
