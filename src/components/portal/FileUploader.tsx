'use client'

import { useState, useRef, useCallback } from 'react'
import { Upload, X, CheckCircle2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface FileUploaderProps {
  projectId: string
  context: string
  onUploaded: (key: string) => void
}

interface UploadState {
  file: File
  progress: number
  status: 'pending' | 'uploading' | 'done' | 'error'
  error?: string
  key?: string
}

export function FileUploader({ projectId, context, onUploaded }: FileUploaderProps) {
  const [uploads, setUploads] = useState<UploadState[]>([])
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function updateUpload(index: number, update: Partial<UploadState>) {
    setUploads(prev => prev.map((u, i) => i === index ? { ...u, ...update } : u))
  }

  async function uploadFile(file: File, index: number) {
    updateUpload(index, { status: 'uploading', progress: 0 })

    try {
      // 1. Obtenir l'URL presignée
      const presignRes = await fetch('/api/upload/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type,
          projectId,
          context,
          size: file.size,
        }),
      })

      const presignJson = await presignRes.json()
      if (!presignRes.ok) {
        updateUpload(index, { status: 'error', error: presignJson.error ?? 'Erreur lors de la préparation' })
        return
      }

      const { uploadUrl, key } = presignJson.data

      // 2. Upload direct vers S3 via XHR pour avoir la progression
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.upload.addEventListener('progress', (e) => {
          if (e.lengthComputable) {
            const progress = Math.round((e.loaded / e.total) * 100)
            updateUpload(index, { progress })
          }
        })
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Upload échoué (${xhr.status})`))
          }
        })
        xhr.addEventListener('error', () => reject(new Error('Erreur réseau')))
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        xhr.send(file)
      })

      updateUpload(index, { status: 'done', progress: 100, key })
      onUploaded(key)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue'
      updateUpload(index, { status: 'error', error: message })
    }
  }

  function handleFiles(fileList: FileList) {
    const newFiles = Array.from(fileList)
    const startIndex = uploads.length
    const newUploads: UploadState[] = newFiles.map(f => ({
      file: f,
      progress: 0,
      status: 'pending',
    }))
    setUploads(prev => [...prev, ...newUploads])
    newFiles.forEach((file, i) => uploadFile(file, startIndex + i))
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function removeUpload(index: number) {
    setUploads(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div className="space-y-3">
      {/* Zone de drop */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragging ? 'border-primary bg-primary/5' : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <Upload className="h-8 w-8 mx-auto text-gray-400 mb-2" />
        <p className="text-sm text-gray-600 font-medium">
          Glissez vos fichiers ici ou <span className="text-primary">parcourir</span>
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Images, PDF, vidéo MP4 — max 50 Mo
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/*,application/pdf,video/mp4"
          onChange={(e) => e.target.files && handleFiles(e.target.files)}
        />
      </div>

      {/* Liste des uploads */}
      {uploads.length > 0 && (
        <div className="space-y-2">
          {uploads.map((upload, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{upload.file.name}</p>
                <p className="text-xs text-gray-400">
                  {(upload.file.size / 1024 / 1024).toFixed(2)} Mo
                </p>
                {upload.status === 'uploading' && (
                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${upload.progress}%` }}
                    />
                  </div>
                )}
                {upload.status === 'error' && (
                  <p className="text-xs text-destructive mt-0.5">{upload.error}</p>
                )}
              </div>
              <div className="shrink-0">
                {upload.status === 'done' && <CheckCircle2 className="h-5 w-5 text-green-500" />}
                {upload.status === 'error' && <AlertCircle className="h-5 w-5 text-destructive" />}
                {upload.status !== 'uploading' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-1"
                    onClick={() => removeUpload(i)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
                {upload.status === 'uploading' && (
                  <span className="text-xs text-gray-400">{upload.progress}%</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
