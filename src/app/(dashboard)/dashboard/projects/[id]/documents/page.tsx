'use client'

import { use, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  FileText,
  Image,
  File,
  Link,
  FolderOpen,
  Plus,
  Upload,
  ExternalLink,
  Eye,
  EyeOff,
  MoreHorizontal,
  Trash2,
  Pencil,
  FolderInput,
  ArrowLeft,
  Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { fr } from 'date-fns/locale'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Folder {
  id: string
  name: string
  color: string
  project_id: string
  created_at: string
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
  created_at: string
}

type TabFilter = 'all' | 'admin' | 'client'

const FOLDER_COLORS = ['#6B7280', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899']

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number | null): string {
  if (bytes === null || bytes === 0) return '—'
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

function getFileIcon(doc: Document) {
  if (doc.type === 'link') return <Link className="h-4 w-4 shrink-0 text-blue-500" />
  const mime = doc.mime_type ?? ''
  if (mime === 'application/pdf') return <FileText className="h-4 w-4 shrink-0 text-red-500" />
  if (mime.startsWith('image/')) return <Image className="h-4 w-4 shrink-0 text-green-500" />
  return <File className="h-4 w-4 shrink-0 text-muted-foreground" />
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function DocumentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()

  // Data
  const [folders, setFolders] = useState<Folder[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [rootCount, setRootCount] = useState(0)

  // Selection
  const [activeFolderId, setActiveFolderId] = useState<string | null | 'all'>('all')
  const [tabFilter, setTabFilter] = useState<TabFilter>('all')

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

  // Targeted items for dialogs
  const [selectedDoc, setSelectedDoc] = useState<Document | null>(null)
  const [selectedFolder, setSelectedFolder] = useState<Folder | null>(null)

  // Form state — create folder
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])
  const [savingFolder, setSavingFolder] = useState(false)

  // Form state — add link
  const [linkName, setLinkName] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [linkFolderId, setLinkFolderId] = useState<string>('root')
  const [linkVisibleToClient, setLinkVisibleToClient] = useState(false)
  const [savingLink, setSavingLink] = useState(false)

  // Form state — rename doc
  const [renameDocName, setRenameDocName] = useState('')
  const [savingRenameDoc, setSavingRenameDoc] = useState(false)

  // Form state — move doc
  const [moveDocFolderId, setMoveDocFolderId] = useState<string>('root')
  const [savingMoveDoc, setSavingMoveDoc] = useState(false)

  // Form state — rename folder
  const [renameFolderName, setRenameFolderName] = useState('')
  const [savingRenameFolder, setSavingRenameFolder] = useState(false)

  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ---------------------------------------------------------------------------
  // Fetch folders
  // ---------------------------------------------------------------------------

  async function fetchFolders() {
    setLoadingFolders(true)
    try {
      const res = await fetch(`/api/projects/${id}/folders`)
      const json = await res.json()
      if (res.ok) {
        setFolders(json.folders ?? [])
        setRootCount(json.rootCount ?? 0)
      }
    } finally {
      setLoadingFolders(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Fetch documents
  // ---------------------------------------------------------------------------

  async function fetchDocuments(folderId: string | null | 'all') {
    setLoadingDocs(true)
    try {
      let url = `/api/projects/${id}/documents`
      if (folderId !== 'all') {
        const param = folderId === null ? 'root' : folderId
        url += `?folder_id=${param}`
      }
      const res = await fetch(url)
      const json = await res.json()
      if (res.ok) {
        setDocuments(json.data ?? [])
      }
    } finally {
      setLoadingDocs(false)
    }
  }

  useEffect(() => {
    fetchFolders()
  }, [id])

  useEffect(() => {
    fetchDocuments(activeFolderId)
  }, [id, activeFolderId])

  // ---------------------------------------------------------------------------
  // Filtered documents (tab filter)
  // ---------------------------------------------------------------------------

  const filteredDocuments = documents.filter((doc) => {
    if (tabFilter === 'client') return doc.visible_to_client
    if (tabFilter === 'admin') return !doc.visible_to_client
    return true
  })

  // ---------------------------------------------------------------------------
  // Active folder label
  // ---------------------------------------------------------------------------

  function getActiveFolderLabel(): string {
    if (activeFolderId === 'all') return 'Tous les documents'
    if (activeFolderId === null) return 'Racine'
    return folders.find((f) => f.id === activeFolderId)?.name ?? 'Dossier'
  }

  // ---------------------------------------------------------------------------
  // File upload flow
  // ---------------------------------------------------------------------------

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Reset input so same file can be re-uploaded
    e.target.value = ''

    const folderId = activeFolderId === 'all' ? null : activeFolderId

    setUploading(true)
    try {
      // 1. Get presigned URL
      const presignRes = await fetch(`/api/projects/${id}/documents/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type,
          folder_id: folderId,
        }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok) {
        toast.error(presignJson.error ?? 'Erreur lors de la génération du lien d\'upload.')
        return
      }
      const { presign_url, s3_key } = presignJson as { presign_url: string; s3_key: string }

      // 2. Upload directly to S3
      const uploadRes = await fetch(presign_url, {
        method: 'PUT',
        body: file,
        headers: { 'Content-Type': file.type },
      })
      if (!uploadRes.ok) {
        toast.error('Erreur lors de l\'upload vers le stockage.')
        return
      }

      // 3. Register document in DB
      const docRes = await fetch(`/api/projects/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          type: 'file',
          url: s3_key,
          s3_key,
          size_bytes: file.size,
          mime_type: file.type,
          folder_id: folderId,
          visible_to_client: false,
        }),
      })
      const docJson = await docRes.json()
      if (!docRes.ok) {
        toast.error(docJson.error ?? 'Erreur lors de l\'enregistrement du document.')
        return
      }

      setDocuments((prev) => [docJson.data, ...prev])
      // Update folder counts
      fetchFolders()
      toast.success('Fichier ajouté')
    } catch {
      toast.error('Une erreur inattendue s\'est produite.')
    } finally {
      setUploading(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Add link
  // ---------------------------------------------------------------------------

  async function handleAddLink(e: React.FormEvent) {
    e.preventDefault()
    setSavingLink(true)
    try {
      const res = await fetch(`/api/projects/${id}/documents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: linkName.trim() || linkUrl.trim(),
          type: 'link',
          url: linkUrl.trim(),
          folder_id: linkFolderId === 'root' ? null : linkFolderId,
          visible_to_client: linkVisibleToClient,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de l\'ajout du lien.')
        return
      }
      setDocuments((prev) => [json.data, ...prev])
      fetchFolders()
      setAddLinkOpen(false)
      setLinkName('')
      setLinkUrl('')
      setLinkFolderId('root')
      setLinkVisibleToClient(false)
      toast.success('Lien ajouté')
    } finally {
      setSavingLink(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Create folder
  // ---------------------------------------------------------------------------

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
      if (!res.ok) {
        toast.error(json.error ?? 'Erreur lors de la création du dossier.')
        return
      }
      setFolders((prev) => [...prev, json.data])
      setCreateFolderOpen(false)
      setNewFolderName('')
      setNewFolderColor(FOLDER_COLORS[0])
      toast.success('Dossier créé')
    } finally {
      setSavingFolder(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Toggle visibility
  // ---------------------------------------------------------------------------

  async function handleToggleVisibility(doc: Document) {
    const res = await fetch(`/api/projects/${id}/documents/${doc.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visible_to_client: !doc.visible_to_client }),
    })
    if (res.ok) {
      setDocuments((prev) =>
        prev.map((d) => d.id === doc.id ? { ...d, visible_to_client: !doc.visible_to_client } : d)
      )
      toast.success(doc.visible_to_client ? 'Document masqué aux clients' : 'Document visible aux clients')
    } else {
      toast.error('Erreur lors de la mise à jour.')
    }
  }

  // ---------------------------------------------------------------------------
  // Delete document
  // ---------------------------------------------------------------------------

  async function handleDeleteDocument(doc: Document) {
    const res = await fetch(`/api/projects/${id}/documents/${doc.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
      fetchFolders()
      toast.success('Document supprimé')
    } else {
      toast.error('Erreur lors de la suppression.')
    }
  }

  // ---------------------------------------------------------------------------
  // Rename document
  // ---------------------------------------------------------------------------

  async function handleRenameDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDoc || !renameDocName.trim()) return
    setSavingRenameDoc(true)
    try {
      const res = await fetch(`/api/projects/${id}/documents/${selectedDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameDocName.trim() }),
      })
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => d.id === selectedDoc.id ? { ...d, name: renameDocName.trim() } : d)
        )
        setRenameDocOpen(false)
        toast.success('Document renommé')
      } else {
        toast.error('Erreur lors du renommage.')
      }
    } finally {
      setSavingRenameDoc(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Move document
  // ---------------------------------------------------------------------------

  async function handleMoveDoc(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedDoc) return
    setSavingMoveDoc(true)
    try {
      const folderId = moveDocFolderId === 'root' ? null : moveDocFolderId
      const res = await fetch(`/api/projects/${id}/documents/${selectedDoc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ folder_id: folderId }),
      })
      if (res.ok) {
        setDocuments((prev) =>
          prev.map((d) => d.id === selectedDoc.id ? { ...d, folder_id: folderId } : d)
        )
        fetchFolders()
        setMoveFolderOpen(false)
        toast.success('Document déplacé')
      } else {
        toast.error('Erreur lors du déplacement.')
      }
    } finally {
      setSavingMoveDoc(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Rename folder
  // ---------------------------------------------------------------------------

  async function handleRenameFolder(e: React.FormEvent) {
    e.preventDefault()
    if (!selectedFolder || !renameFolderName.trim()) return
    setSavingRenameFolder(true)
    try {
      const res = await fetch(`/api/projects/${id}/folders/${selectedFolder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: renameFolderName.trim() }),
      })
      if (res.ok) {
        setFolders((prev) =>
          prev.map((f) => f.id === selectedFolder.id ? { ...f, name: renameFolderName.trim() } : f)
        )
        setRenameFolderOpen(false)
        toast.success('Dossier renommé')
      } else {
        toast.error('Erreur lors du renommage.')
      }
    } finally {
      setSavingRenameFolder(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete folder
  // ---------------------------------------------------------------------------

  async function handleDeleteFolder(folder: Folder) {
    const res = await fetch(`/api/projects/${id}/folders/${folder.id}`, {
      method: 'DELETE',
    })
    if (res.ok) {
      setFolders((prev) => prev.filter((f) => f.id !== folder.id))
      if (activeFolderId === folder.id) setActiveFolderId('all')
      fetchDocuments('all')
      toast.success('Dossier supprimé')
    } else {
      toast.error('Erreur lors de la suppression du dossier.')
    }
  }

  // ---------------------------------------------------------------------------
  // Counts helper
  // ---------------------------------------------------------------------------

  function getFolderDocCount(folderId: string): number {
    return documents.filter((d) => d.folder_id === folderId).length
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Gérez les fichiers et liens de ce projet</p>
        </div>
      </div>

      <Separator />

      {/* Two-column layout */}
      <div className="flex gap-6 flex-1 min-h-0">
        {/* ------------------------------------------------------------------ */}
        {/* Folder Sidebar */}
        {/* ------------------------------------------------------------------ */}
        <aside className="w-64 shrink-0 flex flex-col gap-1">
          {/* Sidebar header */}
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Dossiers</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setCreateFolderOpen(true)}
              title="Créer un dossier"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* "All" special folder */}
          <button
            onClick={() => setActiveFolderId('all')}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full text-left transition-colors ${
              activeFolderId === 'all'
                ? 'bg-accent text-accent-foreground font-medium'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="h-4 w-4 shrink-0" />
            <span className="flex-1 truncate">Tous les documents</span>
          </button>

          {/* "Root" special folder */}
          <button
            onClick={() => setActiveFolderId(null)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full text-left transition-colors ${
              activeFolderId === null
                ? 'bg-accent text-accent-foreground font-medium'
                : 'hover:bg-muted text-muted-foreground hover:text-foreground'
            }`}
          >
            <FolderOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="flex-1 truncate">Racine</span>
            {rootCount > 0 && (
              <Badge variant="secondary" className="text-xs h-5 px-1.5">{rootCount}</Badge>
            )}
          </button>

          {/* Real folders */}
          {loadingFolders ? (
            <div className="space-y-1 mt-1">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-8 w-full rounded-md" />
              ))}
            </div>
          ) : (
            folders.map((folder) => (
              <FolderItem
                key={folder.id}
                folder={folder}
                isActive={activeFolderId === folder.id}
                docCount={getFolderDocCount(folder.id)}
                onClick={() => setActiveFolderId(folder.id)}
                onRename={() => {
                  setSelectedFolder(folder)
                  setRenameFolderName(folder.name)
                  setRenameFolderOpen(true)
                }}
                onDelete={() => handleDeleteFolder(folder)}
              />
            ))
          )}
        </aside>

        {/* ------------------------------------------------------------------ */}
        {/* Document List */}
        {/* ------------------------------------------------------------------ */}
        <div className="flex-1 flex flex-col gap-4 min-w-0">
          {/* Doc list header */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <h2 className="text-base font-semibold">{getActiveFolderLabel()}</h2>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Tab filter */}
              <div className="flex items-center gap-1 border rounded-md p-0.5">
                {(['all', 'admin', 'client'] as TabFilter[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setTabFilter(tab)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      tabFilter === tab
                        ? 'bg-primary text-primary-foreground font-medium'
                        : 'text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {tab === 'all' ? 'Tous' : tab === 'admin' ? 'Admin' : 'Client'}
                  </button>
                ))}
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5"
                onClick={() => setAddLinkOpen(true)}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                Ajouter un lien
              </Button>

              <Button
                size="sm"
                className="gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                Ajouter un fichier
              </Button>

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={handleFileSelect}
              />
            </div>
          </div>

          {/* Document items */}
          {loadingDocs ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground/40" />
              <div>
                <p className="font-medium text-muted-foreground">Aucun document</p>
                <p className="text-sm text-muted-foreground/60 mt-1">
                  Ajoutez un fichier ou un lien pour commencer.
                </p>
              </div>
              <div className="flex gap-2 mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => setAddLinkOpen(true)}
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Ajouter un lien
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-3.5 w-3.5" />
                  Ajouter un fichier
                </Button>
              </div>
            </div>
          ) : (
            <div className="border rounded-md divide-y">
              {filteredDocuments.map((doc) => (
                <DocumentItem
                  key={doc.id}
                  doc={doc}
                  onOpen={() => window.open(doc.url, '_blank')}
                  onToggleVisibility={() => handleToggleVisibility(doc)}
                  onRename={() => {
                    setSelectedDoc(doc)
                    setRenameDocName(doc.name)
                    setRenameDocOpen(true)
                  }}
                  onMove={() => {
                    setSelectedDoc(doc)
                    setMoveDocFolderId(doc.folder_id ?? 'root')
                    setMoveFolderOpen(true)
                  }}
                  onDelete={() => handleDeleteDocument(doc)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* -------------------------------------------------------------------- */}
      {/* Dialog — Create Folder */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={createFolderOpen} onOpenChange={setCreateFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
            <DialogDescription>Créez un dossier pour organiser vos documents.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder-name">Nom</Label>
              <Input
                id="folder-name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Ex : Contrats"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label>Couleur</Label>
              <div className="flex gap-2">
                {FOLDER_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setNewFolderColor(color)}
                    className={`h-7 w-7 rounded-full border-2 transition-transform ${
                      newFolderColor === color ? 'border-foreground scale-110' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setCreateFolderOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={savingFolder || !newFolderName.trim()}>
                {savingFolder && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Créer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* Dialog — Add Link */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={addLinkOpen} onOpenChange={setAddLinkOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter un lien</DialogTitle>
            <DialogDescription>Ajoutez un lien externe (Figma, Google Drive, Notion…).</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddLink} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="link-url">URL</Label>
              <Input
                id="link-url"
                type="url"
                value={linkUrl}
                onChange={(e) => setLinkUrl(e.target.value)}
                placeholder="https://…"
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-name">Nom (optionnel)</Label>
              <Input
                id="link-name"
                value={linkName}
                onChange={(e) => setLinkName(e.target.value)}
                placeholder="Ex : Maquette Figma"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="link-folder">Dossier</Label>
              <Select value={linkFolderId} onValueChange={(v) => setLinkFolderId(v ?? '')}>
                <SelectTrigger id="link-folder">
                  <SelectValue placeholder="Choisir un dossier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Racine</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch
                id="link-visible"
                checked={linkVisibleToClient}
                onCheckedChange={setLinkVisibleToClient}
              />
              <Label htmlFor="link-visible" className="cursor-pointer">Visible par le client</Label>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setAddLinkOpen(false)
                  setLinkName('')
                  setLinkUrl('')
                  setLinkFolderId('root')
                  setLinkVisibleToClient(false)
                }}
              >
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

      {/* -------------------------------------------------------------------- */}
      {/* Dialog — Rename Document */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={renameDocOpen} onOpenChange={setRenameDocOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer</DialogTitle>
            <DialogDescription>Modifiez le nom de ce document.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameDoc} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-doc-name">Nouveau nom</Label>
              <Input
                id="rename-doc-name"
                value={renameDocName}
                onChange={(e) => setRenameDocName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameDocOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={savingRenameDoc || !renameDocName.trim()}>
                {savingRenameDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Enregistrer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* Dialog — Move Document */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={moveFolderOpen} onOpenChange={setMoveFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Déplacer vers…</DialogTitle>
            <DialogDescription>Choisissez un dossier de destination.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleMoveDoc} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="move-folder">Dossier</Label>
              <Select value={moveDocFolderId} onValueChange={(v) => setMoveDocFolderId(v ?? '')}>
                <SelectTrigger id="move-folder">
                  <SelectValue placeholder="Choisir un dossier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">Racine</SelectItem>
                  {folders.map((f) => (
                    <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setMoveFolderOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={savingMoveDoc}>
                {savingMoveDoc && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Déplacer
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* -------------------------------------------------------------------- */}
      {/* Dialog — Rename Folder */}
      {/* -------------------------------------------------------------------- */}
      <Dialog open={renameFolderOpen} onOpenChange={setRenameFolderOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Renommer le dossier</DialogTitle>
            <DialogDescription>Modifiez le nom de ce dossier.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRenameFolder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rename-folder-name">Nouveau nom</Label>
              <Input
                id="rename-folder-name"
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                required
                autoFocus
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setRenameFolderOpen(false)}>
                Annuler
              </Button>
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

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface FolderItemProps {
  folder: Folder
  isActive: boolean
  docCount: number
  onClick: () => void
  onRename: () => void
  onDelete: () => void
}

function FolderItem({ folder, isActive, docCount, onClick, onRename, onDelete }: FolderItemProps) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="relative group">
      <button
        onClick={onClick}
        className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm w-full text-left transition-colors ${
          isActive
            ? 'bg-accent text-accent-foreground font-medium'
            : 'hover:bg-muted text-muted-foreground hover:text-foreground'
        }`}
      >
        <span
          className="h-2.5 w-2.5 rounded-full shrink-0"
          style={{ backgroundColor: folder.color }}
        />
        <span className="flex-1 truncate">{folder.name}</span>
        {docCount > 0 && (
          <Badge variant="secondary" className="text-xs h-5 px-1.5">{docCount}</Badge>
        )}
      </button>

      {/* Context menu button — visible on hover */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger
          className={`absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 inline-flex items-center justify-center rounded-md hover:bg-accent ${
            menuOpen ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          } transition-opacity`}
          onClick={(e: React.MouseEvent) => e.stopPropagation()}
        >
          <MoreHorizontal className="h-3.5 w-3.5" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

interface DocumentItemProps {
  doc: Document
  onOpen: () => void
  onToggleVisibility: () => void
  onRename: () => void
  onMove: () => void
  onDelete: () => void
}

function DocumentItem({ doc, onOpen, onToggleVisibility, onRename, onMove, onDelete }: DocumentItemProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors group">
      {/* Icon + Name */}
      <button
        onClick={onOpen}
        className="flex items-center gap-2 flex-1 min-w-0 text-left hover:underline"
        title={doc.url}
      >
        {getFileIcon(doc)}
        <span className="text-sm truncate">{doc.name}</span>
        {doc.type === 'link' && (
          <ExternalLink className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
      </button>

      {/* Visibility badge */}
      <Badge
        variant={doc.visible_to_client ? 'default' : 'secondary'}
        className={`text-xs shrink-0 ${
          doc.visible_to_client ? 'bg-green-100 text-green-700 hover:bg-green-100' : ''
        }`}
      >
        {doc.visible_to_client ? 'Client' : 'Admin'}
      </Badge>

      {/* Size */}
      <span className="text-xs text-muted-foreground w-16 text-right shrink-0">
        {formatBytes(doc.size_bytes)}
      </span>

      {/* Date */}
      <span className="text-xs text-muted-foreground w-20 text-right shrink-0">
        {format(new Date(doc.created_at), 'd MMM', { locale: fr })}
      </span>

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger className="h-7 w-7 inline-flex items-center justify-center rounded-md hover:bg-accent opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={onRename}>
            <Pencil className="h-3.5 w-3.5 mr-2" />
            Renommer
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onMove}>
            <FolderInput className="h-3.5 w-3.5 mr-2" />
            Changer de dossier
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onToggleVisibility}>
            {doc.visible_to_client ? (
              <>
                <EyeOff className="h-3.5 w-3.5 mr-2" />
                Masquer aux clients
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5 mr-2" />
                Rendre visible aux clients
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-3.5 w-3.5 mr-2" />
            Supprimer
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
