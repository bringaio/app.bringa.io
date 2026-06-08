"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { ItemDb, BorrowHistoryWithProfile } from "@/app/model/model"
import { Button } from "@/components/ui/button"
import { Eye, EyeOff, Lightbulb, Loader2 } from "lucide-react"
import Link from "next/link"
import { User } from "@supabase/supabase-js"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { AppImage } from "@/components/ui/app-image"
import { ItemImageViewer } from "@/components/items/item-image-viewer"
import { buildItemDetailImages, type ItemDetailImageRow } from "@/lib/item-detail-images"
import {
    buildItemVisibilityRequest,
    itemVisibilityActionForState,
    type ItemVisibilityAction,
} from "@/lib/item-visibility-request"

function ItemDetailsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    const [item, setItem] = useState<ItemDb | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [itemImages, setItemImages] = useState<ItemDetailImageRow[]>([])
    const [borrowHistory, setBorrowHistory] = useState<BorrowHistoryWithProfile[]>([])
    const [moderationNote, setModerationNote] = useState("")
    const [moderationMessage, setModerationMessage] = useState<string | null>(null)
    const [moderationError, setModerationError] = useState<string | null>(null)
    const [moderationLoading, setModerationLoading] = useState(false)
    const [visibilityReason, setVisibilityReason] = useState("")
    const [visibilityMessage, setVisibilityMessage] = useState<string | null>(null)
    const [visibilityError, setVisibilityError] = useState<string | null>(null)
    const [visibilityLoading, setVisibilityLoading] = useState(false)
    const { isAdmin, loading: adminLoading } = useIsAdmin()

    useEffect(() => {
        if (adminLoading) return

        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (!id) {
                    setError("No item ID provided")
                    setItemImages([])
                    setLoading(false)
                    return
                }

                const { data, error } = await supabase
                    .from('items')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                setItem(data)

                const { data: imageRows, error: imageError } = await supabase
                    .from("item_images")
                    .select("id, public_url, thumbnail_public_url, storage_path, alt_text, caption, is_cover, sort_order, created_at")
                    .eq("item_id", id)
                    .eq("moderation_state", "accepted")
                    .is("deleted_at", null)
                    .order("is_cover", { ascending: false })
                    .order("sort_order", { ascending: true })
                    .order("created_at", { ascending: true })

                if (imageError) {
                    console.error("Error fetching item images:", imageError)
                    setItemImages([])
                } else {
                    setItemImages((imageRows ?? []) as ItemDetailImageRow[])
                }

                // If admin, fetch last 3 borrow history records
                if (isAdmin) {
                    const { data: historyData, error: historyError } = await supabase
                        .from('borrow_history')
                        .select(`
                            *,
                            borrower:profiles!borrow_history_borrower_id_fkey(*)
                        `)
                        .eq('item_id', id)
                        .order('borrowed_at', { ascending: false })
                        .limit(3)

                    if (!historyError && historyData) {
                        setBorrowHistory(historyData as BorrowHistoryWithProfile[])
                    }
                } else {
                    setBorrowHistory([])
                }
            } catch {
                setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.")
                setItemImages([])
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [adminLoading, id, isAdmin])

    const handleBorrow = async () => {
        if (!user || !item) return
        setActionLoading(true)
        try {
            const { data: borrowed, error } = await supabase.rpc('borrow_item', {
                item_id_input: item.id,
            })

            if (error) throw error
            if (!borrowed) {
                alert('Item is no longer available.')
                return
            }

            setItem({ ...item, status: 'borrowed', borrowed_by: user.id })
            router.refresh()
        } catch {
            alert('Aktion fehlgeschlagen. Bitte versuche es erneut.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleReturn = async () => {
        if (!user || !item) return
        setActionLoading(true)
        try {
            const { data: returned, error } = await supabase.rpc('return_item', {
                item_id_input: item.id,
            })

            if (error) throw error
            if (!returned) {
                alert('Item could not be returned.')
                return
            }

            setItem({ ...item, status: 'inStock', borrowed_by: null })
            router.refresh()
        } catch {
            alert('Aktion fehlgeschlagen. Bitte versuche es erneut.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!item) return;
        if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;

        setActionLoading(true)
        try {
            const { data: deleted, error } = await supabase.rpc('delete_item', {
                item_id_input: item.id,
            })

            if (error) throw error
            if (!deleted) {
                alert("You do not have permission to delete this item.")
                return
            }

            router.push('/dashboard')
            router.refresh()
        } catch {
            alert("Fehler beim Löschen des Eintrags.")
            setActionLoading(false)
        }
    }

    const submitChangeRequest = async () => {
        if (!item) return
        const note = moderationNote.trim()
        if (!note) {
            setModerationError("Describe what should be changed before sending.")
            setModerationMessage(null)
            return
        }

        setModerationLoading(true)
        setModerationError(null)
        setModerationMessage(null)
        try {
            const { data, error } = await supabase.rpc("create_item_suggestion", {
                item_id_input: item.id,
                suggestion_input: note,
                suggestion_type_input: "content",
            })

            if (error) throw error
            if (!data) throw new Error("Change request rejected")

            setModerationNote("")
            setModerationMessage("Change request sent for admin review.")
        } catch {
            setModerationError("Could not send the change request right now.")
        } finally {
            setModerationLoading(false)
        }
    }

    const submitVisibilityRequest = async (action: ItemVisibilityAction) => {
        if (!item) return
        const request = buildItemVisibilityRequest({
            action,
            currentVisibility: item.visibility_state,
            reason: visibilityReason,
        })

        if (!request.ok) {
            setVisibilityError("Add a short reason before changing item visibility.")
            setVisibilityMessage(null)
            return
        }

        setVisibilityLoading(true)
        setVisibilityError(null)
        setVisibilityMessage(null)
        try {
            const { data, error } = await supabase.rpc("request_item_visibility", {
                item_id_input: item.id,
                visibility_state_input: request.visibilityState,
                reason_input: request.reason,
            })

            if (error) throw error
            if (!data) throw new Error("Visibility request rejected")

            setItem({ ...item, visibility_state: request.visibilityState, visibility_reason: request.reason })
            setVisibilityReason("")
            setVisibilityMessage(action === "hide" ? "Item hidden from public lists." : "Visibility request sent for admin review.")
            router.refresh()
        } catch {
            setVisibilityError("Could not update item visibility right now.")
        } finally {
            setVisibilityLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !item) {
        return (
            <div className="min-h-screen p-4 flex flex-col items-center justify-center text-center">
                <p className="text-red-500 mb-4">{error || "Item not found"}</p>
                <Link href="/">
                    <Button variant="outline">Go Back</Button>
                </Link>
            </div>
        )
    }

    const isBorrowedByMe = item.borrowed_by === user?.id;
    const isAvailable = item.status === 'inStock';
    const canRequestVisibility = Boolean(user && (item.created_by === user.id || item.owner_profile_id === user.id))
    const visibilityAction = canRequestVisibility ? itemVisibilityActionForState(item.visibility_state) : null
    const galleryImages = buildItemDetailImages({ item, itemImages })
    const coverImage = galleryImages[0]

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background pb-20">
                <div className="max-w-2xl mx-auto px-4 pt-20 relative z-10">
                    <div className="bg-card rounded-lg shadow-sm border p-6 space-y-4">
                        {coverImage ? (
                            <ItemImageViewer
                                images={galleryImages}
                                itemName={item.name}
                                trigger={
                                    <button
                                        type="button"
                                        aria-label={`Open full image viewer for ${item.name}`}
                                        className="group relative block w-full overflow-hidden rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                                    >
                                        <AppImage
                                            src={coverImage.src}
                                            alt={coverImage.alt}
                                            width={1200}
                                            height={800}
                                            sizes="(max-width: 768px) 100vw, 672px"
                                            loading="lazy"
                                            className="aspect-[4/3] w-full object-cover transition duration-200 group-hover:brightness-95"
                                        />
                                        {galleryImages.length > 1 && (
                                            <span className="absolute right-3 top-3 rounded-full bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
                                                1 / {galleryImages.length}
                                            </span>
                                        )}
                                    </button>
                                }
                            />
                        ) : (
                            <div className="flex aspect-[4/3] w-full items-center justify-center rounded-lg border bg-muted text-sm text-muted-foreground">
                                No Image
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                            <div className="min-w-0">
                                <h1 className="break-words text-2xl font-bold">{item.name}</h1>
                                <div className="mt-2 flex flex-wrap gap-2">
                                    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ${item.status === 'borrowed'
                                        ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                        : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                                        }`}>
                                        {item.status === 'borrowed' ? 'Borrowed' : 'In Stock'}
                                    </span>
                                    {item.visibility_state && item.visibility_state !== "visible" && (
                                        <span className="inline-flex rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                            {item.visibility_state.replaceAll("_", " ")}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="prose prose-sm text-muted-foreground">
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Description</h3>
                            <p>{item.description || "No description provided."}</p>
                        </div>

                        {/* Admin View: Last 3 Borrowers */}
                        {isAdmin && borrowHistory.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Last 3 Borrowers</h3>
                                <div className="space-y-3">
                                    {borrowHistory.map((history) => (
                                        <div key={history.id} className="bg-muted rounded-lg p-3 text-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">
                                                        {history.borrower
                                                            ? `${history.borrower.display_name ?? ''} ${history.borrower.display_surname ?? ''}`.trim()
                                                            : 'Unknown User'}

                                                    </p>
                                                    <p className="text-muted-foreground text-xs">{history.borrower.email}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                <p>
                                                    <span className="font-medium">Borrowed:</span>{' '}
                                                    {new Date(history.borrowed_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                {history.returned_at ? (
                                                    <p>
                                                        <span className="font-medium">Returned:</span>{' '}
                                                        {new Date(history.returned_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                ) : (
                                                    <p className="text-orange-600 font-medium">Currently borrowed</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            {isAvailable && (
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleBorrow}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Borrow Item"}
                                </Button>
                            )}

                            {isBorrowedByMe && (
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    size="lg"
                                    onClick={handleReturn}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Return Item"}
                                </Button>
                            )}

                            {!isAvailable && !isBorrowedByMe && (
                                <Button className="w-full" variant="secondary" disabled>
                                    Currently Borrowed
                                </Button>
                            )}


                            {(isAdmin || (user && item.created_by === user.id)) && (
                                <Link href={`/items/edit?id=${item.id}`}>
                                    <Button
                                        className="w-full mt-4"
                                        variant="outline"
                                    >
                                        Edit Item
                                    </Button>
                                </Link>
                            )}

                            {(isAdmin || (user && item.created_by === user.id)) && (
                                <Button
                                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Item"}
                                </Button>
                            )}

                            {canRequestVisibility && (
                                <div className="mt-5 border-t pt-4">
                                    <div className="flex items-center gap-2">
                                        {visibilityAction === "hide" ? (
                                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                            <Eye className="h-4 w-4 text-muted-foreground" />
                                        )}
                                        <h2 className="text-sm font-semibold">Item visibility</h2>
                                    </div>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                        Hide your item from public lists, or request admin review before making a hidden item visible again.
                                    </p>

                                    {visibilityAction ? (
                                        <>
                                            <label htmlFor="visibility-reason" className="sr-only">Visibility reason</label>
                                            <textarea
                                                id="visibility-reason"
                                                value={visibilityReason}
                                                onChange={(event) => setVisibilityReason(event.target.value)}
                                                rows={3}
                                                maxLength={500}
                                                placeholder="Add a visibility reason for admins"
                                                className="mt-3 flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                            />
                                            <Button
                                                type="button"
                                                variant={visibilityAction === "hide" ? "outline" : "secondary"}
                                                className="mt-3 w-full"
                                                onClick={() => submitVisibilityRequest(visibilityAction)}
                                                disabled={visibilityLoading || visibilityReason.trim().length < 3}
                                            >
                                                {visibilityLoading ? (
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                ) : visibilityAction === "hide" ? (
                                                    <EyeOff className="h-4 w-4" />
                                                ) : (
                                                    <Eye className="h-4 w-4" />
                                                )}
                                                {visibilityAction === "hide" ? "Hide item" : "Request visibility"}
                                            </Button>
                                        </>
                                    ) : (
                                        <p className="mt-3 rounded-md border bg-muted p-3 text-sm text-muted-foreground">
                                            {item.visibility_state === "pending_visible" ? "Visibility is waiting for admin review." : "Visibility changes are not available for this item state."}
                                        </p>
                                    )}

                                    {(visibilityMessage || visibilityError) && (
                                        <p
                                            role={visibilityError ? "alert" : "status"}
                                            className={`mt-3 text-sm ${visibilityError ? "text-destructive" : "text-muted-foreground"}`}
                                        >
                                            {visibilityError || visibilityMessage}
                                        </p>
                                    )}
                                </div>
                            )}

                            <div className="mt-5 border-t pt-4">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold">Request a change</h2>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Describe what should be changed and send it to the admins for review.
                                </p>

                                <label htmlFor="moderation-note" className="sr-only">What should be changed?</label>
                                <textarea
                                    id="moderation-note"
                                    value={moderationNote}
                                    onChange={(event) => setModerationNote(event.target.value)}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Describe what should be changed"
                                    className="mt-3 flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />

                                <div className="mt-3 flex flex-col gap-2">
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="w-full"
                                        onClick={submitChangeRequest}
                                        disabled={moderationLoading || !moderationNote.trim()}
                                    >
                                        {moderationLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                                        Send request
                                    </Button>
                                </div>

                                {(moderationMessage || moderationError) && (
                                    <p
                                        role={moderationError ? "alert" : "status"}
                                        className={`mt-3 text-sm ${moderationError ? "text-destructive" : "text-muted-foreground"}`}
                                    >
                                        {moderationError || moderationMessage}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function ItemDetailsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <ItemDetailsContent />
        </Suspense>
    )
}
