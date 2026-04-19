import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { deleteS3Object } from '@/lib/s3'

// DELETE /api/profile/logo — supprime le logo S3 + efface logo_url du profil
export async function DELETE() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('logo_url')
      .eq('id', user.id)
      .single()

    // Extraire la clé S3 depuis l'URL publique et supprimer l'objet
    if (profile?.logo_url) {
      try {
        const url = new URL(profile.logo_url)
        // virtual-hosted: bucket.s3.region.scw.cloud/key
        const key = url.pathname.replace(/^\//, '')
        if (key) await deleteS3Object(key)
      } catch { /* ignore S3 error, on efface quand même le profil */ }
    }

    await supabase
      .from('profiles')
      .update({ logo_url: null })
      .eq('id', user.id)

    return NextResponse.json({ data: { success: true } })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
