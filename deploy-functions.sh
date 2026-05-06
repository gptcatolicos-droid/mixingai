#!/bin/bash
# deploy-functions.sh — Deployar todas las Edge Functions de MixingMusic.AI
# Uso: bash deploy-functions.sh

PROJECT_REF="ydmdhibechlmgwfdfcxs"

echo "🚀 Deployando Edge Functions a Supabase..."
echo "   Proyecto: $PROJECT_REF"
echo ""

echo "1/3 — acestep-generate (generación de canciones con ACE-Step)..."
supabase functions deploy acestep-generate --project-ref $PROJECT_REF
echo ""

echo "2/3 — stems-separate (separación con Demucs)..."
supabase functions deploy stems-separate --project-ref $PROJECT_REF
echo ""

echo "3/3 — grant-credits (otorgar créditos tras pago)..."
supabase functions deploy grant-credits --project-ref $PROJECT_REF
echo ""

echo "✅ Deploy completo!"
echo ""
echo "⚠️  IMPORTANTE — Verificar que estos secrets estén configurados en Supabase:"
echo "   supabase secrets list --project-ref $PROJECT_REF"
echo ""
echo "   Deben existir:"
echo "   - REPLICATE_API_TOKEN  → tu token de Replicate (r8_...)"
echo "   - SERVICE_ROLE_KEY     → tu service role key de Supabase"
echo ""
echo "   Para setear un secret:"
echo "   supabase secrets set REPLICATE_API_TOKEN=r8_tutoken --project-ref $PROJECT_REF"
