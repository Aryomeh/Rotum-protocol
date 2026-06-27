import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export const runtime = 'edge'

export async function POST(req: NextRequest) {
  try {
    const { userId, slug } = await req.json()

    if (!userId || !slug) {
      return NextResponse.json({ error: 'Missing userId or slug' }, { status: 400 })
    }

    // Call the DB function — handles balance check, cost scaling, hash recalc
    const { data, error } = await supabaseAdmin.rpc('install_node', {
      p_user_id: userId,
      p_slug:    slug,
    })

    if (error) throw error

    const result = data as { success: boolean; error?: string; new_level?: number; cost?: number; new_hash?: number }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    // Add a feed event so everyone sees it
    const { data: upgrade } = await supabaseAdmin
      .from('upgrade_catalogue')
      .select('name')
      .eq('slug', slug)
      .single()

    await supabaseAdmin.from('network_feed').insert({
      type:    'upgrade',
      message: `An operator upgraded to <b>${upgrade?.name ?? slug}</b>`,
      color:   'green',
    })

    return NextResponse.json({ success: true, ...result })
  } catch (err: any) {
    console.error('[node/install]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
