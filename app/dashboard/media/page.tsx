"use client"

import React, { useEffect, useRef, useState } from 'react'
import { useAuthV2 as useAuth } from '@/hooks/use-auth-v2'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useToast } from '@/hooks/use-toast'
import { Upload, Trash2, Image as ImageIcon, Loader2 } from 'lucide-react'

interface MediaItem {
  path: string
  url: string
  name: string
  size: number
  type: string
  width?: number
  height?: number
}

export default function MediaManagerPage() {
  const { profile } = useAuth()
  const { toast } = useToast()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [loading, setLoading] = useState(false)
  const [folder, setFolder] = useState('')

  useEffect(() => {
    // Optionally, fetch an index list from storage list API (not implemented here). Admin sees session uploads only for now.
  }, [])

  const onChoose = () => fileRef.current?.click()

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const form = new FormData()
      form.append('file', file)
      if (folder) form.append('folder', folder)
      const res = await fetch('/api/media/upload', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Upload failed')

      const item: MediaItem = {
        path: data.path,
        url: data.url,
        name: data.name,
        size: data.size,
        type: data.type,
      }

      if (item.type.startsWith('image/')) {
        const img = new Image()
        const dims = await new Promise<{ w: number; h: number }>((resolve) => {
          img.onload = () => resolve({ w: img.width, h: img.height })
          img.src = item.url
        })
        item.width = dims.w
        item.height = dims.h
      }

      setItems((prev) => [item, ...prev])
      toast({ title: 'Uploaded', description: `${item.name} uploaded successfully` })
    } catch (e: any) {
      toast({ title: 'Upload failed', description: e.message, variant: 'destructive' })
    } finally {
      setUploading(false)
    }
  }

  const onFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return
    files.forEach(onUpload)
    e.currentTarget.value = ''
  }

  const onDelete = async (path: string) => {
    setLoading(true)
    try {
      const url = new URL('/api/media/delete', window.location.origin)
      url.searchParams.set('path', path)
      const res = await fetch(url.toString(), { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      setItems((prev) => prev.filter((i) => i.path !== path))
      toast({ title: 'Deleted', description: 'Media removed' })
    } catch (e: any) {
      toast({ title: 'Delete failed', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const readableSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Media Manager</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload Media</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input placeholder="Optional folder (e.g., banners)" value={folder} onChange={(e) => setFolder(e.target.value)} className="max-w-xs" />
            <Button onClick={onChoose} disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload
            </Button>
            <input ref={fileRef} type="file" multiple onChange={onFiles} className="hidden" />
          </div>
          <p className="text-sm text-muted-foreground">Accepted: images/video/pdf. For images, include alt text where used. Max ~20MB. Resolution shown after upload.</p>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {items.map((m) => (
          <Card key={m.path}>
            <CardHeader>
              <CardTitle className="text-base truncate" title={m.name}>{m.name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-start gap-3">
                {m.type.startsWith('image/') ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt={m.name} className="h-24 w-24 object-cover rounded" />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center bg-white/10 rounded"><ImageIcon className="h-8 w-8" /></div>
                )}
                <div className="text-sm">
                  <div>Type: {m.type}</div>
                  <div>Size: {readableSize(m.size)}</div>
                  {m.width && m.height && <div>Resolution: {m.width}×{m.height}</div>}
                  <div className="mt-2 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.open(m.url, '_blank')}>Open</Button>
                    <Button variant="destructive" size="sm" disabled={loading} onClick={() => onDelete(m.path)}>
                      <Trash2 className="h-4 w-4 mr-1" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}