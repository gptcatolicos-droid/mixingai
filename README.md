# MixingMusic.AI — Edge Functions v14

## El bug que se corrigió

El error `"Replicate: The specified version does not exist"` ocurría porque la edge function
usaba un **version hash fijo** que Replicate eliminó al actualizar el modelo.

### Antes (❌ roto):
```typescript
const ACESTEP_MODEL = 'lucataco/ace-step:a4b06a8b37c7c5b2e0fdf74d35038e65e21558f24def3b27e62cfc945db2df3c';
// POST https://api.replicate.com/v1/predictions
// body: { version: ACESTEP_MODEL, input: {...} }
```

### Después (✅ fix):
```typescript
// POST https://api.replicate.com/v1/models/lucataco/ace-step/predictions
// body: { input: {...} }  ← sin "version"
// Authorization: Bearer TOKEN  ← no "Token TOKEN"
```

## Deploy

```bash
# 1. Instalar Supabase CLI si no lo tienes
npm install -g supabase

# 2. Login
supabase login

# 3. Deployar todo
bash deploy-functions.sh

# O individualmente:
supabase functions deploy acestep-generate --project-ref ydmdhibechlmgwfdfcxs
supabase functions deploy stems-separate --project-ref ydmdhibechlmgwfdfcxs
supabase functions deploy grant-credits --project-ref ydmdhibechlmgwfdfcxs
```

## Verificar secrets en Supabase

```bash
supabase secrets list --project-ref ydmdhibechlmgwfdfcxs
```

Deben aparecer:
- `REPLICATE_API_TOKEN` — si no está, settéalo:
  ```bash
  supabase secrets set REPLICATE_API_TOKEN=r8_tutoken --project-ref ydmdhibechlmgwfdfcxs
  ```
- `SERVICE_ROLE_KEY` — si no está:
  ```bash
  supabase secrets set SERVICE_ROLE_KEY=eyJtutokenservicerole --project-ref ydmdhibechlmgwfdfcxs
  ```

## Si sigue fallando con error 500

Revisa los logs en tiempo real:
```bash
supabase functions logs acestep-generate --project-ref ydmdhibechlmgwfdfcxs
```

El error ahora es descriptivo — va a decir exactamente qué falta.

## Archivos en este ZIP

```
supabase/functions/
├── acestep-generate/index.ts   ← FIXED: sin version hash, mejor error handling
├── stems-separate/index.ts     ← FIXED: sin version hash
└── grant-credits/index.ts      ← Sin cambios (no usa Replicate)
deploy-functions.sh             ← Script para deployar todo
README.md                       ← Este archivo
```
