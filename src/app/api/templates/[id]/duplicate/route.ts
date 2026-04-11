import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { APP_CONFIG } from '@/config/app.config'

// POST /api/templates/[id]/duplicate
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    // Vérifier limite du plan
    const { data: profile } = await supabase.from('profiles').select('plan').eq('id', user.id).single()
    const plan = (profile?.plan ?? 'free') as keyof typeof APP_CONFIG.plans
    const limit = APP_CONFIG.plans[plan].maxTemplates

    if (limit !== Infinity) {
      const { count } = await supabase.from('templates').select('*', { count: 'exact', head: true }).eq('user_id', user.id)
      if ((count ?? 0) >= limit) {
        return NextResponse.json(
          { error: `Limite atteinte : votre plan ${APP_CONFIG.plans[plan].name} permet ${limit} template(s) personnalisé(s) maximum.` },
          { status: 403 }
        )
      }
    }

    // Récupérer le template source
    const { data: source } = await supabase
      .from('templates')
      .select('*')
      .eq('id', id)
      .single()

    if (!source) return NextResponse.json({ error: 'Template introuvable' }, { status: 404 })
    if (!source.is_default && source.user_id !== user.id) {
      return NextResponse.json({ error: 'Non autorisé' }, { status: 403 })
    }

    // Dupliquer
    const { data, error } = await supabase
      .from('templates')
      .insert({
        user_id: user.id,
        name: `${source.name} (copie)`,
        description: source.description,
        kanban_config: source.kanban_config,
        form_config: source.form_config,
        sections_config: source.sections_config ?? [],
        is_default: false,
      })
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
