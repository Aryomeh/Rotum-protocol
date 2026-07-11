import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { id } = await req.json()
  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Fetch the season first so we know how much of its pool went unused
  const { data: seasonRow, error: fetchError } = await supabase
    .from('seasons')
    .select('id, pool_size, pool_current')
    .eq('id', id)
    .single()

  if (fetchError)
    return NextResponse.json({ success: false, error: fetchError.message }, { status: 500 })

  if (!seasonRow)
    return NextResponse.json({ success: false, error: 'No season matched that id' }, { status: 404 })

  // End the season
  const { data, error } = await supabase
    .from('seasons')
    .update({ status: 'ended', ends_at: new Date().toISOString() })
    .eq('id', id)
    .select()

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  if (!data || data.length === 0)
    return NextResponse.json({ success: false, error: 'No season matched that id' }, { status: 404 })

  // Refund whatever portion of this round's pool was never filled/claimed
  // back into Season 1's fixed 150k tokenomics_supply budget.
  const unfilled = Number(seasonRow.pool_size) - Number(seasonRow.pool_current)

  if (unfilled > 0) {
    const { data: bucket, error: bucketFetchError } = await supabase
      .from('tokenomics_supply')
      .select('amount_distributed, amount_remaining')
      .eq('allocation_name', 'season_1_pool')
      .maybeSingle()

    if (bucketFetchError) {
      console.error('[season/end] failed to look up season_1_pool bucket:', bucketFetchError.message)
    } else if (bucket) {
      const { error: refundError } = await supabase
        .from('tokenomics_supply')
        .update({
          amount_distributed: Math.max(0, Number(bucket.amount_distributed) - unfilled),
          amount_remaining: Number(bucket.amount_remaining) + unfilled,
          updated_at: new Date().toISOString(),
        })
        .eq('allocation_name', 'season_1_pool')

      if (refundError) {
        console.error('[season/end] failed to refund unfilled pool to season_1_pool:', refundError.message)
      }
    } else {
      console.warn('[season/end] season_1_pool bucket not found — could not refund unfilled amount')
    }
  }

  return NextResponse.json({ success: true, season: data[0] })
}
