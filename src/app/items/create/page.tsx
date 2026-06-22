"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import imageCompression from 'browser-image-compression'
import { supabase } from "@/lib/supabaseclient"
import { appConfig } from "@/lib/app-config"
import { formatBytes, imageUploadAccept, validateImageFile } from "@/lib/media"
import {
    buildItemImageRpcFields,
    cleanupUploadedItemImage,
    uploadItemImageRenditions,
    type UploadedItemImage,
} from "@/lib/item-image-upload"
import { buildCreateItemErrorMessage, createItemRejectedMessage } from "@/lib/item-create-errors"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Upload, Loader2 } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { AppImage } from "@/components/ui/app-image"

export default function CreateItemPage() {
    const router = useRouter()
    const [name, setName] = useState(() => {
        if (typeof window === "undefined") return ""

        return new URLSearchParams(window.location.search).get("name") ?? ""
    })
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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        let uploadedImage: UploadedItemImage | null = null

        try {
            if (!name.trim()) throw new Error("Name is required")

            const { data: userResult, error: userError } = await supabase.auth.getUser()
            if (userError) throw userError
            if (!userResult.user) throw new Error("You need to be signed in to create an item")

            if (file) {
                uploadedImage = await uploadItemImageRenditions({
                    file,
                    userId: userResult.user.id,
                    mediaConfig: appConfig.media,
                    supabase,
                    compressImage: imageCompression,
                })
            }

            const { data: itemId, error: insertError } = await supabase.rpc('create_item', {
                name_input: name,
                description_input: description,
                ...buildItemImageRpcFields(uploadedImage),
            })

            if (insertError) throw insertError
            if (!itemId) throw new Error(createItemRejectedMessage)

            router.push('/dashboard')
            router.refresh()
        } catch (err: unknown) {
            await cleanupUploadedItemImage(supabase, uploadedImage)
            console.error(err)
            setError(buildCreateItemErrorMessage(err))
        } finally {
            setLoading(false)
        }
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background p-4 pt-12 mt-12">
                <div className="max-w-md mx-auto bg-card rounded-lg shadow-sm border p-6">
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
