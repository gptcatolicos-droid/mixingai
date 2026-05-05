# MixingMusic.AI — Instrucciones de instalación

## ¿Qué hay en este ZIP?

Este es tu proyecto completo actualizado con:
- ✅ Home con los 4 modos de trabajo
- ✅ Pantalla "Separar stems" (funciona en el navegador del usuario)
- ✅ Pantalla "Generar canción con IA" (necesita RunPod, ver abajo)
- ✅ Pantalla "Agregar instrumentos con IA" (necesita RunPod)
- ✅ Tu mezclador original intacto
- ✅ Tu exportación de canciones intacta
- ✅ Tus pagos PayPal y Mercado Pago intactos

---

## PASO 1 — Subir a GitHub (5 minutos)

1. Abre GitHub.com → entra a tu repositorio de mixingmusic.ai
2. Haz clic en "uploading an existing file" o usa tu método habitual de push
3. Sube TODOS los archivos de este ZIP manteniendo la misma estructura de carpetas
4. Haz commit con el mensaje: "feat: 4 modos IA"
5. Render detecta el cambio automáticamente y redespliega en 2-3 minutos

**Después de esto ya funciona:**
- Home nuevo con 4 modos
- Separar stems (la primera vez descarga el modelo ~170MB, luego es instantáneo)
- Tu mezclador original
- Tu exportación

---

## PASO 2 — Supabase (10 minutos)

### 2A — Crear la tabla de historial

1. Ve a dashboard.supabase.com → tu proyecto
2. Clic en "SQL Editor" en el menú izquierdo
3. Pega este código y presiona "Run":

```sql
create table if not exists ai_generations (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references profiles(id),
  prompt text,
  genres text[],
  duration_seconds int,
  credits_used int,
  created_at timestamptz default now()
);
```

### 2B — Agregar el Edge Function

1. En Supabase → menú izquierdo → "Edge Functions"
2. Clic en "New Function"
3. Nombre: `acestep-generate`
4. Pega el contenido del archivo: `supabase/functions/acestep-generate/index.ts`
5. Clic en "Deploy"

---

## PASO 3 — RunPod para generar música con IA (cuando quieras)

Este paso es OPCIONAL para empezar. Sin él todo funciona excepto la generación de canciones.

1. Ve a runpod.io → crea cuenta → agrega $10 de crédito
2. Pods → Deploy → elige "RTX 3090" ($0.22/hora)
3. Template: "RunPod PyTorch 2.1" → Deploy
4. Espera 2 minutos → Connect → Web Terminal
5. Pega el COMANDO 1 de tu archivo "Comandos run pod.md"
6. Espera ~15 minutos → al final aparece una URL tipo: https://abc123.gradio.live
7. Copia esa URL

### Guardar la URL en Supabase:
1. Supabase → Edge Functions → Secrets
2. Agregar secreto: Nombre = `RUNPOD_ENDPOINT_URL` / Valor = la URL que copiaste
3. También agregar: Nombre = `SUPABASE_SERVICE_ROLE_KEY` / Valor = lo encuentras en Supabase → Settings → API → service_role

**Después de esto:** El botón "Generar canción" produce música real con IA.

### ⚠️ IMPORTANTE — Apaga el pod cuando no lo uses
RunPod cobra por hora. Cuando termines de generar: RunPod → Pods → Stop.
Para reiniciar: usa el COMANDO 3 de tu archivo .md (tarda 2 minutos).

---

## Costo mensual estimado

| Servicio | Costo |
|---|---|
| Render (hosting) | $0 - $7/mes |
| Supabase | $0 - $25/mes |
| Separar stems | $0 (corre en el navegador del usuario) |
| RunPod (50 canciones de 3 min) | ~$2 - $5/mes |
| **Total** | **$2 - $37/mes** |

---

## ¿Algo no funciona?

Revisa que en tu archivo `.env` (en Render → Environment Variables) estén:
- VITE_PUBLIC_SUPABASE_URL
- VITE_PUBLIC_SUPABASE_ANON_KEY
- VITE_MP_PUBLIC_KEY
- VITE_PAYPAL_PAYMENT_LINK

