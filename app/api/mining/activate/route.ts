import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json()

    if (!userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    const db = getSupabaseAdmin()

    const { data: updatedUser, error } = await db
      .from('users')
      .update({ mining_active: true })
      .eq('id', userId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ user: updatedUser })
  } catch (err: any) {
    console.error('[mining/activate]', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}