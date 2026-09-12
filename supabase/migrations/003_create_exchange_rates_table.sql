-- Migration: Create exchange_rates table
-- Description: Caché de cotizaciones USD -> ARS por día

CREATE TABLE IF NOT EXISTS exchange_rates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL UNIQUE,
  usd_to_ars NUMERIC NOT NULL,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índice para búsquedas rápidas por fecha
CREATE INDEX IF NOT EXISTS idx_exchange_rates_date ON exchange_rates(date);

-- Constraints
ALTER TABLE exchange_rates
ADD CONSTRAINT check_usd_to_ars_positive CHECK (usd_to_ars > 0);

-- Función para limpiar datos antiguos (más de 2 años)
CREATE OR REPLACE FUNCTION clean_old_exchange_rates()
RETURNS void AS $$
BEGIN
  DELETE FROM exchange_rates
  WHERE date < CURRENT_DATE - INTERVAL '2 years';
END;
$$ LANGUAGE plpgsql;
