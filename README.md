# App de Gastos

Aplicación web personal (PWA) para cargar gastos rápidamente desde el celular, con soporte para dos monedas (ARS/USD) y categorías anidadas.

## Stack

- **Frontend**: Next.js 15 (App Router) + Tailwind CSS + TypeScript
- **Backend/DB**: Supabase (PostgreSQL + Auth)
- **Hosting**: Vercel
- **Repo**: GitHub

## Setup Inicial

### 1. Variables de Entorno

Copia `.env.example` a `.env.local` y rellena tus credenciales de Supabase:

```bash
cp .env.example .env.local
```

Edita `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_EXCHANGE_API=https://api.bluelytics.com.ar/json/last
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Crear las Migraciones en Supabase

1. Abre la [consola de Supabase](https://app.supabase.com) de tu proyecto
2. Ve a **SQL Editor** → **New Query**
3. Copia el contenido de `supabase/migrations/` y ejecuta cada migración en orden:
   - `001_create_categories_table.sql`
   - `002_create_expenses_table.sql`
   - `003_create_exchange_rates_table.sql`
   - `004_enable_rls.sql`

O usa la CLI de Supabase:
```bash
supabase db push
```

### 4. Ejecutar el Servidor de Desarrollo

```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## Características (v1)

- [x] Setup de Next.js + Tailwind + TypeScript
- [x] Integración Supabase
- [x] Lógica de cotización ARS/USD
- [ ] Auth (email + password)
- [ ] CRUD de categorías
- [ ] Carga de gastos
- [ ] Listado de gastos con filtros
- [ ] Vista de pendientes con novia
- [ ] PWA instalable
- [ ] Deploy en Vercel

## Estructura del Proyecto

```
app/              # Next.js app router
  layout.tsx      # Layout principal
  page.tsx        # Página de inicio
  globals.css     # Estilos globales

lib/              # Utilidades y lógica compartida
  supabase.ts     # Cliente de Supabase
  types.ts        # Tipos TypeScript
  exchange-rates.ts # Lógica de cotización

public/
  manifest.json   # PWA manifest

supabase/
  migrations/     # Migraciones SQL
```

## Modelo de Datos

### categories
Almacena las categorías de gastos, con soporte de anidamiento (subcategorías).

### expenses
Registra los gastos con:
- Monto en la moneda elegida
- Conversión automática a la otra moneda
- Cotización snapshoteada (fija)
- Tipo de gasto: `personal`, `invited`, `shared`
- Estado de saldación (para gastos compartidos)

### exchange_rates
Caché diaria de la cotización USD → ARS, obtenida de APIs externas.

## Cotización USD/ARS

La app obtiene automáticamente la cotización:
1. Consulta si existe para el día actual
2. Si no, obtiene de [Bluelytics](https://api.bluelytics.com.ar/json/last)
3. Guarda en caché para futuros usos
4. Snapshottea la cotización con cada gasto (no recalcula)

## Próximos Pasos

1. Implementar Authentication (Supabase Auth)
2. Crear componentes de CRUD para categorías
3. Implementar formulario de carga de gastos
4. Crear vistas/reportes

## Deploy en Vercel

```bash
git push
```

Vercel se deployará automáticamente en cada push a `main`.

## Recursos

- [Next.js Docs](https://nextjs.org/docs)
- [Supabase Docs](https://supabase.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Vercel](https://vercel.com/docs)
