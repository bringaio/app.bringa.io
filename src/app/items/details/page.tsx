"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { ItemDb, BorrowHistoryWithProfile, ItemFlagReason, ItemSuggestionType } from "@/app/model/model"
import { Button } from "@/components/ui/button"
import { Flag, Lightbulb, Loader2 } from "lucide-react"
import Link from "next/link"
import { User } from "@supabase/supabase-js"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { AppImage } from "@/components/ui/app-image"

function ItemDetailsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    const [item, setItem] = useState<ItemDb | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [borrowHistory, setBorrowHistory] = useState<BorrowHistoryWithProfile[]>([])
    const [suggestionType, setSuggestionType] = useState<ItemSuggestionType>("content")
    const [flagReason, setFlagReason] = useState<ItemFlagReason>("incorrect")
    const [moderationNote, setModerationNote] = useState("")
    const [moderationMessage, setModerationMessage] = useState<string | null>(null)
    const [moderationError, setModerationError] = useState<string | null>(null)
    const [moderationLoading, setModerationLoading] = useState<"suggestion" | "flag" | null>(null)
    const { isAdmin, loading: adminLoading } = useIsAdmin()

    useEffect(() => {
        if (adminLoading) return

        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (!id) {
                    setError("No item ID provided")
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

    const submitSuggestion = async () => {
        if (!item) return
        const note = moderationNote.trim()
        if (!note) {
            setModerationError("Add a short suggestion before sending.")
            setModerationMessage(null)
            return
        }

        setModerationLoading("suggestion")
        setModerationError(null)
        setModerationMessage(null)
        try {
            const { data, error } = await supabase.rpc("create_item_suggestion", {
                item_id_input: item.id,
                suggestion_input: note,
                suggestion_type_input: suggestionType,
            })

            if (error) throw error
            if (!data) throw new Error("Suggestion rejected")

            setModerationNote("")
            setModerationMessage("Suggestion sent for admin review.")
        } catch {
            setModerationError("Could not send the suggestion right now.")
        } finally {
            setModerationLoading(null)
        }
    }

    const submitFlag = async () => {
        if (!item) return

        setModerationLoading("flag")
        setModerationError(null)
        setModerationMessage(null)
        try {
            const { data, error } = await supabase.rpc("create_item_flag", {
                item_id_input: item.id,
                reason_input: flagReason,
                note_input: moderationNote.trim() || null,
            })

            if (error) throw error
            if (!data) throw new Error("Flag rejected")

            setModerationNote("")
            setModerationMessage("Issue flagged for admin review.")
        } catch {
            setModerationError("Could not flag this item right now.")
        } finally {
            setModerationLoading(null)
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

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background pb-20">
                <div className="max-w-2xl mx-auto px-4 pt-20 relative z-10">
                    <div className="bg-card rounded-xl shadow-sm border p-6 space-y-4">
                        {item.image_url ? (
                            <AppImage
                                src={item.image_url}
                                alt={item.name}
                                width={1200}
                                height={800}
                                sizes="(max-width: 768px) 100vw, 672px"
                                loading="lazy"
                                className="w-full h-full object-cover rounded-xl rounded-b-none"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No Image
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold">{item.name}</h1>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${item.status === 'borrowed'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                                    }`}>
                                    {item.status === 'borrowed' ? 'Borrowed' : 'In Stock'}
                                </span>
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

                            <div className="mt-5 border-t pt-4">
                                <div className="flex items-center gap-2">
                                    <Lightbulb className="h-4 w-4 text-muted-foreground" />
                                    <h2 className="text-sm font-semibold">Improve this item</h2>
                                </div>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Send a suggestion or flag an issue for admin review.
                                </p>

                                <label htmlFor="moderation-note" className="sr-only">Suggestion or issue note</label>
                                <textarea
                                    id="moderation-note"
                                    value={moderationNote}
                                    onChange={(event) => setModerationNote(event.target.value)}
                                    rows={3}
                                    maxLength={1000}
                                    placeholder="Add context for admins"
                                    className="mt-3 flex min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-[color,box-shadow] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50"
                                />

                                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                        Suggestion type
                                        <select
                                            value={suggestionType}
                                            onChange={(event) => setSuggestionType(event.target.value as ItemSuggestionType)}
                                            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        >
                                            <option value="content">Content</option>
                                            <option value="image">Image</option>
                                            <option value="visibility">Visibility</option>
                                            <option value="owner">Owner</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </label>
                                    <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                        Flag reason
                                        <select
                                            value={flagReason}
                                            onChange={(event) => setFlagReason(event.target.value as ItemFlagReason)}
                                            className="h-9 rounded-md border bg-background px-3 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
                                        >
                                            <option value="incorrect">Incorrect</option>
                                            <option value="unavailable">Unavailable</option>
                                            <option value="unsafe">Unsafe</option>
                                            <option value="image">Image</option>
                                            <option value="spam">Spam</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </label>
                                </div>

                                <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full"
                                        onClick={submitSuggestion}
                                        disabled={moderationLoading !== null}
                                    >
                                        {moderationLoading === "suggestion" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lightbulb className="h-4 w-4" />}
                                        Suggest change
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        className="w-full"
                                        onClick={submitFlag}
                                        disabled={moderationLoading !== null}
                                    >
                                        {moderationLoading === "flag" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flag className="h-4 w-4" />}
                                        Flag issue
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
