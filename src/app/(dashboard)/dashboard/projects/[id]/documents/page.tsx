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
  FolderPlus, CheckCircle2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import { cn } from '@/lib/utils'

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

type TabFilter = 'all' | 'admin' | 'client'

const FOLDER_COLORS = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number | null): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getFileIcon(doc: Document, size = 'md') {
  const cls = size === 'lg' ? 'h-8 w-8' : 'h-4 w-4'
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

  // UI
  const [search, setSearch] = useState('')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')
  const [openingDocId, setOpeningDocId] = useState<string | null>(null)

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

  useEffect(() => { void fetchFolders() }, [fetchFolders])
  useEffect(() => { void fetchDocuments(currentFolderId) }, [fetchDocuments, currentFolderId])

  // ─── Computed ──────────────────────────────────────────────────────────────

  const currentFolder = folders.find(f => f.id === currentFolderId) ?? null

  const filteredDocuments = documents.filter(doc => {
    if (tabFilter === 'client' && !doc.visible_to_client) return false
    if (tabFilter === 'admin' && doc.visible_to_client) return false
    if (search) return doc.name.toLowerCase().includes(search.toLowerCase())
    return true
  })

  const folderDocCount = (folderId: string) =>
    // approximate from loaded docs (not perfectly accurate when viewing "all")
    folders.find(f => f.id === folderId) ? 0 : 0 // counts not critical in new UI

  // ─── Open file (presigned URL) ─────────────────────────────────────────────

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
    setUploading(true)
    try {
      const presignRes = await fetch(`/api/projects/${id}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, content_type: file.type, folder_id: currentFolderId }),
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
      void fetchFolders()
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

  // ─── Move doc ──────────────────────────────────────────────────────────────

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

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-0 h-full">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between gap-3 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fichiers et liens du projet</p>
        </div>

        {/* New button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="gap-2" disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Nouveau
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Importer un fichier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAddLinkOpen(true)}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Ajouter un lien
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setCreateFolderOpen(true)}>
              <FolderPlus className="h-4 w-4 mr-2" />
              Nouveau dossier
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileSelect} />
      </div>

      {/* ── Toolbar : breadcrumb + search + filter ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1 text-sm flex-1 min-w-0">
          <button
            onClick={() => setCurrentFolderId(null)}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors',
              currentFolderId === null
                ? 'text-foreground font-medium'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )}
          >
            <FolderOpen className="h-4 w-4" />
            Mes documents
          </button>
          {currentFolder && (
            <>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span
                className="flex items-center gap-1.5 px-2 py-1 rounded-md font-medium"
                style={{ color: currentFolder.color }}
              >
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentFolder.color }}
                />
                {currentFolder.name}
              </span>
            </>
          )}
        </nav>

        {/* Search */}
        <div className="relative w-52 shrink-0">
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
      </div>

      {/* ── Folders grid (only on root level) ── */}
      {currentFolderId === null && (
        <div className="mb-6">
          {loadingFolders ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 rounded-xl" />)}
            </div>
          ) : folders.length > 0 ? (
            <>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                Dossiers · {folders.length}
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                {folders.map(folder => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onClick={() => setCurrentFolderId(folder.id)}
                    onRename={() => {
                      setSelectedFolder(folder)
                      setRenameFolderName(folder.name)
                      setRenameFolderOpen(true)
                    }}
                    onDelete={() => handleDeleteFolder(folder)}
                  />
                ))}
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ── Documents list ── */}
      <div className="flex-1 min-h-0">
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
                <Button size="sm" className="gap-1.5" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  <Upload className="h-3.5 w-3.5" /> Importer un fichier
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border overflow-hidden">
            {/* Table header */}
            <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2 bg-muted/40 border-b text-xs font-medium text-muted-foreground">
              <span>Nom</span>
              <span className="w-24 text-center">Visibilité</span>
              <span className="w-16 text-right">Taille</span>
              <span className="w-20 text-right">Ajouté</span>
              <span className="w-8" />
            </div>

            {/* Rows */}
            <div className="divide-y">
              {filteredDocuments.map(doc => (
                <DocRow
                  key={doc.id}
                  doc={doc}
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
        )}
      </div>

      {/* ── Dialogs ── */}

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
                {savingFolder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer
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
              <Select value={linkFolderId} onValueChange={v => setLinkFolderId(v ?? 'root')}>
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
                {savingLink && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Ajouter
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
                {savingRenameDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Move document */}
      <Dialog open={moveFolderOpen} onOpenChange={setMoveFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Déplacer vers…</DialogTitle>
            <DialogDescription>Choisissez un dossier de destination.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveDoc} className="space-y-4">
            <div className="space-y-2">
              <Label>Dossier</Label>
              <Select value={moveDocFolderId} onValueChange={v => setMoveDocFolderId(v ?? 'root')}>
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
                {savingMoveDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Déplacer
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
                {savingRenameFolder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── FolderCard ───────────────────────────────────────────────────────────────

function FolderCard({ folder, onClick, onRename, onDelete }: {
  folder: Folder
  onClick: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className="flex flex-col items-start gap-2 w-full rounded-xl border bg-card p-3.5 text-left hover:border-border/80 hover:shadow-sm transition-all"
      >
        {/* Folder icon with color */}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-lg"
          style={{ backgroundColor: `${folder.color}20` }}
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
      </button>

      {/* Context menu */}
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

// ─── DocRow ───────────────────────────────────────────────────────────────────

function DocRow({ doc, opening, onOpen, onToggleVisibility, onAcknowledge, onRename, onMove, onDelete }: {
  doc: Document
  opening: boolean
  onOpen: () => void
  onToggleVisibility: () => void
  onAcknowledge: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}) {
  const isClientPending = doc.source === 'client' && doc.client_doc_status === 'pending_review'

  return (
    <div className={cn(
      'grid grid-cols-[1fr_auto_auto_auto_auto] gap-3 items-center px-4 py-2.5 hover:bg-muted/30 transition-colors group',
      isClientPending && 'bg-amber-50/50 hover:bg-amber-50/70',
    )}>
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
          <button
            onClick={onAcknowledge}
            className="text-[11px] font-medium text-emerald-700 border border-emerald-200 rounded-md px-2 py-0.5 hover:bg-emerald-50 transition-colors flex items-center gap-1"
          >
            <CheckCircle2 className="h-3 w-3" /> Valider
          </button>
        ) : doc.source === 'client' ? (
          <Badge className="text-[10px] h-5 px-1.5 bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50">
            Reçu
          </Badge>
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
            {doc.visible_to_client
              ? <><Eye className="h-3 w-3" /> Client</>
              : <><EyeOff className="h-3 w-3" /> Admin</>
            }
          </button>
        )}
      </div>

      {/* Size */}
      <span className="w-16 text-right text-xs text-muted-foreground tabular-nums">
        {formatBytes(doc.size_bytes)}
      </span>

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
            <DropdownMenuItem onClick={onOpen}>
              <ExternalLink className="h-3.5 w-3.5 mr-2" /> Ouvrir
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="h-3.5 w-3.5 mr-2" /> Renommer
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onMove}>
              <FolderInput className="h-3.5 w-3.5 mr-2" /> Changer de dossier
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleVisibility}>
              {doc.visible_to_client
                ? <><EyeOff className="h-3.5 w-3.5 mr-2" /> Masquer aux clients</>
                : <><Eye className="h-3.5 w-3.5 mr-2" /> Rendre visible aux clients</>
              }
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
