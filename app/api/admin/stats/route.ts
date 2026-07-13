import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()

    const [usersRes, nodesRes, purchasesRes, feedRes] = await Promise.all([
      supabaseAdmin.from('users').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('user_nodes').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('purchases').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('network_feed').select('id', { count: 'exact', head: true }),
    ])

    return NextResponse.json({
      users: usersRes.count ?? 0,
      nodes: nodesRes.count ?? 0,
      purchases: purchasesRes.count ?? 0,
      feed: feedRes.count ?? 0,
    })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}