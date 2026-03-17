import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get user from JWT
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const url = new URL(req.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '10')
    const offset = (page - 1) * limit

    // Get payment history with pagination
    const { data: payments, error: paymentsError } = await supabaseClient
      .from('payment_history')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (paymentsError) {
      throw paymentsError
    }

    // Get total count
    const { count: totalCount } = await supabaseClient
      .from('payment_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    // Calculate statistics
    const { data: stats } = await supabaseClient
      .from('payment_history')
      .select('amount, status, created_at')
      .eq('user_id', user.id)
      .eq('status', 'completed')

    const totalSpent = stats?.reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0
    const thisMonthSpent = stats?.filter(payment => {
      const paymentDate = new Date(payment.created_at)
      const now = new Date()
      return paymentDate.getMonth() === now.getMonth() && paymentDate.getFullYear() === now.getFullYear()
    }).reduce((sum, payment) => sum + parseFloat(payment.amount), 0) || 0

    return new Response(
      JSON.stringify({
        payments: payments || [],
        pagination: {
          page,
          limit,
          total: totalCount || 0,
          totalPages: Math.ceil((totalCount || 0) / limit)
        },
        statistics: {
          totalSpent,
          thisMonthSpent,
          totalTransactions: stats?.length || 0
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})