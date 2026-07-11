import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const { poolSize } = await req.json()
  const requestedSize = Number(poolSize)

  if (!requestedSize || requestedSize <= 0) {
    return NextResponse.json(
      { success: false, error: 'Enter a valid pool size greater than 0' },
      { status: 400 }
    )
  }

  const supabase = getSupabaseAdmin()

  // Check Season 1's fixed 150k budget bucket
  const { data: bucket, error: bucketFetchError } = await supabase
    .from('tokenomics_supply')
    .select('amount_distributed, amount_remaining')
    .eq('allocation_name', 'season_1_pool')
    .maybeSingle()

  if (bucketFetchError)
    return NextResponse.json({ success: false, error: bucketFetchError.message }, { status: 500 })

  if (!bucket)
    return NextResponse.json(
      { success: false, error: 'season_1_pool bucket not found in tokenomics_supply' },
      { status: 500 }
    )

  if (requestedSize > Number(bucket.amount_remaining)) {
    return NextResponse.json(
      {
        success: false,
        error: `Only ${Number(bucket.amount_remaining).toLocaleString()} $RTM remaining in Season 1's budget — cannot create a pool of ${requestedSize.toLocaleString()}`,
      },
      { status: 400 }
    )
  }

  // Deduct requested pool size from Season 1's remaining budget
  const { error: deductError } = await supabase
    .from('tokenomics_supply')
    .update({
      amount_distributed: Number(bucket.amount_distributed) + requestedSize,
      amount_remaining: Number(bucket.amount_remaining) - requestedSize,
      updated_at: new Date().toISOString(),
    })
    .eq('allocation_name', 'season_1_pool')

  if (deductError)
    return NextResponse.json({ success: false, error: deductError.message }, { status: 500 })

  // Reset/reconfigure the existing "Season 1" row for the new pool round.
  // No new row is ever created — Season 1 is the only season in use
  // until its 150k budget is fully exhausted.
  const start = new Date()
  const end = new Date(start.getTime() + 30 * 86400000)

  const { data, error } = await supabase
    .from('seasons')
    .update({
      status: 'active',
      pool_size: requestedSize,
      pool_current: 0,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .eq('name', 'Season 1')
    .select()
    .single()

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })

  // Reset activation for EVERY user so nobody carries over mining_active
  // from the previous pool round. They must click "Activate" again.
  const { error: resetError } = await supabase
    .from('users')
    .update({ mining_active: false })
    .not('id', 'is', null)

  if (resetError)
    return NextResponse.json({ success: false, error: resetError.message }, { status: 500 })

  return NextResponse.json({ success: true, season: data })
}
