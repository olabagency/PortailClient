'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'

interface Notification {
  id: string
  type: string
  title: string
  body: string | null
  project_id: string | null
  client_id: string | null
  read: boolean
  metadata: Record<string, unknown>
  created_at: string
}

const TYPE_ICONS: Record<string, string> = {
  client_info_update: '👤',
  meeting_comment: '💬',
  feedback_received: '📝',
  document_uploaded: '📄',
  deliverable_validated: '✅',
  deliverable_revised: '🔄',
  onboarding_form_responded: '📋',
  milestone_overdue: '⚠️',
}

function typeIcon(type: string): string {
  return TYPE_ICONS[type] ?? '🔔'
}

export default function NotificationsBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/notifications')
      if (res.ok) {
        const json = await res.json() as { data: Notification[] }
        setNotifications(json.data ?? [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchNotifications()
    // Refresh every 60s
    const interval = setInterval(() => void fetchNotifications(), 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  async function markAsRead(id: string) {
    await fetch(`/api/notifications/${id}`, { method: 'PATCH' })
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  async function markAllRead() {
    await fetch('/api/notifications/read-all', { method: 'PUT' })
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  function getNotifLink(n: Notification): string {
    if (n.project_id && n.type === 'meeting_comment') {
      return `/dashboard/projects/${n.project_id}/meetings`
    }
    if (n.project_id && n.type === 'document_uploaded') {
      return `/dashboard/projects/${n.project_id}/documents`
    }
    if (n.client_id && n.type === 'client_info_update') {
      return `/dashboard/clients/${n.client_id}`
    }
    if (n.project_id) return `/dashboard/projects/${n.project_id}`
    return '/dashboard'
  }

  return (
    <div className="relative">
      <button
        onClick={() => { setOpen(v => !v); if (!open) void fetchNotifications() }}
        className="relative h-9 w-9 flex items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center leading-none">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="absolute right-0 top-11 w-96 max-h-[28rem] bg-white rounded-2xl shadow-xl border z-50 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm">Notifications</h3>
                {unreadCount > 0 && (
                  <Badge className="text-xs h-5 px-1.5">{unreadCount} non lue{unreadCount > 1 ? 's' : ''}</Badge>
                )}
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                  Tout marquer lu
                </Button>
              )}
            </div>

            <div className="overflow-y-auto flex-1">
              {loading && notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucune notification</p>
                </div>
              ) : (
                <div className="divide-y">
                  {notifications.map(n => (
                    <Link
                      key={n.id}
                      href={getNotifLink(n)}
                      onClick={() => { void markAsRead(n.id); setOpen(false) }}
                      className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${!n.read ? 'bg-blue-50/50' : ''}`}
                    >
                      <span className="text-xl shrink-0 mt-0.5">{typeIcon(n.type)}</span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm truncate ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
                          {n.title}
                        </p>
                        {n.body && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>
                        )}
                        <p className="text-[11px] text-muted-foreground mt-1">
                          {format(new Date(n.created_at), "d MMM 'à' HH'h'mm", { locale: fr })}
                        </p>
                      </div>
                      {!n.read && (
                        <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                      )}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
