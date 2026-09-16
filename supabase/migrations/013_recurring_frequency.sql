ALTER TABLE recurring_expenses
  ADD COLUMN frequency_months INTEGER NOT NULL DEFAULT 1 CHECK (frequency_months >= 1);
