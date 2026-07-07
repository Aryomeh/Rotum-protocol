import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { userId, slug } = await req.json()
    if (!userId || !slug) {
      return NextResponse.json({ error: 'Missing userId or slug' }, { status: 400 })
    }

    const supabase = getSupabaseAdmin()

    const { data, error } = await supabase.rpc('claim_achievement', {
      p_user_id: userId,
      p_slug:    slug,
    })

    if (error) throw error

    const result = data as { success: boolean; error?: string; reward?: number }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    return NextResponse.json({ success: true, reward: result.reward })
  } catch (err: any) {
    console.error('[achievements/claim]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}