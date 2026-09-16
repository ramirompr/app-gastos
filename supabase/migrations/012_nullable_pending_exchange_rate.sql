-- Migration: Allow expenses to be saved with a pending dollar exchange rate
-- Description: Si al cargar un gasto falla la consulta de cotización del
-- dólar (API caída, etc.), el gasto se guarda igual con amount_ars,
-- amount_usd y exchange_rate_used en NULL ("cotización pendiente"), en vez
-- de bloquear la carga. La app reintenta resolverlos más adelante.

ALTER TABLE expenses ALTER COLUMN amount_ars DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN amount_usd DROP NOT NULL;
ALTER TABLE expenses ALTER COLUMN exchange_rate_used DROP NOT NULL;
