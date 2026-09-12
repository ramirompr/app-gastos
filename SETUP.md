# Guía: Crear Repo en GitHub y Primeros Pasos

## 1. Crear el Repositorio en GitHub

### Opción A: Vía Web (más fácil)
1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en **+** (esquina superior derecha) → **New repository**
3. Nombre: `app-gastos` (o el que prefieras)
4. Descripción: "Seguimiento personal de gastos en ARS y USD"
5. **No initialices** README, .gitignore, ni license (ya los tenemos locales)
6. Haz clic en **Create repository**

### Opción B: Usando GitHub CLI
```bash
gh repo create app-gastos --source=. --remote=origin --push
```

## 2. Conectar el Repo Local a GitHub

Una vez creado el repo en GitHub, ejecuta en tu terminal local:

```bash
cd "c:\Users\ramir\OneDrive\Escritorio\AppDeGastos"

# Agregar el remoto origin
git remote add origin https://github.com/tu-usuario/app-gastos.git

# Renombrar la rama a main (si es necesario)
git branch -M main

# Hacer push del commit inicial
git push -u origin main
```

Reemplaza `tu-usuario` con tu nombre de usuario en GitHub.

## 3. Configurar Supabase

### 3.1. Crear Proyecto en Supabase
1. Ve a [app.supabase.com](https://app.supabase.com)
2. Haz clic en **New project**
3. **Name**: app-gastos
4. **Database Password**: Crea una contraseña segura
5. **Region**: elige la más cercana a tu ubicación (ej: `sa-east-1` para Argentina)
6. Haz clic en **Create new project** (toma ~1-2 minutos)

### 3.2. Obtener Credenciales
1. Cuando se haya creado, ve a **Project Settings** (ícono ⚙️)
2. Abre **API** en el menú lateral
3. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Pega en `.env.local`:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
   ```

### 3.3. Ejecutar Migraciones SQL

1. Ve a **SQL Editor** en el menú lateral de Supabase
2. Haz clic en **New Query**
3. Copia el contenido de cada archivo SQL en este orden:
   - [supabase/migrations/001_create_categories_table.sql](../supabase/migrations/001_create_categories_table.sql)
   - [supabase/migrations/002_create_expenses_table.sql](../supabase/migrations/002_create_expenses_table.sql)
   - [supabase/migrations/003_create_exchange_rates_table.sql](../supabase/migrations/003_create_exchange_rates_table.sql)
   - [supabase/migrations/004_enable_rls.sql](../supabase/migrations/004_enable_rls.sql)

4. Ejecuta cada migración haciendo clic en **Run** (esquina superior derecha)

### 3.4. Verificar RLS
1. Ve a **Authentication** → **Policies** en Supabase
2. Verifica que las políticas de las 3 tablas estén activas (deberías ver ✓ en cada una)

## 4. Probar la Conexión

En tu app local (http://localhost:3000), deberías ver:
- ✓ Supabase: **Conectado** (si `.env.local` está bien configurado)
- ✗ Supabase: **Configura env vars** (si no está configurado)

Si ves ✓, ¡listo! La conexión a Supabase funciona.

## 5. Crear Cuenta de Usuario

Para probar la app, necesitas crear una cuenta:

1. En Supabase, ve a **Authentication** → **Users**
2. Haz clic en **Add user**
3. Email: tu email (ej: tu@ejemplo.com)
4. Password: crea una contraseña
5. Haz clic en **Save user**

Guarda estas credenciales para probar la app después.

## 6. Próximos Pasos (Dev)

- [ ] Implementar página de login
- [ ] Crear componentes de CRUD para categorías
- [ ] Implementar formulario de carga de gastos
- [ ] Crear vistas/reportes
- [ ] Agregar PWA icons
- [ ] Preparar para deploy en Vercel

## Deploy en Vercel (cuando esté listo)

1. Ve a [vercel.com](https://vercel.com)
2. Importa el repo de GitHub: **Add New** → **Project**
3. Busca y selecciona `app-gastos`
4. En **Environment Variables**, agrega:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```
5. Haz clic en **Deploy**

Vercel se deployará automáticamente con cada push a `main`.

## Comandos Útiles

```bash
# Iniciar dev server
npm run dev

# Build para producción
npm run build

# Iniciar servidor de producción
npm start

# Linting
npm run lint

# Type-checking
npm run type-check
```

## Recursos

- [Supabase Docs](https://supabase.com/docs)
- [Next.js Docs](https://nextjs.org/docs)
- [GitHub Docs](https://docs.github.com/en)
- [Vercel Docs](https://vercel.com/docs)
