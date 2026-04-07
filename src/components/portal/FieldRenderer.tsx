'use client'

import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

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
}

interface FieldRendererProps {
  field: FormField
  value: unknown
  onChange: (v: unknown) => void
  error?: string
}

export function FieldRenderer({ field, value, onChange, error }: FieldRendererProps) {
  const strValue = typeof value === 'string' ? value : ''
  const arrValue = Array.isArray(value) ? (value as string[]) : []

  function renderInput() {
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
                    if (e.target.checked) {
                      onChange([...arrValue, opt])
                    } else {
                      onChange(arrValue.filter((v) => v !== opt))
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )

      case 'file':
        return (
          <div className="rounded-md border border-dashed border-muted-foreground/40 p-4 text-center bg-muted/30">
            <p className="text-sm text-muted-foreground">
              Upload disponible après connexion
            </p>
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
