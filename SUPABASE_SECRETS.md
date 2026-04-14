# Supabase Edge Functions — Secrets

Run these commands to configure secrets in production:

```bash
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="APP_USR-5118046163102020-031919-5f2a78ca6cd1bc9d51e0ec3e796a92d6-3237382783"
supabase secrets set SUPABASE_URL="https://tu-proyecto.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
```

## Admin access
- URL: https://mixingmusic.ai/admin
- Password: mixing2024!
- Change via Admin Panel → Configuración

## PayPal
- Payment link: https://www.paypal.com/ncp/payment/HDU4UAXJCNVXW
- Confirmation redirect: https://mixingmusic.ai/payment-confirmation

## MercadoPago
- Public Key: APP_USR-13129ced-ad54-4ed2-b5dc-0ae59e62f9cd
- Client ID: 5118046163102020
- Access Token: set via supabase secrets (see above)
- Webhook URL: https://<project>.supabase.co/functions/v1/mercadopago-webhook

## Special users with unlimited access
- danipalacio@gmail.com — permanent unlimited (hardcoded)
