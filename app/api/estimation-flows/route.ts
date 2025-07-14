import { NextRequest, NextResponse } from 'next/server'
import { authenticateRequest } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/auth/server'

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request)
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const body = await request.json()

    // Create new estimation flow
    const { data: flow, error: flowError } = await supabase
      .from('estimation_flows')
      .insert({
        customer_id: body.customer_id,
        status: 'draft',
        current_step: 1,
        ...body
      })
      .select()
      .single()

    if (flowError) {
      console.error('Error creating estimation flow:', flowError)
      return NextResponse.json(
        { error: 'Failed to create estimation flow' },
        { status: 500 }
      )
    }

    return NextResponse.json({ flow }, { status: 201 })
  } catch (error) {
    console.error('Estimation flow creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    // Authenticate request
    const { user, error: authError } = await authenticateRequest(request)
    if (authError || !user) {
      return NextResponse.json({ error: authError || 'Unauthorized' }, { status: 401 })
    }

    const supabase = createServerSupabaseClient()
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    let query = supabase
      .from('estimation_flows')
      .select(`
        *,
        estimates!inner(
          id,
          quote_number,
          customer_name,
          created_at,
          created_by
        )
      `)
      .eq('estimates.created_by', user.id)

    if (status) {
      query = query.eq('status', status)
    }

    const { data: flows, error } = await query.order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching estimation flows:', error)
      return NextResponse.json(
        { error: 'Failed to fetch estimation flows' },
        { status: 500 }
      )
    }

    return NextResponse.json({ flows })
  } catch (error) {
    console.error('Estimation flows fetch error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}