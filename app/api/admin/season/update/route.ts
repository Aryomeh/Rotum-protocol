import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: Request) {
  const {
    id, name, status, ends_at, pool_size,
    top10_reward, top100_reward, random_reward, random_pct,
  } = await req.json()

  if (!id) {
    return NextResponse.json({ success: false, error: 'Missing id' }, { status: 400 })
  }

  const supabase = getSupabaseAdmin()

  // Only Season 1 / Season 2 have a matching tokenomics_supply bucket
  const bucketKey =
    name === 'Season 2' ? 'season_2_pool' :
    name === 'Season 1' ? 'season_1_pool' :
    null

  if (bucketKey && pool_size !== undefined) {
    const { data: bucket, error: bucketErr } = await supabase
      .from('tokenomics_supply')
      .select('amount_distributed, amount_remaining')
      .eq('allocation_name', bucketKey)
      .maybeSingle()

    if (bucketErr)
      return NextResponse.json({ success: false, error: bucketErr.message }, { status: 500 })
    if (!bucket)
      return NextResponse.json({ success: false, error: `${bucketKey} bucket not found in tokenomics_supply` }, { status: 500 })

    const totalBudget = Number(bucket.amount_distributed) + Number(bucket.amount_remaining)
    const requestedSize = Number(pool_size)

    if (requestedSize > totalBudget) {
      return NextResponse.json(
        {
          success: false,
          error: `Target pool size (${requestedSize.toLocaleString()}) exceeds ${bucketKey}'s total budget of ${totalBudget.toLocaleString()} $RTM`,
        },
        { status: 400 }
      )
    }

    const { error: syncErr } = await supabase
      .from('tokenomics_supply')
      .update({
        amount_distributed: requestedSize,
        updated_at: new Date().toISOString(),
      })
      .eq('allocation_name', bucketKey)

    if (syncErr)
      return NextResponse.json({ success: false, error: syncErr.message }, { status: 500 })
  }

  const updatePayload: Record<string, any> = { name, status, ends_at }
  if (pool_size !== undefined)      updatePayload.pool_size      = pool_size
  if (top10_reward !== undefined)   updatePayload.top10_reward   = top10_reward
  if (top100_reward !== undefined)  updatePayload.top100_reward  = top100_reward
  if (random_reward !== undefined)  updatePayload.random_reward  = random_reward
  if (random_pct !== undefined)     updatePayload.random_pct     = random_pct

  const { data, error } = await supabase
    .from('seasons')
    .update(updatePayload)
    .eq('id', id)
    .select()

  if (error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  if (!data || data.length === 0)
    return NextResponse.json({ success: false, error: 'No season matched that id — nothing updated' }, { status: 404 })

  return NextResponse.json({ success: true, season: data[0] })
}
