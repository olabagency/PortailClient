import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  try {
    const { publicId } = await params
    const { searchParams } = new URL(request.url)
    const sessionId = searchParams.get('session_id')

    if (!sessionId) return NextResponse.json({ data: null })

    const supabase = await createClient()

    const { data: project } = await supabase
      .from('projects')
      .select('id')
      .eq('public_id', publicId)
      .single()
    if (!project) return NextResponse.json({ data: null })

    const { data: response } = await supabase
      .from('form_responses')
      .select('id, current_step, responses, client_info, respondent_email, completed, validated_at')
      .eq('project_id', project.id)
      .eq('session_id', sessionId)
      .single()

    return NextResponse.json({ data: response ?? null })
  } catch {
    return NextResponse.json({ data: null })
  }
}
