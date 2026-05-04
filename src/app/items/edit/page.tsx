"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import imageCompression from 'browser-image-compression'
import { supabase } from "@/lib/supabaseclient"
import { formatBytes, getImageCompressionOptions, imageUploadAccept, validateImageFile } from "@/lib/media"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2 } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { AppImage } from "@/components/ui/app-image"

function EditItemContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    useEffect(() => {
        const loadItem = async () => {
            if (!id) {
                setError("No item ID provided")
                setLoading(false)
                return
            }

            try {
                // Fetch item and check ownership
                const { data: { user } } = await supabase.auth.getUser()
                if (!user) {
                    router.push("/login")
                    return
                }

                const { data: item, error: fetchError } = await supabase
                    .from('items')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (fetchError) throw fetchError
                if (!item) {
                    setError("Item not found")
                    setLoading(false)
                    return
                }

                // Check ownership: Only creator can edit
                // Note: Admins can edit ONLY if they are the creator
                if (item.created_by !== user.id) {
                    setError("You do not have permission to edit this item.")
                    setLoading(false)
                    return
                }

                setName(item.name)
                setDescription(item.description || "")
                setCurrentImageUrl(item.image_url)
            } catch (err: unknown) {
                console.error(err)
                setError(err instanceof Error ? err.message : "Failed to load item")
            } finally {
                setLoading(false)
            }
        }
        loadItem()
    }, [id, router])

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0] || null
        if (!selectedFile) {
            setFile(null)
            setPreviewUrl(null)
            return
        }

        const validationError = validateImageFile(selectedFile)
        if (validationError) {
            setFile(null)
            setPreviewUrl(null)
            setFormError(validationError)
            return
        }

        setFormError(null)
        setFile(selectedFile)
        setPreviewUrl(URL.createObjectURL(selectedFile))
    }

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl)
        }
    }, [previewUrl])

    const uploadImage = async (file: File) => {
        try {
            const compressedFile = await imageCompression(file, getImageCompressionOptions())
            const fileName = `${crypto.randomUUID()}.webp`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('items')
                .upload(filePath, compressedFile, {
                    contentType: 'image/webp'
                })

            if (uploadError) throw uploadError

            const { data } = supabase.storage.from('items').getPublicUrl(filePath)
            return data.publicUrl
        } catch (error) {
            console.error('Error compressing image:', error)
            throw error
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!id) return;
        setSaving(true)
        setFormError(null)

        try {
            if (!name) throw new Error("Name is required")

            let imageUrl = currentImageUrl
            if (file) {
                imageUrl = await uploadImage(file)
            }

            const { error: updateError } = await supabase
                .from('items')
                .update({
                    name,
                    description,
                    image_url: imageUrl,
                })
                .eq('id', id)

            if (updateError) throw updateError

            router.push(`/items/details?id=${id}`)
            router.refresh()
        } catch (err: unknown) {
            console.error(err)
            setFormError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen p-4 flex flex-col items-center justify-center text-center">
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={() => router.back()} variant="outline">Go Back</Button>
            </div>
        )
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background p-4 pt-20">
                <div className="max-w-md mx-auto bg-card rounded-xl shadow-sm border p-6">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold">Edit Item</h1>
                    </div>

                    {formError && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
                            {formError}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="name">Item Name</Label>
                            <Input
                                id="name"
                                placeholder="e.g. MacBook Pro M1"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <textarea
                                id="description"
                                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                placeholder="Describe the item..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="image">Image</Label>
                            <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center text-muted-foreground hover:bg-accent transition-colors cursor-pointer relative">
                                <input
                                    type="file"
                                    id="image"
                                    accept={imageUploadAccept}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    onChange={handleFileChange}
                                />
                                {file ? (
                                    <div className="flex w-full flex-col items-center gap-3 text-center">
                                        {previewUrl && (
                                            <AppImage
                                                src={previewUrl}
                                                alt="Selected replacement image preview"
                                                width={640}
                                                height={360}
                                                sizes="(max-width: 768px) 100vw, 640px"
                                                className="h-36 w-full rounded-md border object-cover"
                                            />
                                        )}
                                        <div>
                                            <p className="text-sm font-medium">{file.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatBytes(file.size)} | Click to change
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        {currentImageUrl ? (
                                            <div className="mb-2 relative w-20 h-20 rounded overflow-hidden">
                                                <AppImage
                                                    src={currentImageUrl}
                                                    alt="Current"
                                                    width={80}
                                                    height={80}
                                                    sizes="80px"
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>
                                        ) : (
                                            <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                        )}
                                        <p className="text-sm">{currentImageUrl ? "Click to replace image" : "Click to upload image"}</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <Button type="button" variant="outline" className="flex-1" onClick={() => router.back()}>
                                Cancel
                            </Button>
                            <Button type="submit" className="flex-1" disabled={saving}>
                                {saving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : "Save Changes"}
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function EditItemPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <EditItemContent />
        </Suspense>
    )
}
