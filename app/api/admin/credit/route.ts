import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  try {
    const { creditId, creditAmt } = await req.json()

    if (!creditId || !creditAmt) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ⚡ Instantiating your administrative service-role client
    const supabaseAdmin = getSupabaseAdmin()

    // Query using the precise ID value
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id, rtm_balance')
      .eq('telegram_id', creditId)
      .single()

    if (fetchError || !user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const newBalance = Number(user.rtm_balance) + parseFloat(creditAmt)

    // Securely update the balance on the backend
    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ rtm_balance: newBalance })
      .eq('id', user.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}