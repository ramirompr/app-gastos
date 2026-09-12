-- Migration: Enable Row Level Security
-- Description: Configurar RLS para que cada usuario solo vea sus propios datos

-- 1. Habilitar RLS en todas las tablas
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE exchange_rates ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para categories
-- SELECT: usuarios solo ven sus propias categorías
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT: usuarios solo pueden crear categorías para sí mismos
CREATE POLICY "Users can create their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE: usuarios solo pueden editar sus propias categorías
CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE: usuarios solo pueden eliminar sus propias categorías
CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Políticas para expenses
-- SELECT
CREATE POLICY "Users can view their own expenses"
  ON expenses FOR SELECT
  USING (auth.uid() = user_id);

-- INSERT
CREATE POLICY "Users can create their own expenses"
  ON expenses FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- UPDATE
CREATE POLICY "Users can update their own expenses"
  ON expenses FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE
CREATE POLICY "Users can delete their own expenses"
  ON expenses FOR DELETE
  USING (auth.uid() = user_id);

-- 4. Políticas para exchange_rates (todos pueden leer, solo sistema escribe)
-- SELECT: cualquiera puede ver las cotizaciones
CREATE POLICY "Anyone can view exchange rates"
  ON exchange_rates FOR SELECT
  USING (true);

-- INSERT: permitir inserciones desde funciones (la app inserta vía RPC)
-- En producción, esto debería controlarse mejor (ej: API keys)
CREATE POLICY "Allow inserts to exchange_rates"
  ON exchange_rates FOR INSERT
  WITH CHECK (true);
