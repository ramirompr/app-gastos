# Migraciones de Supabase

Este directorio contiene las migraciones SQL para inicializar la base de datos del proyecto.

## Cómo ejecutar las migraciones

### Opción 1: Usando la Consola de Supabase (recomendado para desarrollo rápido)

1. Abre [app.supabase.com](https://app.supabase.com)
2. Selecciona tu proyecto
3. Ve a **SQL Editor** en el menú lateral
4. Haz clic en **New Query**
5. Copia el contenido de cada archivo `.sql` en orden:
   - `001_create_categories_table.sql`
   - `002_create_expenses_table.sql`
   - `003_create_exchange_rates_table.sql`
   - `004_enable_rls.sql`
6. Haz clic en **Run** para ejecutar cada migración

### Opción 2: Usando la CLI de Supabase

Si tienes la CLI instalada:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## Estructura de las Migraciones

### 001_create_categories_table.sql
Crea la tabla `categories` para almacenar categorías de gastos con soporte de subcategorías.

**Campos:**
- `id`: UUID primaria
- `user_id`: FK a auth.users
- `name`: nombre de la categoría
- `parent_id`: FK a sí misma (permite anidamiento)
- `created_at`: timestamp

### 002_create_expenses_table.sql
Crea la tabla `expenses` para almacenar los gastos con soporte de dos monedas.

**Campos:**
- `amount`: monto original
- `currency`: ARS o USD
- `amount_ars` y `amount_usd`: snapshots de ambas monedas
- `exchange_rate_used`: cotización usada ese día
- `split_type`: personal, invited, o shared
- `partner_share`: monto que le corresponde a la novia (solo si shared)
- `is_settled`: si ya fue pagado (para shared)

### 003_create_exchange_rates_table.sql
Crea la tabla `exchange_rates` para cachear la cotización diaria USD → ARS.

**Campos:**
- `date`: fecha única
- `usd_to_ars`: cotización de ese día
- `fetched_at`: cuándo se obtuvo

### 004_enable_rls.sql
Habilita Row Level Security (RLS) en todas las tablas para que cada usuario solo vea sus datos.

- `categories`: cada usuario solo ve/edita/elimina las suyas
- `expenses`: cada usuario solo ve/edita/elimina los suyos
- `exchange_rates`: públicamente legible (caché compartida)

## Notas de Seguridad

- **RLS activo**: Todas las operaciones respetan el usuario autenticado
- **Constraints**: Se valida que los montos sean positivos y que los datos sean consistentes
- **ForeignKeys**: Se previene la eliminación de categorías si tienen gastos asociados
- **Unique constraints**: No se permiten categorías duplicadas para un usuario

## Datos de Ejemplo

Para agregar datos de prueba, puedes ejecutar:

```sql
-- Insertar una categoría de ejemplo
INSERT INTO categories (user_id, name, created_at)
VALUES ('your-user-id', 'Comidas', NOW());

-- Insertar una subcategoría
INSERT INTO categories (user_id, name, parent_id, created_at)
VALUES ('your-user-id', 'Restaurantes', 'category-id', NOW());
```

## Troubleshooting

- **Error: "user_id is not unique"**: Asegúrate de tener el constraint correcto (es UNIQUE a nivel user + name + parent_id, no global)
- **RLS bloqueando inserciones**: Verifica que hayas ejecutado `004_enable_rls.sql`
- **FK error en expenses**: Asegúrate de que la categoría existe y pertenece al mismo usuario
