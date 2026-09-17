# Design System - Mis Gastos

Guía de diseño, colores y componentes para toda la aplicación.

## 🎨 Paleta de Colores

### Colores Primarios
- **Violeta Primario**: `#7c3aed`
- **Violeta Oscuro**: `#6d28d9`
- **Violeta Muy Oscuro**: `#5b21b6`

### Colores Secundarios
- **Azul**: `#3b82f6`
- **Azul Oscuro**: `#1e40af`

### Colores de Fondo (Dark Theme)
- **Fondo Base**: `#0f172a` (slate-950)
- **Fondo Card**: `#1e293b` (slate-800)
- **Fondo Input**: `#0f172a` (slate-900)
- **Border**: `#475569` (slate-600)

### Colores Neutrales
- **Texto Principal**: `#ffffff` (white)
- **Texto Secundario**: `#cbd5e1` (slate-300)
- **Texto Tercero**: `#94a3b8` (slate-400)
- **Texto Deshabilitado**: `#64748b` (slate-500)

### Colores de Estado
- **Éxito**: `#10b981` (verde)
- **Error**: `#ef4444` (rojo)
- **Advertencia**: `#f59e0b` (amarillo)
- **Info**: `#06b6d4` (cyan)

---

## 📱 Enfoque Mobile-First

Toda la aplicación se diseña y desarrolla **mobile-first**, asumiendo como base:
- Pantalla: 375px de ancho (iPhone SE)
- Luego se expande para tablets (768px) y desktop (1024px+)
- Touch-friendly: buttons/inputs ≥ 44x44px (accesibilidad)

### Breakpoints (Tailwind)
```
sm: 640px (tablets)
md: 768px (tablets grandes)
lg: 1024px (desktop)
xl: 1280px (desktop grande)
```

---

## 🖥️ Responsive — obligatorio en toda pantalla/componente nuevo

Mobile-first define el diseño de base, pero **ninguna pantalla se da por
terminada hasta que también se ve bien en tablet y desktop**. El error típico
a evitar es que el contenido se estire de borde a borde en pantallas anchas
(se ve "roto" en una notebook o monitor grande). La solución ya está
resuelta a nivel de sistema — no hay que inventarla de nuevo en cada
pantalla:

### `Container` (`components/layout/Container.tsx`)
Reemplaza cualquier `<div className="px-4 ...">` que envuelva el contenido
principal de una pantalla. Centra el contenido con un ancho máximo
(`max-w-2xl`, 672px) y padding responsive (`px-4 sm:px-6 lg:px-8`), así el
contenido no se estira en pantallas anchas pero sigue ocupando el 100% en
mobile.

```tsx
<Container className="flex flex-col gap-3">
  {/* contenido de la pantalla */}
</Container>
```

Usar un `Container` por cada sección/bloque de la pantalla (igual que antes
se usaba un `<div className="px-4">` por bloque) — no hace falta un único
wrapper gigante. `PageHeader` ya centra su contenido con el mismo ancho
máximo automáticamente, así que el header queda alineado con el contenido de
abajo sin hacer nada extra.

**Excepciones:** elementos que ya tienen su propio ancho fijo y se centran
solos (ej. `DonutChart`, un `flex justify-center`) no necesitan `Container`.
Barras fijas al fondo de pantalla (`fixed bottom-0 left-0 right-0`, como el
botón de guardar de `ExpenseForm`) sí necesitan un `Container` *adentro* de
la barra para que el botón no se estire de punta a punta en desktop.

### Grids con más aire en pantallas grandes
Cuando una pantalla muestra una grilla de tarjetas (categorías,
subcategorías), sumar un breakpoint más ancho es válido y barato:
`grid-cols-2 sm:grid-cols-3 lg:grid-cols-4`. No hace falta para grillas dentro
de un modal/BottomSheet, ya que ese panel tiene su propio ancho máximo.

### Modales y action sheets (`BottomSheet`, `EmojiPicker`)
En mobile siguen siendo hojas que se deslizan desde abajo, pero en `sm:` y
mayor se comportan como un modal centrado (ancho máximo, bordes redondeados
en las 4 esquinas, con backdrop alrededor) en vez de pegarse de borde a
borde. Esto ya está resuelto en el componente compartido `BottomSheet` — no
hay que reimplementar overlays a mano; si un componente necesita un overlay
propio (como `EmojiPicker`), replicar el mismo patrón (`sm:items-center
sm:justify-center sm:bg-black/60 sm:p-4` en el overlay + `sm:max-w-lg
sm:rounded-2xl` en el panel).

### Checklist responsive antes de dar por terminada una pantalla
- [ ] El contenido usa `Container` (o una excepción justificada) en vez de
      `px-4` suelto
- [ ] Se ve bien en 375px, 768px y 1280px+ (sin franjas de contenido
      estirado de borde a borde en desktop)
- [ ] Cualquier barra/botón `fixed` al viewport está envuelto en `Container`
- [ ] Modales/action sheets nuevos siguen el patrón de `BottomSheet`
      (mobile: hoja inferior: `sm:` y mayor: modal centrado)

---

## 🎯 Componentes Base

### Botones
```
Primary: bg-violet-600 hover:bg-violet-700 text-white
Secondary: border border-violet-600 text-violet-400 hover:bg-slate-800
Danger: bg-red-600 hover:bg-red-700 text-white
Disabled: bg-slate-700 text-slate-500 cursor-not-allowed
```

### Inputs / Textareas
```
Background: bg-slate-900
Border: border-slate-600
Focus: focus:ring-2 focus:ring-violet-500 focus:border-transparent
Text: text-white
Placeholder: placeholder-slate-500
```

### Cards
```
Background: bg-slate-800 (var(--color-bg-card))
Border: border border-slate-700
Shadow: shadow-xl
Padding: p-6 (mobile), p-8 (desktop)
```

### Tipografía
```
Títulos (h1): text-3xl md:text-4xl font-bold text-white
Títulos (h2): text-2xl font-bold text-white
Subtítulos: text-lg font-semibold text-slate-300
Body: text-base text-slate-300
Small: text-sm text-slate-400
```

---

## 📐 Spacing

Basado en espaciado de Tailwind (4px = 1 unidad):
- `xs`: 8px (2)
- `sm`: 12px (3)
- `md`: 16px (4)
- `lg`: 24px (6)
- `xl`: 32px (8)
- `2xl`: 48px (12)

**Márgenes y Paddings** en la app:
- Entre secciones: `my-8 md:my-12`
- Dentro de cards: `p-6 md:p-8`
- Espacios verticales entre elementos: `gap-4` o `space-y-4`

---

## 🎭 Estados de Componentes

### Loading
- Spinner animado (svg)
- Botones deshabilitados
- Inputs deshabilitados
- Texto: "Cargando..." o similar

### Error
- Alert box: `bg-red-950 border border-red-700`
- Ícono de error
- Texto error: `text-red-400`
- Inputs con error: `border-red-600`

### Success
- Alert box: `bg-green-950 border border-green-700`
- Ícono de check
- Texto: `text-green-400`

### Empty State
- Ícono representativo
- Título
- Descripción
- CTA (botón)

---

## 🔄 Patrones de Flujo

### Páginas Protegidas
Si el usuario NO está logueado:
- Redirect a `/login`
- Preservar intención (guardar URL anterior)

Si SÍ está logueado:
- Acceso a dashboard, categorías, gastos, etc.

### Formularios
1. **Validación Client-side**: Feedback inmediato
2. **Submit**: Desabilitar botón, mostrar loading
3. **Éxito**: Alert verde, limpiar form, redirect si aplica
4. **Error**: Alert rojo, mantener datos en form

---

## 🌙 Dark Mode (Por defecto)

La app NO tiene toggle light/dark. Es **siempre dark** con la paleta definida arriba.

---

## 📦 Variables CSS (Reutilizables)

En `app/globals.css`:
```css
:root {
  --color-primary: #7c3aed;
  --color-primary-dark: #6d28d9;
  --color-secondary: #3b82f6;
  --color-bg-dark: #0f172a;
  --color-bg-card: #1e293b;
  --color-bg-input: #0f172a;
  --color-success: #10b981;
  --color-error: #ef4444;
}
```

---

## ✅ Checklist de Diseño

Al crear nuevas páginas/componentes, verificar:
- [ ] Mobile-first (375px primero)
- [ ] Responsive (testeado en 375, 768, 1024px) — ver checklist detallado en
      "🖥️ Responsive" más arriba (`Container`, grids, modales)
- [ ] Colores de la paleta
- [ ] Tipografía consistente
- [ ] Spacing uniforme
- [ ] Touch-friendly (buttons ≥ 44x44px)
- [ ] Accesibilidad (contrast ratio ≥ 4.5:1)
- [ ] Estados claros (hover, active, disabled, loading, error)
- [ ] Sem typos/inconsistencias

---

## 📚 Referencias

- **Tailwind CSS**: https://tailwindcss.com/docs
- **Paleta Tailwind**: Usamos slate para grises, violet para primario, blue para secundario
- **Accesibilidad**: WCAG 2.1 AA mínimo

---

**Última actualización**: Septiembre 17, 2026
