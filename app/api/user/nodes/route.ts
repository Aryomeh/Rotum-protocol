import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  try {
    const userId = req.nextUrl.searchParams.get('userId')

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const supabaseAdmin = getSupabaseAdmin()

    const { data, error } = await supabaseAdmin
      .from('user_nodes')
      .select('*')
      .eq('user_id', userId)

    if (error) throw error

    return NextResponse.json({ success: true, nodes: data ?? [] })
  } catch (err: any) {
    console.error('[user/nodes]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}