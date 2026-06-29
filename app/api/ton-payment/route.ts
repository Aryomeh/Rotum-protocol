import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { NODE_TON_PRICES, STORE_TON_PRICES } from '@/lib/tonconnect'

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
      // 1. Check whether the requested slug is a Node infrastructure item or a Store item
      let tonPrice = NODE_TON_PRICES[slug]
      if (tonPrice === undefined) {
        tonPrice = STORE_TON_PRICES[slug]
      }

      // If the product doesn't exist in either catalogue, reject it
      if (tonPrice === undefined) {
        return NextResponse.json(
          { success: false, error: `Invalid product slug configuration: ${slug}` },
          { status: 400 }
        )
      }

      // 2. Generate a secure, unique tracking UUID for this transaction loop
      const orderId = crypto.randomUUID()

      // 3. Register the intent as pending in the 'ton_transactions' ledger inside Supabase
      const { error } = await supabase
        .from('ton_transactions')
        .insert({
          id: orderId,
          user_id: userId,
          item_slug: slug,
          amount_ton: tonPrice,
          status: 'pending',
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Supabase transaction registration error:', error)
        return NextResponse.json(
          { success: false, error: 'Failed to record transaction intent in ledger' },
          { status: 500 }
        )
      }

      /**
       * 4. Return requirements to frontend.
       * payloadBody serves as the unique string memo the user transmits with their transaction
       * so your background worker can index blocks, look up the memo, and credit the correct node.
       */
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