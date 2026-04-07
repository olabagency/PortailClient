'use client'

import { useState, useRef, useCallback } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Upload, X, CheckCircle2, AlertCircle, Eye, EyeOff } from 'lucide-react'

interface FormField {
  id: string
  type: string
  label: string
  description: string | null
  placeholder: string | null
  required: boolean
  options: string[] | null
  order_index: number
  section_id: string | null
  sensitive?: boolean
}

interface FieldRendererProps {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
  publicId?: string
  sessionId?: string
}

// ── Portal File Uploader ──────────────────────────────────────────────────────

interface UploadState {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  key?: string
  publicUrl?: string
}

function PortalFileUploader({
  fieldId,
  publicId,
  sessionId,
  value,
  onChange,
}: {
  fieldId: string
  publicId: string
  sessionId: string
  value: unknown
  onChange: (v: unknown) => void
}) {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Restore from existing value (key string)
  const existingKey = typeof value === 'string' && value ? value : null

  function updateUpload(index: number, update: Partial<UploadState>) {
    setUploads(prev => prev.map((u, i) => i === index ? { ...u, ...update } : u))
  }

  async function uploadFile(file: File, index: number) {
    updateUpload(index, { status: 'uploading', progress: 0 })
    try {
      const presignRes = await fetch(`/api/portal/${publicId}/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || 'application/octet-stream',
          fieldId,
          sessionId,
          size: file.size,
        }),
      })
      const presignJson = await presignRes.json()
      if (!presignRes.ok) {
        updateUpload(index, { status: 'error', error: presignJson.error ?? 'Erreur de préparation' })
        return
      }
      const { uploadUrl, key } = presignJson.data

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            updateUpload(index, { progress: Math.round((e.loaded / e.total) * 100) })
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Échec upload (${xhr.status})`))
        })
        xhr.addEventListener('error', () => reject(new Error('Erreur réseau')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.send(file)
      })

      updateUpload(index, { status: 'done', progress: 100, key })
      onChange(key)
    } catch (err) {
      updateUpload(index, { status: 'error', error: err instanceof Error ? err.message : 'Erreur inconnue' })
    }
  }

  function handleFiles(fileList: FileList) {
    const newFiles = Array.from(fileList)
    const startIndex = uploads.length
    const newUploads: UploadState[] = newFiles.map(f => ({ file: f, progress: 0, status: 'pending' }))
    setUploads(prev => [...prev, ...newUploads])
    newFiles.forEach((file, i) => uploadFile(file, startIndex + i))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function removeUpload(index: number) {
    setUploads(prev => prev.filter((_, i) => i !== index))
    onChange(null)
  }

  return (
    <div className="space-y-3">
      {existingKey && uploads.length === 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-green-50 border-green-200 px-3 py-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
          <p className="text-sm text-green-700 flex-1 truncate">Fichier déjà envoyé</p>
          <Button variant="ghost" size="sm" className="h-6 text-xs text-red-500 hover:text-red-600" onClick={() => onChange(null)}>
            Remplacer
          </Button>
        </div>
      )}

      {!existingKey || uploads.length > 0 ? (
        <>
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer ${
              dragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600 font-medium">
              Glissez votre fichier ici ou <span className="text-primary underline">parcourir</span>
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PDF, images, Word, Excel — max 50 Mo
            </p>
            <input
              ref={inputRef}
              type="file"
              className="hidden"
              accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.zip,.txt"
              onChange={(e) => e.target.files && handleFiles(e.target.files)}
            />
          </div>

          {uploads.map((upload, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <p className="text-xs text-gray-400">{(upload.file.size / 1024 / 1024).toFixed(2)} Mo</p>
                {upload.status === 'uploading' && (
                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${upload.progress}%` }} />
                  </div>
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-destructive mt-0.5">{upload.error}</p>
                )}
              </div>
              <div className="shrink-0 flex items-center gap-1">
                {upload.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {upload.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                {upload.status === 'uploading' && <span className="text-xs text-gray-400">{upload.progress}%</span>}
                {upload.status !== 'uploading' && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeUpload(i)}>
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </>
      ) : null}
    </div>
  )
}

// ── Field Renderer ────────────────────────────────────────────────────────────

export function FieldRenderer({ field, value, onChange, error, publicId, sessionId }: FieldRendererProps) {
  const strValue = typeof value === 'string' ? value : ''
  const arrValue = Array.isArray(value) ? (value as string[]) : []
  const [showPassword, setShowPassword] = useState(false)

  function renderInput() {
    // Password / sensitive field
    if (field.sensitive) {
      return (
        <div className="relative">
          <Input
            id={field.id}
            type={showPassword ? 'text' : 'password'}
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? '••••••••'}
            className={`pr-10 ${error ? 'border-destructive' : ''}`}
            autoComplete="new-password"
          />
          <button
            type="button"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            onClick={() => setShowPassword(v => !v)}
            tabIndex={-1}
          >
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      )
    }

    switch (field.type) {
      case 'text':
        return (
          <Input
            id={field.id}
            type="text"
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'textarea':
        return (
          <Textarea
            id={field.id}
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? undefined}
            rows={4}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'email':
        return (
          <Input
            id={field.id}
            type="email"
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? 'votre@email.com'}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'phone':
        return (
          <Input
            id={field.id}
            type="tel"
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? '+33 6 00 00 00 00'}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'url':
        return (
          <Input
            id={field.id}
            type="url"
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder ?? 'https://monsite.com'}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'date':
        return (
          <Input
            id={field.id}
            type="date"
            value={strValue}
            onChange={(e) => onChange(e.target.value)}
            className={error ? 'border-destructive' : ''}
          />
        )

      case 'select':
        return (
          <Select value={strValue} onValueChange={onChange}>
            <SelectTrigger id={field.id} className={error ? 'border-destructive' : ''}>
              <SelectValue placeholder="Sélectionner une option..." />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((opt) => (
                <SelectItem key={opt} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )

      case 'multiselect':
        return (
          <div className={`space-y-2 ${error ? 'rounded-md border border-destructive p-3' : ''}`}>
            {(field.options ?? []).map((opt) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  value={opt}
                  checked={arrValue.includes(opt)}
                  onChange={(e) => {
                    if (e.target.checked) onChange([...arrValue, opt])
                    else onChange(arrValue.filter((v) => v !== opt))
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )

      case 'file':
        if (publicId && sessionId) {
          return (
            <PortalFileUploader
              fieldId={field.id}
              publicId={publicId}
              sessionId={sessionId}
              value={value}
              onChange={onChange}
            />
          )
        }
        return (
          <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-center bg-muted/30">
            <p className="text-sm text-muted-foreground">Upload de fichier</p>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Label htmlFor={field.id} className="text-sm font-medium">
          {field.label}
        </Label>
        {field.required && (
          <Badge variant="destructive" className="text-xs py-0 px-1.5">Requis</Badge>
        )}
        {field.sensitive && (
          <Badge variant="secondary" className="text-xs py-0 px-1.5 text-amber-700 bg-amber-50 border-amber-200">
            🔒 Chiffré
          </Badge>
        )}
      </div>
      {field.description && (
        <p className="text-xs text-muted-foreground">{field.description}</p>
      )}
      {renderInput()}
      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}
    </div>
  )
}
