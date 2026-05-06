# MixingMusic.AI — v20 Deploy Guide

## Qué se corrigió en v20

### 🔴 Bugs críticos (bloqueaban funcionamiento)
1. **`acestep-generate`** — Version hash desactualizado → ahora usa `280fc4f9...` (mayo 2026)
2. **`acestep-generate`** — Header `Token` → cambiado a `Bearer` (formato actual de Replicate)
3. **`stems-separate`** — Header `Token` → cambiado a `Bearer`
4. **`FlowCreate.tsx`** — `atob(data.audioBase64)` fallaba con base64 que tenía espacios/saltos → fix: `.replace(/\s/g, '')` antes de decodificar
5. **`StemSeparator.tsx`** — mismo fix de `atob` con base64 limpio
6. **`acestep-generate`** — `.catch()` encadenado en insert no funciona en Deno → cambiado a `try/catch`

### 🟡 Mejoras funcionales
7. **IA EQ (StudioDAW)** — Los botones cambiaban el estado visual pero no afectaban el audio → ahora conectados a nodos reales con presets de ganancia por dispositivo
8. **`stems-separate`** — Limpia el base64 antes de decodificar en el servidor también

---

## Paso 1: Deploy Edge Functions en Supabase

Ve a **supabase.com → tu proyecto → Edge Functions**

### acestep-generate
1. Clic en `acestep-generate` → tab **Code**
2. Cmd+A → borrar todo → pegar contenido de `supabase/functions/acestep-generate/index.ts`
3. Cmd+S para deployar

### stems-separate
1. Clic en `stems-separate` → tab **Code**
2. Cmd+A → borrar todo → pegar contenido de `supabase/functions/stems-separate/index.ts`
3. Cmd+S para deployar

---

## Paso 2: Subir frontend a tu repo

Reemplaza estos archivos en tu repo:
- `src/pages/home/components/FlowCreate.tsx`
- `src/pages/home/components/StemSeparator.tsx`
- `src/pages/home/components/StudioDAW.tsx`

Haz commit + push → Render auto-deploya.

---

## Verificar secrets en Supabase
Settings → Edge Functions → Secrets:
- `REPLICATE_API_TOKEN` = `r8_av2...` (el token de Replicate que empieza con r8_)
- `SERVICE_ROLE_KEY` = `eyJ...` (el JWT largo de Supabase Settings → API)

---

## Flujo esperado después del fix
1. Usuario escribe prompt → clic "Generar canción"
2. Barra de progreso animada (1-3 min mientras Replicate procesa)
3. Audio llega → se decodifica sin error → se abre en el DAW ✅
4. En el DAW: IA EQ cambia el audio real según el dispositivo seleccionado ✅
5. Separar stems: sube audio → Demucs lo procesa → 4 pistas en el DAW ✅
