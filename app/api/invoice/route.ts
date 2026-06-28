import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

const SHOP_ITEMS: Record<string, { title: string; description: string; stars: number }> = {
  hash_boost_24h:   { title: 'Hash Boost (24h)',  description: '2× your hash rate for 24 hours',        stars: 25  },
  mining_crate:     { title: 'Mining Crate',      description: 'Random node upgrade or $RTM bonus',      stars: 50  },
  accelerator_pack: { title: 'Accelerator Pack',  description: 'Permanent +10% hash rate boost',         stars: 100 },
  validator_slot:   { title: 'Validator Slot',    description: 'Unlock the Validator Node tier',         stars: 200 },
  quantum_upgrade:  { title: 'Quantum Upgrade',   description: 'Unlock the Quantum Processor tier',      stars: 500 },
}

export async function POST(req: NextRequest) {
  try {
    const { userId, itemSlug, telegramId } = await req.json()

    const item = SHOP_ITEMS[itemSlug]
    if (!item) {
      return NextResponse.json({ error: 'Unknown item' }, { status: 400 })
    }

    const botToken = process.env.TELEGRAM_BOT_TOKEN!

    // Create invoice link via Telegram Bot API
    const res = await fetch(
      `https://api.telegram.org/bot${botToken}/createInvoiceLink`,
      {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          title:           item.title,
          description:     item.description,
          payload:         JSON.stringify({ userId, itemSlug, telegramId }),
          currency:        'XTR',           // XTR = Telegram Stars
          prices:          [{ label: item.title, amount: item.stars }],
          // No provider_token needed for Stars
        }),
      }
    )

    const data = await res.json()

    if (!data.ok) {
      console.error('[invoice] Telegram error:', data)
      return NextResponse.json({ error: data.description }, { status: 400 })
    }

    return NextResponse.json({ success: true, invoiceLink: data.result })
  } catch (err: any) {
    console.error('[invoice]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}