# ⚡ DEPLOY MERCADO PAGO — Ejecutar ahora (2 minutos)

## Opción A: Terminal (recomendado)

```bash
# 1. Instalar Supabase CLI si no lo tienes
npm install -g supabase

# 2. Login con tu token
supabase login --token sbp_d7c20282758c3ce4e404d1845fa7d1d5d60a2a42

# 3. Entrar a la carpeta del proyecto
cd mixingai-v12

# 4. Configurar el secret del Access Token de MercadoPago
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-5118046163102020-031919-5f2a78ca6cd1bc9d51e0ec3e796a92d6-3237382783" \
  --project-ref ydmdhibechmigwfdfcxs

# 5. Deployar la función con el CORS fix
supabase functions deploy create-mercadopago-subscription \
  --project-ref ydmdhibechmigwfdfcxs
```

## Opción B: Dashboard de Supabase (sin terminal)

1. Ve a https://supabase.com/dashboard/project/ydmdhibechmigwfdfcxs/functions
2. Click en "create-mercadopago-subscription"
3. Click "Edit function" y reemplaza TODO el código con el de abajo
4. Click "Deploy"

### También configura el secret:
- Ve a Settings → Edge Functions → Secrets
- Agrega: MERCADOPAGO_ACCESS_TOKEN = APP_USR-5118046163102020-031919-5f2a78ca6cd1bc9d51e0ec3e796a92d6-3237382783
