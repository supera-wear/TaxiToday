import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface StripeProduct {
  id: string
  priceId: string
  name: string
  description: string
  price: number
  mode: 'payment' | 'subscription'
}

export const stripeProducts: StripeProduct[] = [
  {
    id: 'taxitoday-rit',
    priceId: 'price_1RYnujFbnCEGqxgmQiIo1PzH',
    name: 'TaxiToday Rit',
    description: 'Betaal voor uw taxirit met TaxiToday',
    price: 1.00,
    mode: 'payment'
  }
]

export const getProductById = (id: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.id === id)
}

export const getProductByPriceId = (priceId: string): StripeProduct | undefined => {
  return stripeProducts.find(product => product.priceId === priceId)
}

export async function createCheckoutSession(
  priceId: string,
  mode: 'payment' | 'subscription' = 'payment'
) {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    throw new Error('User must be authenticated to create checkout session')
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      price_id: priceId,
      mode,
      success_url: `${window.location.origin}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${window.location.origin}/cancel`,
    }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create checkout session')
  }

  const { url } = await response.json()
  return url
}

export async function getUserSubscription() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return null
  }

  const { data, error } = await supabase
    .from('stripe_user_subscriptions')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching subscription:', error)
    return null
  }

  return data
}

export async function getUserOrders() {
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session) {
    return []
  }

  const { data, error } = await supabase
    .from('stripe_user_orders')
    .select('*')
    .order('order_date', { ascending: false })

  if (error) {
    console.error('Error fetching orders:', error)
    return []
  }

  return data || []
}