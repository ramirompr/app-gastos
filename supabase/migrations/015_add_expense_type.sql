-- Migration: Tipo de movimiento (gasto o ingreso)
-- Description: Permite que una fila de `expenses` represente tanto un gasto
-- como un ingreso, reutilizando toda la infraestructura existente (moneda,
-- categorías, fecha, cache). El split (personal/invitado/compartido), las
-- cuotas y los recurrentes siguen siendo exclusivos de los gastos: los
-- ingresos siempre se cargan como 'personal', sin instalment_plan_id ni
-- recurring_expense_id.

ALTER TABLE expenses
ADD COLUMN type TEXT NOT NULL DEFAULT 'expense' CHECK (type IN ('expense', 'income'));

CREATE INDEX IF NOT EXISTS idx_expenses_user_type ON expenses(user_id, type);
