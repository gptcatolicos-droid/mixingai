# ⚡ DEPLOY MERCADO PAGO — Ejecutar ahora (2 minutos)

## Opción A: Terminal (recomendado)

```bash
# 1. Instalar Supabase CLI si no lo tienes
npm install -g supabase

# 2. Login con tu token
supabase login

# 3. Entrar a la carpeta del proyecto
cd mixingai-v12

# 4. Configurar el secret del Access Token de MercadoPago
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="<MERCADOPAGO_ACCESS_TOKEN>" \
  --project-ref ydmdhibechmlgwfdfcxs

# 5. Deployar la función con el CORS fix
supabase functions deploy create-mercadopago-subscription \
  --project-ref ydmdhibechmlgwfdfcxs
```

## Opción B: Dashboard de Supabase (sin terminal)

1. Ve a https://supabase.com/dashboard/project/ydmdhibechmlgwfdfcxs/functions
2. Click en "create-mercadopago-subscription"
3. Click "Edit function" y reemplaza TODO el código con el de abajo
4. Click "Deploy"

### También configura el secret:
- Ve a Settings → Edge Functions → Secrets
- Agrega: MERCADOPAGO_ACCESS_TOKEN = <MERCADOPAGO_ACCESS_TOKEN>
