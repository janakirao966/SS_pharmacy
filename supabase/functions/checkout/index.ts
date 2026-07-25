import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { customer_name, customer_phone, customer_email, shipping_address, city, state, pincode, items, checkout_attempt_id } = await req.json()

    // 1. Fetch products from Supabase DB to calculate authoritative price
    const { data: dbProducts, error: dbError } = await supabaseClient
      .from('products')
      .select('*')

    if (dbError || !dbProducts) {
      throw new Error('Failed to fetch authoritative products data')
    }

    let subtotal = 0
    const verifiedItems = []

    for (const item of items) {
      const dbProduct = dbProducts.find((p: any) => p.id === item.id)
      if (!dbProduct) {
        throw new Error(`Product ${item.id} not found in database`)
      }
      subtotal += Number(dbProduct.mrp) * item.quantity
      verifiedItems.push({
        ...item,
        name: dbProduct.name,
        price: Number(dbProduct.mrp)
      })
    }

    // Apply delivery fee math
    const deliveryCharge = subtotal >= 999 ? 0 : 50
    const totalAmount = subtotal + deliveryCharge

    // 2. Create Razorpay Order via Razorpay API
    const razorpayKeyId = Deno.env.get('RAZORPAY_KEY_ID') ?? ''
    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET') ?? ''

    const rzpOrderResponse = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${razorpayKeyId}:${razorpayKeySecret}`)
      },
      body: JSON.stringify({
        amount: Math.round(totalAmount * 100), // In paise
        currency: 'INR',
        receipt: 'rcpt_' + Math.floor(Math.random() * 1000000)
      })
    })

    const rzpOrder = await rzpOrderResponse.json()
    if (!rzpOrderResponse.ok) {
      throw new Error(`Razorpay Order creation failed: ${rzpOrder.error?.description || 'Unknown error'}`)
    }

    // 3. Create Pending Order in database atomically using RPC
    const authHeader = req.headers.get('Authorization')
    let userId = null
    if (authHeader) {
      const token = authHeader.replace('Bearer ', '')
      const { data: { user } } = await supabaseClient.auth.getUser(token)
      if (user) {
        userId = user.id
      }
    }

    const { data: rpcData, error: rpcError } = await supabaseClient.rpc('create_checkout_order', {
      p_customer_name: customer_name,
      p_customer_phone: customer_phone,
      p_customer_email: customer_email,
      p_shipping_address: shipping_address,
      p_city: city,
      p_state: state,
      p_pincode: pincode,
      p_payment_method: 'online_razorpay',
      p_items: items,
      p_checkout_attempt_id: checkout_attempt_id,
      p_razorpay_order_id: rzpOrder.id,
      p_user_id: userId
    })

    if (rpcError) {
      throw new Error(`Atomic order creation failed: ${rpcError.message}`)
    }

    const res = typeof rpcData === 'string' ? JSON.parse(rpcData) : rpcData;

    if (!res || !res.success) {
      throw new Error('Order creation returned unsuccessful status.')
    }

    return new Response(
      JSON.stringify({
        success: true,
        order_number: res.order_number,
        razorpay_order_id: rzpOrder.id,
        amount: Math.round(totalAmount * 100),
        key_id: razorpayKeyId,
        receipt_token: res.receipt_token
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
