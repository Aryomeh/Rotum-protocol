import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'
import { NODE_TON_PRICES, STORE_TON_PRICES } from '@/lib/ton-prices'

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}))
    const { userId, slug, action } = body

    if (!userId || !slug) {
      return NextResponse.json(
        { success: false, error: 'Missing parameters (userId and slug required)' },
        { status: 400 }
      )
    }

    if (action === 'initiate') {
      let tonPrice = NODE_TON_PRICES[slug]
      if (tonPrice === undefined) {
        tonPrice = STORE_TON_PRICES[slug]
      }

      if (tonPrice === undefined) {
        return NextResponse.json(
          { success: false, error: `Invalid product slug configuration: ${slug}` },
          { status: 400 }
        )
      }

      const orderId = crypto.randomUUID()

      // Register the intent as pending in the 'purchases' ledger inside Supabase
      const { error } = await getSupabaseAdmin()
        .from('purchases')
        .insert({
            id: orderId,
            user_id: userId,
            item_slug: slug,
            item_name: slug.replace('_', ' ').toUpperCase(),
            amount_ton: tonPrice,
            source: 'ton', // 👈 FIX: Explicitly set source to 'ton' instead of relying on DB default
            status: 'pending',
            purchased_at: new Date().toISOString()
        })

      if (error) {
        console.error('Supabase transaction registration error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to record transaction intent in ledger' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        merchantWallet: process.env.MERCHANT_TON_WALLET || 'UQBM...your-cold-wallet-address',
        payloadBody: orderId, 
        orderId: orderId,
        amountTon: tonPrice
      })
    }

    return NextResponse.json(
      { success: false, error: `Unsupported action method: ${action}` },
      { status: 400 }
    )
  } catch (err: any) {
    console.error('TON payment API crash:', err)
    return NextResponse.json(
      { success: false, error: err.message || 'Internal Ledger failure' },
      { status: 500 }
    )
  }
}