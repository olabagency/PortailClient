'use client'

import { use, useState, useEffect, useRef, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import {
  Dialog, DialogContent, DialogFooter, DialogHeader,
  DialogTitle, DialogDescription,
} from '@/components/ui/dialog'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText, ImageIcon, File as FileIcon, Link as LinkIcon,
  FolderOpen, FolderClosed, Plus, Upload, ExternalLink,
  Eye, EyeOff, MoreHorizontal, Trash2, Pencil,
  FolderInput, Loader2, ChevronRight, Search,
  FolderPlus, CheckCircle2, LayoutGrid, LayoutList,
  X, FolderSymlink, GripVertical, HardDrive,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Folder {
  id: string
  name: string
  color: string
  icon: string | null
  project_id: string
  created_at: string
  doc_count?: number
}

interface Document {
  id: string
  name: string
  type: 'file' | 'link'
  url: string
  s3_key: string | null
  size_bytes: number | null
  mime_type: string | null
  folder_id: string | null
  visible_to_client: boolean
  source: 'freelance' | 'client'
  client_doc_status: 'pending_review' | 'acknowledged'
  created_at: string
}

interface StorageInfo {
  used_bytes: number
  max_bytes: number
  plan: string
  plan_name: string
  max_storage_gb: number
}

type TabFilter = 'all' | 'admin' | 'client'
type ViewMode = 'list' | 'grid'

const FOLDER_COLORS = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']
const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100 Mo

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} Go`
}

function getFileIcon(doc: Document, size: 'sm' | 'md' | 'lg' = 'md') {
  const cls = size === 'lg' ? 'h-8 w-8' : size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'
  if (doc.type === 'link') return <LinkIcon className={cn(cls, 'text-blue-500')} />
  const mime = doc.mime_type ?? ''
  if (mime === 'application/pdf') return <FileText className={cn(cls, 'text-red-500')} />
  if (mime.startsWith('image/')) return <ImageIcon className={cn(cls, 'text-emerald-500')} />
  if (mime.includes('word') || mime.includes('document')) return <FileText className={cn(cls, 'text-blue-600')} />
  if (mime.includes('sheet') || mime.includes('excel')) return <FileText className={cn(cls, 'text-green-600')} />
  return <FileIcon className={cn(cls, 'text-muted-foreground')} />
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)

  // Navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)

  // Data
  const [folders, setFolders] = useState<Folder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [storageInfo, setStorageInfo] = useState<StorageInfo | null>(null)

  // UI
  const [search, setSearch] = useState('')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

  // Selection
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set())
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false)
  const [bulkMoveFolderId, setBulkMoveFolderId] = useState<string>('root')
  const [savingBulkMove, setSavingBulkMove] = useState(false)
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false)
  const [deletingBulk, setDeletingBulk] = useState(false)

  // DnD
  const [activeDocId, setActiveDocId] = useState<string | null>(null)

  // Loading
  const [loadingFolders, setLoadingFolders] = useState(true)
  const [loadingDocs, setLoadingDocs] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Dialogs
  const [createFolderOpen, setCreateFolderOpen] = useState(false)
  const [addLinkOpen, setAddLinkOpen] = useState(false)
  const [renameDocOpen, setRenameDocOpen] = useState(false)
  const [moveFolderOpen, setMoveFolderOpen] = useState(false)
  const [renameFolderOpen, setRenameFolderOpen] = useState(false)

  // Dialog targets
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)

  // Form — create folder
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[1])
  const [savingFolder, setSavingFolder] = useState(false)

  // Form — add link
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkFolderId, setLinkFolderId] = useState<string>('root')
  const [linkVisibleToClient, setLinkVisibleToClient] = useState(false)
  const [savingLink, setSavingLink] = useState(false)

  // Form — rename doc
  const [renameDocName, setRenameDocName] = useState('')
  const [savingRenameDoc, setSavingRenameDoc] = useState(false)

  // Form — move doc
  const [moveDocFolderId, setMoveDocFolderId] = useState<string>('root')
  const [savingMoveDoc, setSavingMoveDoc] = useState(false)

  // Form — rename folder
  const [renameFolderName, setRenameFolderName] = useState('')
  const [savingRenameFolder, setSavingRenameFolder] = useState(false)

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─── Fetch ─────────────────────────────────────────────────────────────────

  const fetchFolders = useCallback(async () => {
    setLoadingFolders(true)
    try {
      const res = await fetch(`/api/projects/${id}/folders`)
      const json = await res.json()
      if (res.ok) setFolders(json.data?.folders ?? [])
    } finally {
      setLoadingFolders(false)
    }
  }, [id])

  const fetchDocuments = useCallback(async (folderId: string | null) => {
    setLoadingDocs(true)
    try {
      const param = folderId === null ? 'root' : folderId
      const res = await fetch(`/api/projects/${id}/documents?folder_id=${param}`)
      const json = await res.json()
      if (res.ok) setDocuments(json.data ?? [])
    } finally {
      setLoadingDocs(false)
    }
  }, [id])

  const fetchStorageInfo = useCallback(async () => {
    try {
      const res = await fetch('/api/storage')
      const json = await res.json()
      if (res.ok) setStorageInfo(json.data)
    } catch { /* silencieux */ }
  }, [])

  useEffect(() => { void fetchFolders() }, [fetchFolders])
  useEffect(() => { void fetchStorageInfo() }, [fetchStorageInfo])
  useEffect(() => {
    void fetchDocuments(currentFolderId)
    setSelectedDocIds(new Set())
  }, [fetchDocuments, currentFolderId])

  // ─── Computed ──────────────────────────────────────────────────────────────

  const currentFolder = folders.find(f => f.id === currentFolderId) ?? null

  const filteredDocuments = documents.filter(doc => {
    if (tabFilter === 'client' && !doc.visible_to_client) return false
    if (tabFilter === 'admin' && doc.visible_to_client) return false
    if (search) return doc.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const allSelected = filteredDocuments.length > 0 && filteredDocuments.every(d => selectedDocIds.has(d.id))
  const someSelected = selectedDocIds.size > 0

  const storagePercent = storageInfo
    ? Math.min(100, Math.round((storageInfo.used_bytes / storageInfo.max_bytes) * 100))
    : 0

  const activeDoc = activeDocId ? documents.find(d => d.id === activeDocId) ?? null : null

  // ─── Selection helpers ─────────────────────────────────────────────────────

  function toggleDoc(docId: string) {
    setSelectedDocIds(prev => {
      const next = new Set(prev)
      if (next.has(docId)) next.delete(docId)
      else next.add(docId)
      return next
    })
  }

  function toggleAll() {
    if (allSelected) {
      setSelectedDocIds(new Set())
    } else {
      setSelectedDocIds(new Set(filteredDocuments.map(d => d.id)))
    }
  }

  function clearSelection() {
    setSelectedDocIds(new Set())
  }

  // ─── Open file ─────────────────────────────────────────────────────────────

  async function handleOpenDoc(doc: Document) {
    if (doc.type === 'link') {
      window.open(doc.url, '_blank', 'noopener,noreferrer')
      return
    }
    setOpeningDocId(doc.id)
    try {
      const res = await fetch(`/api/projects/${id}/documents/${doc.id}`)
      if (res.ok) {
        const json = await res.json() as { url?: string }
        if (json.url) window.open(json.url, '_blank', 'noopener,noreferrer')
        else toast.error('URL de fichier introuvable')
      } else {
        toast.error('Impossible d\'ouvrir le fichier')
      }
    } catch { toast.error('Erreur réseau') }
    finally { setOpeningDocId(null) }
  }

  // ─── Upload ────────────────────────────────────────────────────────────────

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > MAX_FILE_SIZE) {
      toast.error('Fichier trop lourd (max 100 Mo)')
      return
    }

    setUploading(true)
    try {
      const presignRes = await fetch(`/api/projects/${id}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          folder_id: currentFolderId,
          file_size: file.size,
        }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok) { toast.error(presignJson.error ?? 'Erreur presign'); return }
      const { presign_url, s3_key } = presignJson.data as { presign_url: string; s3_key: string }

      const uploadRes = await fetch(presign_url, { method: 'PUT', body: file, headers: { 'Content-Type': file.type } })
      if (!uploadRes.ok) { toast.error('Erreur upload S3'); return }

      const docRes = await fetch(`/api/projects/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name, type: 'file', url: s3_key, s3_key,
          size_bytes: file.size, mime_type: file.type,
          folder_id: currentFolderId, visible_to_client: false,
        }),
      })
      const docJson = await docRes.json()
      if (!docRes.ok) { toast.error(docJson.error ?? 'Erreur enregistrement'); return }
      setDocuments(prev => [docJson.data, ...prev])
      void fetchFolders()
      void fetchStorageInfo()
      toast.success('Fichier ajouté')
    } catch { toast.error('Erreur inattendue') }
    finally { setUploading(false) }
  }

  // ─── Add link ──────────────────────────────────────────────────────────────

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    setSavingLink(true)
    try {
      const res = await fetch(`/api/projects/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkName.trim() || linkUrl.trim(), type: 'link', url: linkUrl.trim(),
          folder_id: linkFolderId === 'root' ? null : linkFolderId,
          visible_to_client: linkVisibleToClient,
        }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erreur'); return }
      setDocuments(prev => [json.data, ...prev])
      void fetchFolders()
      setAddLinkOpen(false)
      setLinkName(''); setLinkUrl(''); setLinkFolderId('root'); setLinkVisibleToClient(false)
      toast.success('Lien ajouté')
    } finally { setSavingLink(false) }
  }

  // ─── Create folder ─────────────────────────────────────────────────────────

  async function handleCreateFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!newFolderName.trim()) return
    setSavingFolder(true)
    try {
      const res = await fetch(`/api/projects/${id}/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newFolderName.trim(), color: newFolderColor }),
      })
      const json = await res.json()
      if (!res.ok) { toast.error(json.error ?? 'Erreur'); return }
      setFolders(prev => [...prev, json.data])
      setCreateFolderOpen(false)
      setNewFolderName(''); setNewFolderColor(FOLDER_COLORS[1])
      toast.success('Dossier créé')
    } finally { setSavingFolder(false) }
  }

  // ─── Visibility ────────────────────────────────────────────────────────────

  async function handleToggleVisibility(doc: Document) {
    const res = await fetch(`/api/projects/${id}/documents/${doc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_to_client: !doc.visible_to_client }),
    })
    if (res.ok) {
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, visible_to_client: !doc.visible_to_client } : d))
      toast.success(doc.visible_to_client ? 'Document masqué aux clients' : 'Document visible aux clients')
    } else toast.error('Erreur')
  }

  async function handleAcknowledge(doc: Document) {
    const res = await fetch(`/api/projects/${id}/documents/${doc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client_doc_status: 'acknowledged' }),
    })
    if (res.ok) {
      setDocuments(prev => prev.map(d => d.id === doc.id ? { ...d, client_doc_status: 'acknowledged' } : d))
      toast.success('Document validé')
    } else toast.error('Erreur')
  }

  // ─── Delete ────────────────────────────────────────────────────────────────

  async function handleDeleteDocument(doc: Document) {
    const res = await fetch(`/api/projects/${id}/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) {
      setDocuments(prev => prev.filter(d => d.id !== doc.id))
      setSelectedDocIds(prev => { const n = new Set(prev); n.delete(doc.id); return n })
      void fetchFolders()
      void fetchStorageInfo()
      toast.success('Document supprimé')
    } else toast.error('Erreur')
  }

  async function handleDeleteFolder(folder: Folder) {
    const res = await fetch(`/api/projects/${id}/folders/${folder.id}`, { method: 'DELETE' })
    if (res.ok) {
      setFolders(prev => prev.filter(f => f.id !== folder.id))
      if (currentFolderId === folder.id) setCurrentFolderId(null)
      toast.success('Dossier supprimé')
    } else toast.error('Erreur')
  }

  // ─── Bulk delete ───────────────────────────────────────────────────────────

  async function handleBulkDelete() {
    if (selectedDocIds.size === 0) return
    setDeletingBulk(true)
    try {
      const results = await Promise.all(
        Array.from(selectedDocIds).map(docId =>
          fetch(`/api/projects/${id}/documents/${docId}`, { method: 'DELETE' })
        )
      )
      const allOk = results.every(r => r.ok)
      if (allOk) {
        const deleted = new Set(selectedDocIds)
        setDocuments(prev => prev.filter(d => !deleted.has(d.id)))
        void fetchFolders()
        void fetchStorageInfo()
        setBulkDeleteOpen(false)
        clearSelection()
        toast.success(`${deleted.size} document${deleted.size > 1 ? 's' : ''} supprimé${deleted.size > 1 ? 's' : ''}`)
      } else {
        toast.error('Certaines suppressions ont échoué')
      }
    } finally { setDeletingBulk(false) }
  }

  // ─── Rename doc ────────────────────────────────────────────────────────────

  async function handleRenameDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDoc || !renameDocName.trim()) return
    setSavingRenameDoc(true)
    try {
      const res = await fetch(`/api/projects/${id}/documents/${selectedDoc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameDocName.trim() }),
      })
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, name: renameDocName.trim() } : d))
        setRenameDocOpen(false)
        toast.success('Document renommé')
      } else toast.error('Erreur')
    } finally { setSavingRenameDoc(false) }
  }

  // ─── Move doc (single) ─────────────────────────────────────────────────────

  async function handleMoveDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDoc) return
    setSavingMoveDoc(true)
    try {
      const folderId = moveDocFolderId === 'root' ? null : moveDocFolderId
      const res = await fetch(`/api/projects/${id}/documents/${selectedDoc.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      })
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === selectedDoc.id ? { ...d, folder_id: folderId } : d))
        void fetchFolders()
        setMoveFolderOpen(false)
        toast.success('Document déplacé')
      } else toast.error('Erreur')
    } finally { setSavingMoveDoc(false) }
  }

  // ─── Bulk move ─────────────────────────────────────────────────────────────

  async function handleBulkMove(e: React.FormEvent) {
    e.preventDefault()
    if (selectedDocIds.size === 0) return
    setSavingBulkMove(true)
    const folderId = bulkMoveFolderId === 'root' ? null : bulkMoveFolderId
    try {
      const results = await Promise.all(
        Array.from(selectedDocIds).map(docId =>
          fetch(`/api/projects/${id}/documents/${docId}`, {
            method: 'PATCH', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ folder_id: folderId }),
          })
        )
      )
      const allOk = results.every(r => r.ok)
      if (allOk) {
        setDocuments(prev => prev.map(d =>
          selectedDocIds.has(d.id) ? { ...d, folder_id: folderId } : d
        ))
        void fetchFolders()
        setBulkMoveOpen(false)
        clearSelection()
        toast.success(`${selectedDocIds.size} document${selectedDocIds.size > 1 ? 's' : ''} déplacé${selectedDocIds.size > 1 ? 's' : ''}`)
      } else {
        toast.error('Certains déplacements ont échoué')
      }
    } finally { setSavingBulkMove(false) }
  }

  // ─── Rename folder ─────────────────────────────────────────────────────────

  async function handleRenameFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFolder || !renameFolderName.trim()) return
    setSavingRenameFolder(true)
    try {
      const res = await fetch(`/api/projects/${id}/folders/${selectedFolder.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameFolderName.trim() }),
      })
      if (res.ok) {
        setFolders(prev => prev.map(f => f.id === selectedFolder.id ? { ...f, name: renameFolderName.trim() } : f))
        setRenameFolderOpen(false)
        toast.success('Dossier renommé')
      } else toast.error('Erreur')
    } finally { setSavingRenameFolder(false) }
  }

  // ─── Drag & drop ───────────────────────────────────────────────────────────

  function handleDragStart(event: DragStartEvent) {
    setActiveDocId(event.active.id as string)
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveDocId(null)
    if (!over) return

    const docId = active.id as string
    const targetFolderId = over.id === 'root' ? null : over.id as string

    const doc = documents.find(d => d.id === docId)
    if (!doc) return
    if (doc.folder_id === targetFolderId) return

    try {
      const res = await fetch(`/api/projects/${id}/documents/${docId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: targetFolderId }),
      })
      if (res.ok) {
        setDocuments(prev => prev.map(d => d.id === docId ? { ...d, folder_id: targetFolderId } : d))
        void fetchFolders()
        const target = targetFolderId ? folders.find(f => f.id === targetFolderId)?.name : 'la racine'
        toast.success(`Déplacé vers ${target ?? 'la racine'}`)
      } else {
        toast.error('Déplacement échoué')
      }
    } catch { toast.error('Erreur réseau') }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fichiers et liens du projet</p>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger
            disabled={uploading || storagePercent >= 100}
            className="inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium transition-colors bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 disabled:opacity-50 disabled:pointer-events-none"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Nouveau
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" /> Importer un fichier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddLinkOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" /> Ajouter un lien
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" /> Nouveau dossier
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* ── Main layout : sidebar + contenu ── */}
      <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="flex flex-1 gap-5 min-h-0 overflow-hidden">

          {/* ── Sidebar dossiers ── */}
          <aside className="w-52 shrink-0 flex flex-col border-r pr-4 overflow-y-auto">

            {/* Stockage compact */}
            {storageInfo && (
              <div className="mb-5 p-3 rounded-xl border bg-muted/20">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1.5">
                  <span className="flex items-center gap-1 font-medium">
                    <HardDrive className="h-3 w-3" />
                    Stockage
                  </span>
                  <span className={cn(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded border',
                    storagePercent >= 90 ? 'bg-red-50 text-red-600 border-red-200' :
                    storagePercent >= 70 ? 'bg-amber-50 text-amber-600 border-amber-200' :
                    'bg-muted text-muted-foreground border-border'
                  )}>
                    {storagePercent}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-1">
                  <div
                    className={cn('h-full rounded-full transition-all duration-500',
                      storagePercent >= 90 ? 'bg-red-500' :
                      storagePercent >= 70 ? 'bg-amber-500' : 'bg-[#386FA4]'
                    )}
                    style={{ width: `${storagePercent}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground tabular-nums">
                  {formatBytes(storageInfo.used_bytes)} / {storageInfo.max_storage_gb} Go · {storageInfo.plan_name}
                </p>
                {storagePercent >= 100 && (
                  <p className="text-[10px] text-red-600 mt-1 font-medium">Quota atteint.</p>
                )}
              </div>
            )}

            {/* Nav dossiers */}
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 px-1">
              Dossiers
            </p>

            <DroppableRoot isActive={currentFolderId !== null}>
              <button
                onClick={() => setCurrentFolderId(null)}
                className={cn(
                  'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors',
                  currentFolderId === null
                    ? 'bg-[#133C55]/8 text-[#133C55] font-medium'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <FolderOpen className="h-4 w-4 shrink-0" />
                <span className="flex-1 text-left truncate text-sm">Racine</span>
              </button>
            </DroppableRoot>

            <div className="space-y-0.5 mt-1 flex-1">
              {loadingFolders ? (
                <div className="space-y-1 px-1">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-8 rounded-lg" />)}
                </div>
              ) : folders.map(folder => (
                <SidebarFolder
                  key={folder.id}
                  folder={folder}
                  isActive={currentFolderId === folder.id}
                  isDragActive={!!activeDocId}
                  onClick={() => { if (!activeDocId) setCurrentFolderId(folder.id) }}
                  onRename={() => { setSelectedFolder(folder); setRenameFolderName(folder.name); setRenameFolderOpen(true) }}
                  onDelete={() => handleDeleteFolder(folder)}
                />
              ))}
            </div>

            <button
              onClick={() => setCreateFolderOpen(true)}
              className="flex items-center gap-2 mt-3 px-2.5 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <FolderPlus className="h-3.5 w-3.5" />
              Nouveau dossier
            </button>
          </aside>

          {/* ── Contenu principal ── */}
          <div className="flex-1 flex flex-col min-w-0">

            {/* ── Toolbar ── */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              {/* Breadcrumb */}
              <nav className="flex items-center gap-1 text-sm flex-1 min-w-0">
                <button
                  onClick={() => setCurrentFolderId(null)}
                  className={cn(
                    'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors text-xs',
                    currentFolderId === null
                      ? 'text-foreground font-medium'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  Mes documents
                </button>
                {currentFolder && (
                  <>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <span
                      className="flex items-center gap-1.5 px-2 py-1 rounded-md font-medium text-xs"
                      style={{ color: currentFolder.color }}
                    >
                      <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: currentFolder.color }} />
                      {currentFolder.name}
                    </span>
                  </>
                )}
              </nav>

              {/* Search */}
              <div className="relative w-48 shrink-0">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  className="pl-8 h-8 text-sm"
                  placeholder="Rechercher…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Filter tabs */}
              <div className="flex items-center gap-0.5 border rounded-lg p-0.5 shrink-0">
                {(['all', 'admin', 'client'] as TabFilter[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setTabFilter(tab)}
                    className={cn(
                      'px-3 py-1 text-xs rounded-md transition-colors',
                      tabFilter === tab
                        ? 'bg-primary text-primary-foreground font-medium shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {tab === 'all' ? 'Tous' : tab === 'admin' ? 'Admin' : 'Client'}
                  </button>
                ))}
              </div>

              {/* View mode toggle */}
              <div className="flex items-center gap-0.5 border rounded-lg p-0.5 shrink-0">
                <button
                  onClick={() => setViewMode('list')}
                  className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-colors', viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  title="Vue liste"
                >
                  <LayoutList className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setViewMode('grid')}
                  className={cn('h-7 w-7 flex items-center justify-center rounded-md transition-colors', viewMode === 'grid' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  title="Vue grille"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* ── Documents ── */}
            <div className="flex-1 min-h-0 overflow-y-auto">
              {loadingDocs ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 rounded-lg" />)}
                </div>
              ) : filteredDocuments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted">
                    <FolderOpen className="h-7 w-7 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="font-medium">Aucun document</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {search ? 'Aucun résultat pour cette recherche.' : 'Importez un fichier ou ajoutez un lien.'}
                    </p>
                  </div>
                  {!search && (
                    <div className="flex gap-2 mt-1">
                      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setAddLinkOpen(true)}>
                        <LinkIcon className="h-3.5 w-3.5" /> Ajouter un lien
                      </Button>
                      <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading || storagePercent >= 100}>
                        <Upload className="h-3.5 w-3.5" /> Importer un fichier
                      </Button>
                    </div>
                  )}
                </div>
              ) : viewMode === 'list' ? (
                /* ── LIST VIEW ── */
                <div className="rounded-xl border overflow-hidden">
                  <div className="grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
                    <span className="w-4" />
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                      />
                    </label>
                    <span>Nom</span>
                    <span className="w-24 text-center">Visibilité</span>
                    <span className="w-16 text-right">Taille</span>
                    <span className="w-20 text-right">Ajouté</span>
                    <span className="w-8" />
                  </div>
                  <div className="divide-y">
                    {filteredDocuments.map(doc => (
                      <DocRow
                        key={doc.id}
                        doc={doc}
                        selected={selectedDocIds.has(doc.id)}
                        onToggleSelect={() => toggleDoc(doc.id)}
                        opening={openingDocId === doc.id}
                        onOpen={() => handleOpenDoc(doc)}
                        onToggleVisibility={() => handleToggleVisibility(doc)}
                        onAcknowledge={() => handleAcknowledge(doc)}
                        onRename={() => { setSelectedDoc(doc); setRenameDocName(doc.name); setRenameDocOpen(true) }}
                        onMove={() => { setSelectedDoc(doc); setMoveDocFolderId(doc.folder_id ?? 'root'); setMoveFolderOpen(true) }}
                        onDelete={() => handleDeleteDocument(doc)}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                /* ── GRID VIEW ── */
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {filteredDocuments.map(doc => (
                    <DocCard
                      key={doc.id}
                      doc={doc}
                      selected={selectedDocIds.has(doc.id)}
                      onToggleSelect={() => toggleDoc(doc.id)}
                      opening={openingDocId === doc.id}
                      onOpen={() => handleOpenDoc(doc)}
                      onToggleVisibility={() => handleToggleVisibility(doc)}
                      onAcknowledge={() => handleAcknowledge(doc)}
                      onRename={() => { setSelectedDoc(doc); setRenameDocName(doc.name); setRenameDocOpen(true) }}
                      onMove={() => { setSelectedDoc(doc); setMoveDocFolderId(doc.folder_id ?? 'root'); setMoveFolderOpen(true) }}
                      onDelete={() => handleDeleteDocument(doc)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── DragOverlay ── */}
        <DragOverlay>
          {activeDoc && (
            <div className="flex items-center gap-2 bg-foreground text-background rounded-xl px-3 py-2 shadow-2xl text-sm font-medium max-w-[220px] pointer-events-none">
              {getFileIcon(activeDoc, 'sm')}
              <span className="truncate">{activeDoc.name}</span>
            </div>
          )}
        </DragOverlay>

      </DndContext>

      {/* ── Bulk action bar ── */}
      {someSelected && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-foreground text-background rounded-2xl shadow-2xl px-5 py-3 animate-in slide-in-from-bottom-4">
          <span className="text-sm font-medium">
            {selectedDocIds.size} sélectionné{selectedDocIds.size > 1 ? 's' : ''}
          </span>
          <div className="w-px h-4 bg-background/20" />
          <button
            onClick={() => { setBulkMoveFolderId('root'); setBulkMoveOpen(true) }}
            className="flex items-center gap-1.5 text-sm font-medium hover:text-primary transition-colors"
          >
            <FolderSymlink className="h-4 w-4" />
            Déplacer
          </button>
          <div className="w-px h-4 bg-background/20" />
          <button
            onClick={() => setBulkDeleteOpen(true)}
            className="flex items-center gap-1.5 text-sm font-medium hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
            Supprimer
          </button>
          <button
            onClick={clearSelection}
            className="flex items-center justify-center h-6 w-6 rounded-full bg-background/10 hover:bg-background/20 transition-colors ml-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ── Dialogs ── */}

      {/* Bulk delete confirm */}
      <Dialog open={bulkDeleteOpen} onOpenChange={setBulkDeleteOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Supprimer {selectedDocIds.size} document{selectedDocIds.size > 1 ? 's' : ''} ?</DialogTitle>
            <DialogDescription>
              Cette action est irréversible. Les fichiers seront définitivement supprimés du stockage.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setBulkDeleteOpen(false)}>Annuler</Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deletingBulk}
              onClick={handleBulkDelete}
            >
              {deletingBulk && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Supprimer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create folder */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>Organisez vos documents par dossiers.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nom</Label>
              <Input id="folder-name" value={newFolderName} onChange={e => setNewFolderName(e.target.value)} placeholder="Ex : Contrats" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2 flex-wrap">
                {FOLDER_COLORS.map(color => (
                  <button
                    key={color} type="button" onClick={() => setNewFolderColor(color)}
                    className={cn('h-7 w-7 rounded-full border-2 transition-transform', newFolderColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105')}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateFolderOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={savingFolder || !newFolderName.trim()}>
                {savingFolder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add link */}
      <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un lien</DialogTitle>
            <DialogDescription>Ajoutez un lien externe (Figma, Notion, Drive…).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input id="link-url" type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} placeholder="https://…" required autoFocus />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-name">Nom (optionnel)</Label>
              <Input id="link-name" value={linkName} onChange={e => setLinkName(e.target.value)} placeholder="Ex : Maquette Figma" />
            </div>
            <div className="space-y-2">
              <Label>Dossier</Label>
              <Select value={linkFolderId} onValueChange={(v: string) => setLinkFolderId(v ?? 'root')}>
                <SelectTrigger><SelectValue placeholder="Choisir un dossier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Racine</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch id="link-visible" checked={linkVisibleToClient} onCheckedChange={setLinkVisibleToClient} />
              <Label htmlFor="link-visible" className="cursor-pointer">Visible par le client</Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => { setAddLinkOpen(false); setLinkName(''); setLinkUrl(''); setLinkFolderId('root'); setLinkVisibleToClient(false) }}>
                Annuler
              </Button>
              <Button type="submit" disabled={savingLink || !linkUrl.trim()}>
                {savingLink && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Ajouter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename document */}
      <Dialog open={renameDocOpen} onOpenChange={setRenameDocOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
            <DialogDescription>Modifiez le nom de ce document.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameDoc} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={renameDocName} onChange={e => setRenameDocName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameDocOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={savingRenameDoc || !renameDocName.trim()}>
                {savingRenameDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move document (single) */}
      <Dialog open={moveFolderOpen} onOpenChange={setMoveFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Déplacer vers…</DialogTitle>
            <DialogDescription>Choisissez un dossier de destination.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveDoc} className="space-y-4">
            <div className="space-y-2">
              <Label>Dossier</Label>
              <Select value={moveDocFolderId} onValueChange={(v: string) => setMoveDocFolderId(v ?? 'root')}>
                <SelectTrigger><SelectValue placeholder="Choisir un dossier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Racine</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMoveFolderOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={savingMoveDoc}>
                {savingMoveDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Déplacer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Bulk move */}
      <Dialog open={bulkMoveOpen} onOpenChange={setBulkMoveOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Déplacer {selectedDocIds.size} document{selectedDocIds.size > 1 ? 's' : ''}…</DialogTitle>
            <DialogDescription>Choisissez le dossier de destination.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulkMove} className="space-y-4">
            <div className="space-y-2">
              <Label>Dossier de destination</Label>
              <Select value={bulkMoveFolderId} onValueChange={(v: string) => setBulkMoveFolderId(v ?? 'root')}>
                <SelectTrigger><SelectValue placeholder="Choisir un dossier" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Racine</SelectItem>
                  {folders.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setBulkMoveOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={savingBulkMove}>
                {savingBulkMove && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Déplacer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Rename folder */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
            <DialogDescription>Modifiez le nom de ce dossier.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Nom</Label>
              <Input value={renameFolderName} onChange={e => setRenameFolderName(e.target.value)} required autoFocus />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameFolderOpen(false)}>Annuler</Button>
              <Button type="submit" disabled={savingRenameFolder || !renameFolderName.trim()}>
                {savingRenameFolder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── SidebarFolder ───────────────────────────────────────────────────────────

function SidebarFolder({ folder, isActive, isDragActive, onClick, onRename, onDelete }: {
  folder: Folder
  isActive: boolean
  isDragActive: boolean
  onClick: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: folder.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative group rounded-lg transition-all',
        isOver && isDragActive && 'ring-1 ring-[#59A5D8]/60 bg-[#91E5F6]/20'
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-sm transition-colors text-left',
          isActive
            ? 'font-medium'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          isOver && isDragActive && 'bg-[#91E5F6]/30'
        )}
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: folder.color }}
        />
        <span className="flex-1 truncate" style={isActive ? { color: folder.color } : undefined}>
          {folder.name}
        </span>
        {(folder.doc_count ?? 0) > 0 && (
          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
            {folder.doc_count}
          </span>
        )}
      </button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className={cn(
            'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-muted transition-opacity',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── DroppableRoot ────────────────────────────────────────────────────────────

function DroppableRoot({ children, isActive }: { children: React.ReactNode; isActive: boolean }) {
  const { setNodeRef, isOver } = useDroppable({ id: 'root' })
  return (
    <div ref={setNodeRef} className={cn(
      'rounded-md transition-colors',
      isOver && isActive && 'bg-[#91E5F6]/40 ring-1 ring-[#59A5D8]/50'
    )}>
      {children}
    </div>
  )
}

// ─── FolderCard ───────────────────────────────────────────────────────────────

function FolderCard({ folder, isDragActive, onClick, onRename, onDelete }: {
  folder: Folder
  isDragActive: boolean
  onClick: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const { setNodeRef, isOver } = useDroppable({ id: folder.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative group transition-all',
        isOver && isDragActive && 'scale-[1.03]'
      )}
    >
      <button
        onClick={onClick}
        className={cn(
          'flex flex-col items-start gap-2 w-full rounded-xl border bg-card p-3.5 text-left transition-all',
          isOver && isDragActive
            ? 'border-[#59A5D8] bg-[#91E5F6]/20 shadow-md ring-1 ring-[#59A5D8]/40'
            : 'hover:border-border/80 hover:shadow-sm'
        )}
      >
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg transition-colors"
          style={{ backgroundColor: isOver && isDragActive ? `${folder.color}35` : `${folder.color}20` }}
        >
          <FolderClosed className="h-5 w-5" style={{ color: folder.color }} />
        </div>
        <div className="w-full min-w-0 pr-4">
          <p className="text-sm font-medium truncate">{folder.name}</p>
          {(folder.doc_count ?? 0) > 0 && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {folder.doc_count} fichier{(folder.doc_count ?? 0) > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {isOver && isDragActive && (
          <span className="absolute bottom-2 right-2 text-[10px] font-medium text-[#386FA4]">
            Déposer ici
          </span>
        )}
      </button>
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className={cn(
            'absolute right-2 top-2 h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-muted transition-opacity',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

// ─── DocRow (list view) ───────────────────────────────────────────────────────

function DocRow({ doc, selected, onToggleSelect, opening, onOpen, onToggleVisibility, onAcknowledge, onRename, onMove, onDelete }: {
  doc: Document
  selected: boolean
  onToggleSelect: () => void
  opening: boolean
  onOpen: () => void
  onToggleVisibility: () => void
  onAcknowledge: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const isClientPending = doc.source === 'client' && doc.client_doc_status === 'pending_review'
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: doc.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'grid grid-cols-[auto_auto_1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2.5 hover:bg-muted/30 transition-colors group',
        selected && 'bg-primary/5 hover:bg-primary/8',
        isClientPending && !selected && 'bg-amber-50/50 hover:bg-amber-50/70',
        isDragging && 'opacity-40'
      )}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="flex items-center justify-center h-5 w-4 text-muted-foreground/40 hover:text-muted-foreground transition-colors cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Checkbox */}
      <label className="flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
        />
      </label>

      {/* Name + icon */}
      <button
        onClick={onOpen}
        disabled={opening}
        className="flex items-center gap-2.5 min-w-0 text-left hover:underline disabled:opacity-70"
      >
        {opening
          ? <Loader2 className="h-4 w-4 animate-spin shrink-0 text-muted-foreground" />
          : getFileIcon(doc)
        }
        <span className="text-sm truncate font-medium">{doc.name}</span>
        {doc.type === 'link' && <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />}
        {isClientPending && (
          <Badge className="text-[10px] px-1.5 h-4 bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100 shrink-0">
            Client
          </Badge>
        )}
      </button>

      {/* Visibility */}
      <div className="w-24 flex items-center justify-center gap-1.5">
        {isClientPending ? (
          <button onClick={onAcknowledge} className="text-[11px] font-medium text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 hover:bg-emerald-50 transition-colors flex items-center gap-1">
            <CheckCircle2 className="h-3 w-3" /> Valider
          </button>
        ) : doc.source === 'client' ? (
          <Badge className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">Reçu</Badge>
        ) : (
          <button
            onClick={onToggleVisibility}
            className={cn(
              'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md border transition-colors',
              doc.visible_to_client
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                : 'bg-muted text-muted-foreground border-border hover:bg-muted/80'
            )}
          >
            {doc.visible_to_client ? <><Eye className="h-3 w-3" /> Client</> : <><EyeOff className="h-3 w-3" /> Admin</>}
          </button>
        )}
      </div>

      {/* Size */}
      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">{formatBytes(doc.size_bytes)}</span>

      {/* Date */}
      <span className="w-20 text-right text-xs text-muted-foreground">
        {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
      </span>

      {/* Actions */}
      <div className="w-8 flex justify-end">
        <DropdownMenu>
          <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={onOpen}><ExternalLink className="h-3.5 w-3.5 mr-2" /> Ouvrir</DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}><Pencil className="h-3.5 w-3.5 mr-2" /> Renommer</DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}><FolderInput className="h-3.5 w-3.5 mr-2" /> Changer de dossier</DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleVisibility}>
              {doc.visible_to_client ? <><EyeOff className="h-3.5 w-3.5 mr-2" /> Masquer aux clients</> : <><Eye className="h-3.5 w-3.5 mr-2" /> Rendre visible aux clients</>}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
}

// ─── DocCard (grid view) ──────────────────────────────────────────────────────

function DocCard({ doc, selected, onToggleSelect, opening, onOpen, onToggleVisibility, onAcknowledge, onRename, onMove, onDelete }: {
  doc: Document
  selected: boolean
  onToggleSelect: () => void
  opening: boolean
  onOpen: () => void
  onToggleVisibility: () => void
  onAcknowledge: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const isClientPending = doc.source === 'client' && doc.client_doc_status === 'pending_review'
  const [menuOpen, setMenuOpen] = useState(false)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: doc.id })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        'relative group rounded-xl border bg-card transition-all hover:shadow-sm',
        selected ? 'border-primary ring-1 ring-primary/30 bg-primary/5' : 'hover:border-border/80',
        isClientPending && !selected && 'border-amber-200 bg-amber-50/30',
        isDragging && 'opacity-40'
      )}
    >
      {/* Drag handle */}
      <button
        {...listeners}
        {...attributes}
        className="absolute top-2 left-8 z-10 h-6 w-5 inline-flex items-center justify-center text-muted-foreground/40 hover:text-muted-foreground transition-opacity cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100"
        tabIndex={-1}
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>

      {/* Checkbox overlay */}
      <label className={cn(
        'absolute top-2.5 left-2.5 z-10 flex items-center justify-center cursor-pointer transition-opacity',
        selected || menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
      )}>
        <input
          type="checkbox"
          checked={selected}
          onChange={onToggleSelect}
          className="h-4 w-4 rounded border-2 border-white shadow accent-primary cursor-pointer bg-white"
        />
      </label>

      {/* Context menu */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className={cn(
            'absolute top-2.5 right-2.5 z-10 h-6 w-6 inline-flex items-center justify-center rounded-md bg-background/80 hover:bg-background border shadow-sm transition-opacity',
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          )}
          onClick={e => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onOpen}><ExternalLink className="h-3.5 w-3.5 mr-2" /> Ouvrir</DropdownMenuItem>
          <DropdownMenuItem onClick={onRename}><Pencil className="h-3.5 w-3.5 mr-2" /> Renommer</DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}><FolderInput className="h-3.5 w-3.5 mr-2" /> Changer de dossier</DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleVisibility}>
            {doc.visible_to_client ? <><EyeOff className="h-3.5 w-3.5 mr-2" /> Masquer</> : <><Eye className="h-3.5 w-3.5 mr-2" /> Rendre visible</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
            <Trash2 className="h-3.5 w-3.5 mr-2" /> Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Icon area */}
      <button
        onClick={onOpen}
        disabled={opening}
        className="flex items-center justify-center w-full pt-8 pb-4 disabled:opacity-70"
      >
        {opening
          ? <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
          : getFileIcon(doc, 'lg')
        }
      </button>

      {/* Info */}
      <div className="px-3 pb-3 space-y-1.5">
        <p className="text-xs font-medium truncate leading-tight" title={doc.name}>{doc.name}</p>
        <div className="flex items-center justify-between gap-1">
          <span className="text-[10px] text-muted-foreground tabular-nums">{formatBytes(doc.size_bytes)}</span>
          {isClientPending ? (
            <button onClick={onAcknowledge} className="text-[10px] font-medium text-emerald-700 border border-emerald-200 rounded px-1.5 py-0.5 hover:bg-emerald-50 transition-colors flex items-center gap-1">
              <CheckCircle2 className="h-2.5 w-2.5" /> Valider
            </button>
          ) : (
            <span className={cn(
              'inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded border',
              doc.visible_to_client
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-muted text-muted-foreground border-border'
            )}>
              {doc.visible_to_client ? <Eye className="h-2.5 w-2.5" /> : <EyeOff className="h-2.5 w-2.5" />}
              {doc.visible_to_client ? 'Client' : 'Admin'}
            </span>
          )}
        </div>
        <p className="text-[10px] text-muted-foreground">
          {format(new Date(doc.created_at), 'd MMM yyyy', { locale: fr })}
        </p>
      </div>
    </div>
  )
}
