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

    // 1. Mark user as onboarded
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

    // 2. Create first default node (e.g., basic hardware node)
    const { data: upgradeRows, error: upgradeError } = await supabase
      .from('upgrade_catalogue')
      .select('slug')
      .eq('category', 'hardware')
      .order('sort_order')
      .limit(1)

    const upgradeData = upgradeRows?.[0]

    if (upgradeError || !upgradeData) {
      console.error('Error fetching default upgrade:', upgradeError)
      return NextResponse.json(
        { error: 'Failed to find default node type' },
        { status: 500 }
      )
    }

    const { error: nodeError } = await supabase
      .from('user_nodes')
      .insert({
        user_id: userId,
        upgrade_slug: upgradeData.slug,
        level: 1,
        installed_at: new Date().toISOString(),
      })

    if (nodeError) {
      console.error('Error creating first node:', nodeError)
      return NextResponse.json(
        { error: 'Failed to create first node' },
        { status: 500 }
      )
    }

    // 3. Return success
    return NextResponse.json({
      success: true,
      message: 'First node installed and user onboarded',
    })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}