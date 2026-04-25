'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users, TrendingUp, CreditCard, UserCheck,
  RefreshCw, ChevronUp, ChevronDown, Pencil, X, Search, Loader2,
} from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { toast } from 'sonner'
import type { AdminStats, AdminUser } from '@/app/api/admin/stats/route'

type SortKey = 'created_at' | 'plan' | 'project_count' | 'storage_used_bytes'
type SortDir = 'asc' | 'desc'

const PLAN_LABELS: Record<string, { label: string; className: string }> = {
  free:   { label: 'Gratuit', className: 'bg-gray-100 text-gray-600' },
  pro:    { label: 'Pro',     className: 'bg-blue-100 text-blue-700' },
  agency: { label: 'Agence',  className: 'bg-purple-100 text-purple-700' },
}

const ACCOUNT_TYPE_LABELS: Record<string, { label: string; className: string }> = {
  freelance: { label: 'Freelance', className: 'bg-emerald-100 text-emerald-700' },
  client:    { label: 'Client',    className: 'bg-orange-100 text-orange-700' },
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Mo'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string
}) {
  return (
    <div className="bg-white rounded-xl border p-5 flex items-start gap-4">
      <div className={`rounded-lg p-2.5 ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-bold text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

function StorageBar({ used, max }: { used: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  const color = pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-yellow-500' : 'bg-blue-500'
  return (
    <div className="flex flex-col gap-1 min-w-[160px]">
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">
        {formatBytes(used)} / {formatBytes(max)}
      </span>
    </div>
  )
}

interface EditState {
  userId: string
  plan: 'free' | 'pro' | 'agency'
  trialEndsAt: string
  saving: boolean
  saved: boolean
}

export default function AdminPage() {
  const router = useRouter()
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [filterType, setFilterType] = useState<'all' | 'freelance' | 'client'>('all')
  const [filterPlan, setFilterPlan] = useState<'all' | 'free' | 'pro' | 'agency'>('all')
  const [search, setSearch] = useState('')
  const [edit, setEdit] = useState<EditState | null>(null)

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/stats')
      if (res.status === 403) { router.replace('/dashboard'); return }
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erreur')
      setStats(json.data as AdminStats)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erreur')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  function openEdit(u: AdminUser) {
    setEdit({
      userId: u.id,
      plan: (u.plan as 'free' | 'pro' | 'agency') ?? 'free',
      trialEndsAt: u.trial_ends_at
        ? format(new Date(u.trial_ends_at), 'yyyy-MM-dd')
        : '',
      saving: false,
      saved: false,
    })
  }

  async function autoSave(userId: string, plan: 'free' | 'pro' | 'agency', trialEndsAt: string) {
    setEdit(e => e ? { ...e, saving: true, saved: false } : null)
    try {
      const res = await fetch(`/api/admin/user/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan,
          trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null,
        }),
      })
      const json = await res.json() as { error?: string }
      if (!res.ok) throw new Error(json.error ?? 'Erreur')

      setEdit(e => e ? { ...e, saving: false, saved: true } : null)
      setStats(prev => {
        if (!prev) return prev
        return {
          ...prev,
          users: prev.users.map(u =>
            u.id === userId
              ? { ...u, plan, trial_ends_at: trialEndsAt ? new Date(trialEndsAt).toISOString() : null }
              : u
          ),
        }
      })
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erreur de sauvegarde')
      setEdit(e2 => e2 ? { ...e2, saving: false, saved: false } : null)
    }
  }

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('desc') }
  }

  const searchLower = search.toLowerCase()
  const filteredUsers: AdminUser[] = (stats?.users ?? [])
    .filter(u => filterType === 'all' || u.account_type === filterType)
    .filter(u => filterPlan === 'all' || u.plan === filterPlan)
    .filter(u => !searchLower || (u.email ?? '').toLowerCase().includes(searchLower) || (u.full_name ?? '').toLowerCase().includes(searchLower))
    .sort((a, b) => {
      let diff = 0
      if (sortKey === 'created_at') diff = a.created_at.localeCompare(b.created_at)
      else if (sortKey === 'plan') diff = a.plan.localeCompare(b.plan)
      else if (sortKey === 'project_count') diff = a.project_count - b.project_count
      else if (sortKey === 'storage_used_bytes') diff = a.storage_used_bytes - b.storage_used_bytes
      return sortDir === 'asc' ? diff : -diff
    })

  const mrrEur = stats ? (stats.mrr_cents / 100).toFixed(2) : '0.00'

  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return null
    return sortDir === 'asc' ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Administration</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Vue globale de la plateforme</p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Actualiser
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Stats cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={TrendingUp}
          label="MRR"
          value={loading ? '…' : `${mrrEur} €`}
          sub="Revenu mensuel récurrent"
          color="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          icon={CreditCard}
          label="Abonnements actifs"
          value={loading ? '…' : String(stats?.active_subscriptions ?? 0)}
          sub="Stripe — statut active"
          color="bg-blue-50 text-blue-600"
        />
        <StatCard
          icon={Users}
          label="Freelances / Agences"
          value={loading ? '…' : String(stats?.total_freelances ?? 0)}
          sub="Comptes utilisateurs SaaS"
          color="bg-violet-50 text-violet-600"
        />
        <StatCard
          icon={UserCheck}
          label="Clients inscrits"
          value={loading ? '…' : String(stats?.total_clients ?? 0)}
          sub="Comptes portail client"
          color="bg-orange-50 text-orange-600"
        />
      </div>

      {/* Recherche */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <input
          type="text"
          placeholder="Rechercher par nom ou email…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Type :</span>
          {(['all', 'freelance', 'client'] as const).map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterType === t
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {t === 'all' ? 'Tous' : t === 'freelance' ? 'Freelances' : 'Clients'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground font-medium">Plan :</span>
          {(['all', 'free', 'pro', 'agency'] as const).map(p => (
            <button
              key={p}
              onClick={() => setFilterPlan(p)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                filterPlan === p
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {p === 'all' ? 'Tous' : PLAN_LABELS[p]?.label ?? p}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground">
          {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tableau utilisateurs */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50/60">
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Utilisateur</th>
                <th className="text-left px-4 py-3 font-medium text-muted-foreground">Type</th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('plan')}
                >
                  <span className="inline-flex items-center">Plan <SortIcon k="plan" /></span>
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('project_count')}
                >
                  <span className="inline-flex items-center">Projets <SortIcon k="project_count" /></span>
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('storage_used_bytes')}
                >
                  <span className="inline-flex items-center">Stockage <SortIcon k="storage_used_bytes" /></span>
                </th>
                <th
                  className="text-left px-4 py-3 font-medium text-muted-foreground cursor-pointer hover:text-foreground select-none"
                  onClick={() => toggleSort('created_at')}
                >
                  <span className="inline-flex items-center">Inscrit <SortIcon k="created_at" /></span>
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Chargement…
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    Aucun utilisateur trouvé.
                  </td>
                </tr>
              )}
              {!loading && filteredUsers.map((u) => {
                const planMeta = PLAN_LABELS[u.plan] ?? PLAN_LABELS.free
                const typeMeta = ACCOUNT_TYPE_LABELS[u.account_type] ?? ACCOUNT_TYPE_LABELS.freelance
                const isEditing = edit?.userId === u.id

                return (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-gray-50/40 transition-colors">
                    {/* Utilisateur */}
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground truncate max-w-[180px]">
                        {u.full_name ?? '—'}
                        {u.admin && (
                          <span className="ml-1.5 text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-600 font-semibold align-middle">
                            ADMIN
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{u.email}</p>
                    </td>

                    {/* Type */}
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeMeta.className}`}>
                        {typeMeta.label}
                      </span>
                    </td>

                    {/* Plan — inline edit ou affichage */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <div className="flex flex-col gap-1.5 min-w-[210px]">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={edit.plan}
                              onChange={e => {
                                const newPlan = e.target.value as 'free' | 'pro' | 'agency'
                                setEdit(ev => ev ? { ...ev, plan: newPlan } : null)
                                autoSave(edit.userId, newPlan, edit.trialEndsAt)
                              }}
                              disabled={edit.saving}
                              className="text-xs border rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-primary flex-1 disabled:opacity-60"
                            >
                              <option value="free">Gratuit</option>
                              <option value="pro">Pro</option>
                              <option value="agency">Agence</option>
                            </select>
                            {edit.saving && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground shrink-0" />}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <label className="text-[10px] text-muted-foreground whitespace-nowrap">Fin d&apos;essai :</label>
                            <input
                              type="date"
                              value={edit.trialEndsAt}
                              onChange={e => setEdit(ev => ev ? { ...ev, trialEndsAt: e.target.value } : null)}
                              onBlur={e => autoSave(edit.userId, edit.plan, e.target.value)}
                              disabled={edit.saving}
                              className="text-xs border rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-primary flex-1 disabled:opacity-60"
                            />
                          </div>
                        </div>
                      ) : (
                        <div>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planMeta.className}`}>
                            {planMeta.label}
                          </span>
                          {u.trial_ends_at && (
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              Essai jusqu&apos;au {format(new Date(u.trial_ends_at), 'd MMM yyyy', { locale: fr })}
                            </p>
                          )}
                        </div>
                      )}
                    </td>

                    {/* Projets */}
                    <td className="px-4 py-3 text-center">
                      <span className="text-foreground font-medium">{u.project_count}</span>
                    </td>

                    {/* Stockage */}
                    <td className="px-4 py-3">
                      <StorageBar used={u.storage_used_bytes} max={u.storage_max_bytes} />
                    </td>

                    {/* Inscrit */}
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                      {format(new Date(u.created_at), 'd MMM yyyy', { locale: fr })}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {isEditing ? (
                        <button
                          onClick={() => setEdit(null)}
                          disabled={edit.saving}
                          className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground transition-colors disabled:opacity-50"
                          title="Fermer"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 rounded hover:bg-gray-100 text-muted-foreground hover:text-foreground transition-colors"
                          title="Modifier le plan"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
