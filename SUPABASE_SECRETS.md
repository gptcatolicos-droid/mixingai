# Supabase Edge Functions — Secrets

Run these commands to configure secrets in production:

```bash
supabase secrets set MERCADOPAGO_ACCESS_TOKEN="<MERCADOPAGO_ACCESS_TOKEN>"
supabase secrets set SUPABASE_URL="https://tu-proyecto.supabase.co"
supabase secrets set SUPABASE_SERVICE_ROLE_KEY="tu_service_role_key"
```

## Admin access
- URL: https://mixingmusic.ai/admin
- Password: configure and store outside the repository

## PayPal
- Payment link: https://www.paypal.com/ncp/payment/HDU4UAXJCNVXW
- Confirmation redirect: https://mixingmusic.ai/payment-confirmation

## MercadoPago
- Public Key: configure from the Mercado Pago production credentials panel
- Client ID: 5118046163102020
- Access Token: set via supabase secrets (see above)
- Webhook URL: https://<project>.supabase.co/functions/v1/mercadopago-webhook

## Special users with unlimited access
- danipalacio@gmail.com — permanent unlimited (hardcoded)
