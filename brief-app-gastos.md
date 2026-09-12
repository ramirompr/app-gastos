# Brief: app de seguimiento de gastos personales

## Objetivo
App web personal (PWA) para cargar gastos rápido desde el celular. No es una app de finanzas/balance de sueldo — el foco es registrar en qué se gasta, con dos necesidades puntuales:

1. Categorías anidadas (subcategorías) para clasificar gastos con más detalle.
2. Discriminar gastos "invitados" (los pagué yo, sin devolución esperada) de gastos "a medias" con mi novia (ella me devuelve su parte, a veces junta varios gastos en un pago semanal).

## Stack
- **Frontend**: Next.js (App Router) + Tailwind CSS
- **Backend/DB**: Supabase (Postgres + Auth)
- **Hosting**: Vercel
- **Repo**: GitHub
- Formato PWA (instalable en el celular, sin publicar en tiendas de apps)

## Modelo de datos (v1)

### `categories`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> auth.users | |
| name | text | |
| parent_id | uuid FK -> categories.id, nullable | permite subcategorías (ej: "Novia" > "Regalos") |
| created_at | timestamp | |

### `expenses`
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK -> auth.users | |
| category_id | uuid FK -> categories.id | |
| description | text | |
| amount | numeric | monto tal cual lo cargué |
| currency | text | 'ARS' o 'USD' — moneda en la que cargué el gasto |
| amount_ars | numeric | snapshot del monto en pesos, calculado al momento de cargar |
| amount_usd | numeric | snapshot del monto en dólares, calculado al momento de cargar |
| exchange_rate_used | numeric | cotización usada ese día (para trazabilidad) |
| date | date | |
| split_type | text | 'personal' \| 'invited' \| 'shared' |
| partner_share | numeric, nullable | cuánto le corresponde a ella (solo si shared) |
| is_settled | boolean, default false | si ya me devolvió esa parte |
| settled_at | timestamp, nullable | |
| created_at | timestamp | |

### `exchange_rates` (caché de cotización)
| campo | tipo | notas |
|---|---|---|
| id | uuid PK | |
| date | date, unique | un registro por día |
| usd_to_ars | numeric | cotización de ese día |
| fetched_at | timestamp | |

**Lógica al cargar un gasto**: buscar si ya existe cotización para hoy en `exchange_rates`; si no existe, pedirla a una API gratuita (ej. dolarapi.com) y guardarla. Con esa cotización calcular `amount_ars` y `amount_usd` y guardarlos junto con el gasto — quedan fijos para siempre, no se recalculan después. Esto permite ver el gasto mensual en dólares a lo largo del año reflejando el valor real de cada momento, no el dólar de hoy.

## Funcionalidad v1 (en orden de prioridad)
1. Auth simple con Supabase (email + password), un solo usuario.
2. CRUD de categorías, con soporte de anidamiento (crear subcategoría dentro de otra).
3. Cargar gasto: monto, moneda, categoría (o subcategoría), fecha, descripción, y tipo (personal / la invité / a medias — si es "a medias" pedir el monto que le corresponde a ella).
4. Listado de gastos con filtros por categoría, fecha y tipo.
5. Vista "pendientes con mi novia": gastos con split_type='shared' e is_settled=false, con el total que me debe. Acción para seleccionar varios y marcarlos como saldados de una vez (para cuando me paga el resumen semanal).
6. Poder editar un gasto ya cargado (ej: pasar de "la invité" a "a medias" cuando después decide pagarme la mitad).
7. Configurar como PWA instalable (manifest + ícono).
8. Deploy en Vercel conectado al repo de GitHub.

## Explícitamente fuera de la v1
- Balance de ingresos vs gastos / sueldo.
- Multi-usuario real (más allá del dueño de la cuenta).
- App nativa / publicación en tiendas.

## Manejo de moneda (ARS/USD)
Cada gasto se puede cargar en ARS o en USD. Al guardarlo, la app calcula automáticamente el equivalente en la otra moneda usando la cotización del día (cacheada en `exchange_rates`, consultada a una API gratuita solo una vez por día) y guarda ambos montos de forma permanente. Esto permite ver reportes mensuales/anuales en dólares que reflejan el valor real de cada gasto en su momento, sin distorsión por la volatilidad del dólar en Argentina.

## Primer paso pedido a Claude Code
Inicializar el repo (Next.js + Tailwind), estructura de carpetas, conexión a Supabase (env vars), y las migraciones SQL para las tablas de arriba con Row Level Security básica (cada usuario solo ve sus propios datos). Incluir también la función/lógica para consultar y cachear la cotización del dólar del día (ver sección "Manejo de moneda").
