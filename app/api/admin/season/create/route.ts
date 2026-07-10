import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST() {
  const supabase = getSupabaseAdmin()

  // End any currently-active season(s) before creating a new one.
  // This prevents multiple rows with status = 'active' from ever
  // existing at once, which breaks any query using .single().
  const { error: endError } = await supabase
    .from('seasons')
    .update({ status: 'ended' })
    .eq('status', 'active')

  if (endError)
    return NextResponse.json(
      { success: false, error: endError.message },
      { status: 500 }
    )

  const { data: last } = await supabase
    .from('seasons')
    .select('id')
    .order('id', { ascending: false })
    .limit(1)

  const nextId = (last?.[0]?.id ?? 0) + 1

  const start = new Date()
  const end = new Date(start.getTime() + 30 * 86400000)

  const { data, error } = await supabase
    .from('seasons')
    .insert({
      name: 'Season ' + nextId,
      status: 'upcoming',
      pool_size: 100000,
      pool_current: 0,
      starts_at: start.toISOString(),
      ends_at: end.toISOString(),
    })
    .select()
    .single()

  if (error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )

  // Reset activation for EVERY user (new and existing) so nobody
  // carries over mining_active from the previous season/pool.
  // They must click "Activate" again before mining resumes.
  const { error: resetError } = await supabase
    .from('users')
    .update({ mining_active: false })
    .not('id', 'is', null) // matches all rows; Supabase requires a filter on update

  if (resetError)
    return NextResponse.json(
      { success: false, error: resetError.message },
      { status: 500 }
    )

  // Reserve this season's bucket in tokenomics_supply UPFRONT.
  // e.g. season 3 -> allocation_name 'season_3_pool'. We mark its
  // full total_allocated as distributed/reserved immediately, so the
  // live supply page and admin "Remaining Balance" reflect the
  // commitment right when the season is created — not later.
  const bucketKey = `season_${nextId}_pool`

  const { data: bucket, error: bucketFetchError } = await supabase
    .from('tokenomics_supply')
    .select('allocation_name, total_allocated')
    .eq('allocation_name', bucketKey)
    .maybeSingle()

  if (bucketFetchError) {
    console.error('[season/create] failed to look up tokenomics_supply bucket:', bucketFetchError.message)
  } else if (!bucket) {
    // No pre-defined bucket exists for this season number yet.
    // Auto-create it now so the live supply page and admin
    // "Remaining Balance" don't show 0 for this season.
    const { error: insertBucketError } = await supabase
      .from('tokenomics_supply')
      .insert({
        allocation_name: bucketKey,
        total_allocated: 100000, // default per-season reserve — adjust as needed
        amount_distributed: 0,
        amount_remaining: 100000,
      })

    if (insertBucketError) {
      console.error('[season/create] failed to auto-create tokenomics_supply bucket:', insertBucketError.message)
    }
  } else {
    const { error: bucketUpdateError } = await supabase
      .from('tokenomics_supply')
      .update({
        amount_distributed: bucket.total_allocated,
        amount_remaining: 0,
        updated_at: new Date().toISOString(),
      })
      .eq('allocation_name', bucketKey)

    if (bucketUpdateError) {
      console.error('[season/create] failed to reserve tokenomics_supply bucket:', bucketUpdateError.message)
    }
  }

  return NextResponse.json({
    success: true,
    season: data,
  })
}
