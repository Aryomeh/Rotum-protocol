import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const supabase = getSupabaseAdmin()
  try {
    // Get auth token from header
    const authHeader = req.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.slice(7)

    // Verify token and get user ID from sessionStorage (client-side stored)
    // In production, you'd decode the JWT or validate against your session store
    // For now, we'll get the user_id from the request body or verify via a session table

    const body = await req.json().catch(() => ({}))
    const userId = body.user_id

    if (!userId) {
      return NextResponse.json(
        { error: 'Missing user_id' },
        { status: 400 }
      )
    }

    // 1. Mark user as onboarded (the "install" itself is just a UI animation — no real node is created)
    const { error: updateError } = await supabase
      .from('users')
      .update({ onboarded: true })
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user:', updateError)
      return NextResponse.json(
        { error: 'Failed to update user onboarded status' },
        { status: 500 }
      )
    }

    // 2. Return success
    return NextResponse.json({
      success: true,
      message: 'User onboarded',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}