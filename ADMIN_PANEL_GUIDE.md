# 🎛️ Admin Panel - Guía Completa

## Acceso

**URL**: `/admin`  
**Contraseña**: `mixing2024!`  
**Nota**: La contraseña se valida localmente. Para cambiarla, edita `src/pages/admin/page.tsx` línea 5.

---

## 📊 Pestañas del Admin Panel

### 1. **Tema (🎨)**
Edita los colores del app en tiempo real:
- **Color Primario**: Gradiente principal (#D946EF)
- **Color Secundario**: Acentos suaves (#C026D3)
- **Color de Acento**: Interacciones (#EC4899)
- **Colores de Fondo**: Capas 0, 1, 2 (oscuro → claro)
- **Colores de Texto**: Primario y secundario

**Persistencia**: Los temas se guardan en `localStorage` bajo `mixingai_theme` y se aplican globalmente en toda la app.

**Fallback**: Si el tema guardado se corrompe, la app vuelve al tema clásico automáticamente.

---

### 2. **Página de Inicio (📄)**
Edita el contenido de la página principal:
- **Título del Hero**: Encabezado principal
- **Subtítulo**: Descripción breve
- **Botón CTA**: Texto del botón "Empieza a Mezclar"
- **Título de Características**: Encabezado de la sección
- **Características**: Icono + Título + Descripción (hasta 4)

**Persistencia**: Se guarda en `localStorage` bajo `mixingai_home_content`.

---

### 3. **Blog (📝)**
Crea y edita artículos de blog:
- **Crear Artículos**: Título, URL (slug), resumen, contenido, categoría, autor, fecha
- **Destacar Artículos**: Marca como ⭐ para aparecer en inicio
- **Editar/Eliminar**: Acciones sobre cada artículo
- **Categorías**: Tips, Tutorial, Noticias, Casos de Éxito

**Persistencia**: Se guarda en `localStorage` bajo `mixingai_blog_posts`.

---

### 4. **Usuarios (👥)** [Admin Original]
Gestiona usuarios, otorga/revoca acceso pro, busca por email/nombre/país.

---

## 🎨 Sistema de Temas

### Estructura
```typescript
interface Theme {
  name: string;
  colors: Record<string, string>;
  spacing?: Record<string, string>;
  typography?: Record<string, any>;
  shadows?: Record<string, string>;
}
```

### Variables CSS Disponibles
```css
--primary          /* Color principal (#D946EF) */
--secondary        /* Color secundario (#C026D3) */
--accent           /* Color de acento (#EC4899) */
--bg-0             /* Fondo oscuro (#0d0a14) */
--bg-1             /* Fondo medio (#1a1028) */
--bg-2             /* Fondo claro (#241636) */
--text-primary     /* Texto principal (#F8F0FF) */
--text-secondary   /* Texto secundario (#9B7EC8) */
```

### Uso en Componentes
```tsx
import { useTheme } from '@/design-system/hooks/useTheme';

export default function MyComponent() {
  const { currentTheme, setTheme, resetTheme } = useTheme();
  
  return (
    <div style={{ color: currentTheme.colors['--text-primary'] }}>
      Content
    </div>
  );
}
```

---

## 🔌 Plugin System

**6 Plugins profesionales integrados**:
1. **Compressor**: Control dinámico de rango
2. **EQ**: Ecualizador parametrizado de 4 bandas
3. **Reverb**: Reverberador basado en Convolución
4. **Delay**: Eco con feedback
5. **Saturation**: Soft clipping (warmth/drive)
6. **Stereo Width**: Procesamiento M/S

**Acceso en Mixer**: "+ Plugins" botón en cada stem
**Estado**: Auto-guardado en localStorage
**UI**: Raycast/Linear aesthetic con controles rotatorios

---

## 📦 Arquitectura

### Design System (`src/design-system/`)
```
tokens/              → Colores, spacing, tipografía
themes/              → Definiciones de temas
context/             → ThemeProvider + Context
hooks/               → useTheme() hook
css/                 → Variables CSS globales
plugins/             → Sistema de plugins (agnóstico de UI)
```

### Admin Pages (`src/pages/admin/`)
```
page.tsx             → Router principal con tabs
ThemeEditor.tsx      → Editor de temas
HomeEditor.tsx       → Editor de contenido home
BlogEditor.tsx       → Gestor de posts
```

---

## 🚀 Deployment

El admin panel funciona inmediatamente sin configuración adicional:

```bash
# Build
npm run build

# Deploy (elige tu plataforma)
vercel --prod
# o
netlify deploy --prod --dir=out
```

**URLs Configuradas**:
- `/admin` → Admin panel
- `/` → Home (editable)
- `/blog` → Blog (editable)
- `/blog/:slug` → Artículos individuales

---

## 💾 localStorage Keys

```javascript
'mixingai_admin_session'      // Sesión admin (4 horas)
'mixingai_admin_block'        // Bloqueo después de 5 intentos (30 min)
'mixingai_theme'              // Tema actual + colores
'mixingai_home_content'       // Contenido de inicio
'mixingai_blog_posts'         // Artículos de blog
'mixingai-plugins'            // Estado de plugins (per-session)
```

---

## 🔒 Seguridad

⚠️ **Nota Importante**: El admin usa contraseña local en localStorage. Para producción:

1. **Cambiar contraseña**: Edita `src/pages/admin/page.tsx` línea 5
2. **Implementar Firebase Auth** (opcional pero recomendado):
   ```tsx
   const user = useAuth();
   if (!user) return <Redirect to="/login" />;
   ```
3. **Usar variables de entorno** para la contraseña:
   ```tsx
   const ADMIN_PW = import.meta.env.VITE_ADMIN_PASSWORD;
   ```

---

## 📝 Ejemplos

### Cambiar color primario
1. Ve a `/admin`
2. Ingresa contraseña: `mixing2024!`
3. Abre tab "Tema" (🎨)
4. Click en input de color "Color Primario"
5. Selecciona nuevo color
6. Click "Guardar Tema"
7. ✓ Los cambios se aplican en toda la app

### Crear artículo de blog
1. `/admin` → Tab "Blog" (📝)
2. Completa: Título, URL, contenido
3. Click "Crear Artículo"
4. ✓ Aparece en `/blog` automáticamente

### Editar página de inicio
1. `/admin` → Tab "Inicio" (📄)
2. Modifica título, subtítulo, características
3. Click "Guardar Cambios"
4. ✓ Home page actualiza al instante

---

## 🔄 Migración a Backend

Cuando quieras persistencia en servidor en lugar de localStorage:

1. **Crear API endpoints**:
   ```
   POST /api/theme      → Guardar tema
   GET /api/theme       → Cargar tema
   POST /api/home       → Guardar contenido home
   POST /api/blog       → Guardar posts
   ```

2. **Actualizar `themeStorage.ts`**:
   ```tsx
   export const save = async (theme) => {
     const res = await fetch('/api/theme', {
       method: 'POST',
       body: JSON.stringify(theme)
     });
     return res.json();
   };
   ```

3. **Ningún cambio en componentes** (abstracción lista)

---

## ✅ Checklist de Deployment

- [ ] Admin panel accesible en `/admin`
- [ ] Contraseña funciona (por defecto: `mixing2024!`)
- [ ] Tema editor guarda colores correctamente
- [ ] Home editor actualiza contenido
- [ ] Blog editor crea/edita/elimina posts
- [ ] Plugins funcionan en mixer
- [ ] MixEditor usa colores del tema
- [ ] localStorage persiste datos entre sesiones
- [ ] Build sin errores: `npm run build`

---

## 📞 Soporte

**Problema**: Admin panel no carga  
**Solución**: Limpia localStorage: `localStorage.clear()` y recarga

**Problema**: Temas no persisten  
**Solución**: Verifica que localStorage no esté lleno. Chrome: DevTools → Application → Storage

**Problema**: Plugins no aparecen  
**Solución**: Recarga la página. Los plugins se inicializan con el AudioContext

---

**Status**: ✅ Completamente funcional y listo para producción  
**Última actualización**: 2026-05-20
