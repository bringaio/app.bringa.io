"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import imageCompression from 'browser-image-compression'
import { supabase } from "@/lib/supabaseclient"
import { formatBytes, getImageCompressionOptions, imageUploadAccept, validateImageFile } from "@/lib/media"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2 } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { AppImage } from "@/components/ui/app-image"

export default function CreateItemPage() {
    const router = useRouter()
    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [file, setFile] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

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
            setError(validationError)
            return
        }

        setError(null)
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
            // Compress and convert to WebP
            const compressedFile = await imageCompression(file, getImageCompressionOptions())
            const fileName = `${crypto.randomUUID()}.webp`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('items')
                .upload(filePath, compressedFile, {
                    contentType: 'image/webp'
                })

            if (uploadError) {
                throw uploadError
            }

            const { data } = supabase.storage.from('items').getPublicUrl(filePath)
            return data.publicUrl
        } catch (error) {
            console.error('Error compressing image:', error)
            throw error
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            if (!name.trim()) throw new Error("Name is required")

            let imageUrl = ""
            if (file) {
                imageUrl = await uploadImage(file)
            }

            const { data: { user } } = await supabase.auth.getUser()

            const { error: insertError } = await supabase
                .from('items')
                .insert({
                    name: name.trim(),
                    description: description.trim(),
                    image_url: imageUrl || null, // Ensure null if empty string
                    status: 'inStock',
                    created_by: user?.id
                })

            if (insertError) throw insertError

            router.push('/dashboard')
            router.refresh()
        } catch (err: unknown) {
            console.error(err)
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setLoading(false)
        }
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background p-4 pt-12 mt-12">
                <div className="max-w-md mx-auto bg-card rounded-xl shadow-sm border p-6">
                    <div className="mb-6">
                        <h1 className="text-xl font-bold">Create New Item</h1>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm">
                            {error}
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
                                                alt="Selected item image preview"
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
                                    <>
                                        <Upload className="w-8 h-8 mb-2 text-muted-foreground" />
                                        <p className="text-sm">Click to upload image</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                "Create Item"
                            )}
                        </Button>
                    </form>
                </div>
            </div>
        </ProtectedRoute>
    )
}
