"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Eye, EyeOff, Flag, History, Inbox, Lightbulb, Loader2, Package, XCircle } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { supabase } from "@/lib/supabaseclient"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ItemDb, ItemFlag, ItemFlagStatus, ItemSuggestion, ItemSuggestionStatus, Profile } from "@/app/model/model"
import {
    buildAcceptedSuggestionApplication,
    buildAdminModerationReviewNote,
    buildImageSuggestionApplication,
    buildOwnerSuggestionApplication,
    moderationReviewRequiresNote,
    type AdminModerationReviewStatus,
} from "@/lib/admin-moderation-review"
import { buildAdminVisibilityQueue, type AdminVisibilityQueueEntry, type AdminVisibilityQueueItem } from "@/lib/admin-visibility-queue"

type ModerationItem = Pick<ItemDb, "id" | "name" | "description" | "status" | "visibility_state" | "image_url" | "owner_kind" | "owner_profile_id" | "owner_label">
type ProfileSummary = Pick<Profile, "id" | "email" | "display_name" | "display_surname">

type SuggestionQueueRow = ItemSuggestion & {
    item?: ModerationItem | ModerationItem[] | null
    suggested_by_profile?: ProfileSummary | ProfileSummary[] | null
}

type FlagQueueRow = ItemFlag & {
    item?: ModerationItem | ModerationItem[] | null
    flagged_by_profile?: ProfileSummary | ProfileSummary[] | null
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) {
        return value[0] ?? null
    }
    return value ?? null
}

function profileName(profile: ProfileSummary | null): string {
    if (!profile) return "Deleted or unavailable user"
    const name = `${profile.display_name || ""} ${profile.display_surname || ""}`.trim()
    return name || profile.email || "Unnamed user"
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "Unknown date"
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return "Unknown date"
    return date.toISOString().split("T")[0]
}

function StatusBadge({ value }: { value: string }) {
    const isOpen = value === "pending" || value === "reviewing" || value === "pending_visible"
    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isOpen ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-muted text-muted-foreground"}`}>
            {value.replaceAll("_", " ")}
        </span>
    )
}

export default function AdminModerationPage() {
    const router = useRouter()
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [suggestions, setSuggestions] = useState<SuggestionQueueRow[]>([])
    const [flags, setFlags] = useState<FlagQueueRow[]>([])
    const [visibilityItems, setVisibilityItems] = useState<AdminVisibilityQueueItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [processingAction, setProcessingAction] = useState<string | null>(null)
    const [visibilityReason, setVisibilityReason] = useState("")
    const [reviewNote, setReviewNote] = useState("")

    const visibilityQueue = useMemo(() => buildAdminVisibilityQueue(visibilityItems), [visibilityItems])
    const stats = useMemo(() => ({
        pendingSuggestions: suggestions.filter((row) => row.status === "pending").length,
        pendingFlags: flags.filter((row) => row.status === "pending").length,
        pendingVisibility: visibilityQueue.length,
        openTotal: [...suggestions, ...flags].filter((row) => row.status === "pending" || row.status === "reviewing").length + visibilityQueue.length,
    }), [flags, suggestions, visibilityQueue])

    const canSubmitReviewStatus = (status: AdminModerationReviewStatus): boolean => (
        !moderationReviewRequiresNote(status) || reviewNote.trim().length >= 3
    )

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push("/dashboard")
        }
    }, [adminLoading, isAdmin, router])

    useEffect(() => {
        const fetchModeration = async () => {
            try {
                setLoading(true)
                setError(null)
                const [suggestionsRes, flagsRes, visibilityRes] = await Promise.all([
                    supabase
                        .from("item_suggestions")
                        .select(`
                            id,item_id,suggested_by,suggestion_type,suggestion,status,admin_note,reviewed_at,reviewed_by,created_at,
                            item:items!item_suggestions_item_id_fkey(id,name,description,status,visibility_state,image_url,owner_kind,owner_profile_id,owner_label),
                            suggested_by_profile:profiles!item_suggestions_suggested_by_fkey(id,email,display_name,display_surname)
                        `)
                        .order("created_at", { ascending: false })
                        .limit(50),
                    supabase
                        .from("item_flags")
                        .select(`
                            id,item_id,flagged_by,reason,note,status,admin_note,reviewed_at,reviewed_by,created_at,
                            item:items!item_flags_item_id_fkey(id,name,status,visibility_state,image_url),
                            flagged_by_profile:profiles!item_flags_flagged_by_fkey(id,email,display_name,display_surname)
                        `)
                        .order("created_at", { ascending: false })
                        .limit(50),
                    supabase
                        .from("items")
                        .select("id,name,status,visibility_state,visibility_reason,image_url,created_at")
                        .eq("visibility_state", "pending_visible")
                        .order("created_at", { ascending: false })
                        .limit(50),
                ])

                if (suggestionsRes.error) throw suggestionsRes.error
                if (flagsRes.error) throw flagsRes.error
                if (visibilityRes.error) throw visibilityRes.error

                setSuggestions((suggestionsRes.data || []) as unknown as SuggestionQueueRow[])
                setFlags((flagsRes.data || []) as unknown as FlagQueueRow[])
                setVisibilityItems((visibilityRes.data || []) as AdminVisibilityQueueItem[])
            } catch {
                setError("Moderation queue is unavailable until the Supabase moderation contract is applied.")
            } finally {
                setLoading(false)
            }
        }

        if (isAdmin) {
            fetchModeration()
        }
    }, [isAdmin])

    const reviewSuggestion = async (suggestionId: string, status: Exclude<ItemSuggestionStatus, "pending">) => {
        const review = buildAdminModerationReviewNote({ status, note: reviewNote })
        if (!review.ok) {
            setActionError("Add a short admin note before completing this suggestion review.")
            return
        }

        const actionId = `suggestion-${suggestionId}-${status}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("review_item_suggestion", {
                suggestion_id_input: suggestionId,
                status_input: status,
                admin_note_input: review.adminNote,
            })

            if (error) throw error
            if (!data) throw new Error("Review rejected")

            const reviewedAt = new Date().toISOString()
            setSuggestions((rows) => rows.map((row) => (
                row.id === suggestionId ? { ...row, status, admin_note: review.adminNote ?? row.admin_note, reviewed_at: reviewedAt } : row
            )))
            if (review.adminNote) setReviewNote("")
        } catch {
            setActionError("Could not update the suggestion status.")
        } finally {
            setProcessingAction(null)
        }
    }

    const applySuggestion = async (event: React.FormEvent<HTMLFormElement>, suggestion: SuggestionQueueRow) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const application = buildAcceptedSuggestionApplication({
            name: String(formData.get("name") || ""),
            description: String(formData.get("description") || ""),
            imageUrl: String(formData.get("imageUrl") || ""),
            note: reviewNote,
        })

        if (!application.ok) {
            setActionError("Add an item name and a short admin note before applying this suggestion.")
            return
        }

        const actionId = `suggestion-${suggestion.id}-apply`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("apply_item_suggestion", {
                suggestion_id_input: suggestion.id,
                name_input: application.name,
                description_input: application.description,
                image_url_input: application.imageUrl,
                admin_note_input: application.adminNote,
            })

            if (error) throw error
            if (!data) throw new Error("Suggestion application rejected")

            const reviewedAt = new Date().toISOString()
            setSuggestions((rows) => rows.map((row) => {
                if (row.id !== suggestion.id) return row
                const item = relationOne(row.item)
                return {
                    ...row,
                    status: "accepted",
                    admin_note: application.adminNote,
                    reviewed_at: reviewedAt,
                    item: item
                        ? {
                            ...item,
                            name: application.name || item.name,
                            description: application.description,
                            image_url: application.imageUrl,
                        }
                        : row.item,
                }
            }))
            setReviewNote("")
        } catch {
            setActionError("Could not apply the suggestion to the item.")
        } finally {
            setProcessingAction(null)
        }
    }

    const applyOwnerSuggestion = async (event: React.FormEvent<HTMLFormElement>, suggestion: SuggestionQueueRow) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const application = buildOwnerSuggestionApplication({
            ownerKind: String(formData.get("ownerKind") || ""),
            ownerProfileId: String(formData.get("ownerProfileId") || ""),
            ownerLabel: String(formData.get("ownerLabel") || ""),
            note: reviewNote,
        })

        if (!application.ok) {
            setActionError("Add a valid owner target and a short admin note before applying this owner suggestion.")
            return
        }

        const actionId = `suggestion-${suggestion.id}-apply-owner`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("apply_owner_item_suggestion", {
                suggestion_id_input: suggestion.id,
                owner_kind_input: application.ownerKind,
                owner_profile_id_input: application.ownerProfileId,
                owner_label_input: application.ownerLabel,
                admin_note_input: application.adminNote,
            })

            if (error) throw error
            if (!data) throw new Error("Owner suggestion application rejected")

            const reviewedAt = new Date().toISOString()
            setSuggestions((rows) => rows.map((row) => {
                if (row.id !== suggestion.id) return row
                const item = relationOne(row.item)
                return {
                    ...row,
                    status: "accepted",
                    admin_note: application.adminNote,
                    reviewed_at: reviewedAt,
                    item: item
                        ? {
                            ...item,
                            owner_kind: application.ownerKind,
                            owner_profile_id: application.ownerProfileId,
                            owner_label: application.ownerLabel,
                        }
                        : row.item,
                }
            }))
            setReviewNote("")
        } catch {
            setActionError("Could not apply the owner suggestion to the item.")
        } finally {
            setProcessingAction(null)
        }
    }

    const applyImageSuggestion = async (event: React.FormEvent<HTMLFormElement>, suggestion: SuggestionQueueRow) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const application = buildImageSuggestionApplication({
            storageBucket: String(formData.get("storageBucket") || ""),
            storagePath: String(formData.get("storagePath") || ""),
            publicUrl: String(formData.get("publicUrl") || ""),
            caption: String(formData.get("caption") || ""),
            altText: String(formData.get("altText") || ""),
            isCover: formData.get("isCover") === "on",
            note: reviewNote,
        })

        if (!application.ok) {
            setActionError("Add a safe Storage path, alt text, and a short admin note before applying this image suggestion.")
            return
        }

        const actionId = `suggestion-${suggestion.id}-apply-image`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("apply_item_image_suggestion", {
                suggestion_id_input: suggestion.id,
                storage_bucket_input: application.storageBucket,
                storage_path_input: application.storagePath,
                public_url_input: application.publicUrl,
                caption_input: application.caption,
                alt_text_input: application.altText,
                is_cover_input: application.isCover,
                admin_note_input: application.adminNote,
            })

            if (error) throw error
            if (!data) throw new Error("Image suggestion application rejected")

            const reviewedAt = new Date().toISOString()
            setSuggestions((rows) => rows.map((row) => {
                if (row.id !== suggestion.id) return row
                const item = relationOne(row.item)
                return {
                    ...row,
                    status: "accepted",
                    admin_note: application.adminNote,
                    reviewed_at: reviewedAt,
                    item: item && application.isCover && application.publicUrl
                        ? { ...item, image_url: application.publicUrl }
                        : row.item,
                }
            }))
            setReviewNote("")
        } catch {
            setActionError("Could not apply the image suggestion to item image metadata.")
        } finally {
            setProcessingAction(null)
        }
    }

    const reviewFlag = async (flagId: string, status: Exclude<ItemFlagStatus, "pending">) => {
        const review = buildAdminModerationReviewNote({ status, note: reviewNote })
        if (!review.ok) {
            setActionError("Add a short admin note before completing this flag review.")
            return
        }

        const actionId = `flag-${flagId}-${status}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("review_item_flag", {
                flag_id_input: flagId,
                status_input: status,
                admin_note_input: review.adminNote,
            })

            if (error) throw error
            if (!data) throw new Error("Review rejected")

            const reviewedAt = new Date().toISOString()
            setFlags((rows) => rows.map((row) => (
                row.id === flagId ? { ...row, status, admin_note: review.adminNote ?? row.admin_note, reviewed_at: reviewedAt } : row
            )))
            if (review.adminNote) setReviewNote("")
        } catch {
            setActionError("Could not update the flag status.")
        } finally {
            setProcessingAction(null)
        }
    }

    const reviewVisibility = async (item: AdminVisibilityQueueEntry, visibilityState: "visible" | "admin_hidden") => {
        const reason = visibilityReason.trim()
        if (reason.length < 3) {
            setActionError("Add a short visibility reason before changing this item.")
            return
        }

        const actionId = `visibility-${item.id}-${visibilityState}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("set_item_visibility", {
                item_id_input: item.id,
                visibility_state_input: visibilityState,
                reason_input: reason,
            })

            if (error) throw error
            if (!data) throw new Error("Visibility change rejected")

            setVisibilityItems((rows) => rows.filter((row) => row.id !== item.id))
            setVisibilityReason("")
        } catch {
            setActionError("Could not update the item visibility.")
        } finally {
            setProcessingAction(null)
        }
    }

    if (adminLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!isAdmin) {
        return null
    }

    return (
        <ProtectedRoute>
            <div className="flex w-full flex-col gap-5 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Moderation Queue</h1>
                            <p className="mt-1 text-sm text-muted-foreground">User suggestions and item flags for admin review</p>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard">Back to dashboard</Link>
                        </Button>
                    </div>

                    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Open total</span>
                                <Inbox className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.openTotal}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Pending suggestions</span>
                                <Lightbulb className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.pendingSuggestions}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Pending flags</span>
                                <Flag className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.pendingFlags}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Pending visibility</span>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{stats.pendingVisibility}</p>
                        </div>
                    </section>

                    {error && (
                        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {actionError && (
                        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                            {actionError}
                        </div>
                    )}

                    <section className="rounded-lg border bg-card p-4">
                        <label htmlFor="visibility-reason" className="text-sm font-medium">Visibility reason</label>
                        <textarea
                            id="visibility-reason"
                            value={visibilityReason}
                            onChange={(event) => setVisibilityReason(event.target.value)}
                            rows={3}
                            className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Record why this item should become visible or stay hidden."
                        />
                        <p className="mt-2 text-xs text-muted-foreground">Required for pending visibility actions.</p>
                    </section>

                    <section className="rounded-lg border bg-card p-4">
                        <label htmlFor="review-note" className="text-sm font-medium">Review note</label>
                        <textarea
                            id="review-note"
                            value={reviewNote}
                            onChange={(event) => setReviewNote(event.target.value)}
                            rows={3}
                            className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Record the decision context before accepting, rejecting, resolving, or dismissing."
                        />
                        <p className="mt-2 text-xs text-muted-foreground">Required for final suggestion and flag decisions, including applying item updates.</p>
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Pending visibility</h2>
                            <span className="text-xs text-muted-foreground">{visibilityQueue.length} records</span>
                        </div>
                        {visibilityQueue.length === 0 ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No pending visibility requests.
                            </div>
                        ) : (
                            visibilityQueue.map((item) => (
                                <div key={item.id} className="rounded-lg border bg-card p-4">
                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                        <div className="flex min-w-0 gap-3">
                                            {item.image_url ? (
                                                <AppImage
                                                    src={item.image_url}
                                                    alt=""
                                                    width={48}
                                                    height={48}
                                                    sizes="48px"
                                                    className="h-12 w-12 shrink-0 rounded-md border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge value={item.visibility_state || "pending_visible"} />
                                                    <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                        {item.status === "borrowed" ? "Borrowed" : "In stock"}
                                                    </span>
                                                </div>
                                                <h3 className="mt-2 truncate font-semibold">{item.nameLabel}</h3>
                                                <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.reasonLabel}</p>
                                                <p className="mt-2 text-xs text-muted-foreground">{formatDate(item.created_at)}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-2 sm:max-w-64 sm:justify-end">
                                            <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                <Link href={`/items/details?id=${item.id}`}>Open item</Link>
                                            </Button>
                                            <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                <Link href={`/admin/item-versions?itemId=${item.id}`}>
                                                    <History className="h-4 w-4" />
                                                    Versions
                                                </Link>
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => reviewVisibility(item, "visible")}
                                                disabled={processingAction !== null || visibilityReason.trim().length < 3}
                                            >
                                                {processingAction === `visibility-${item.id}-visible` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                Approve
                                            </Button>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={() => reviewVisibility(item, "admin_hidden")}
                                                disabled={processingAction !== null || visibilityReason.trim().length < 3}
                                            >
                                                {processingAction === `visibility-${item.id}-admin_hidden` ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                                                Hide
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Suggestions</h2>
                            <span className="text-xs text-muted-foreground">{suggestions.length} records</span>
                        </div>
                        {suggestions.length === 0 ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No item suggestions yet.
                            </div>
                        ) : (
                            suggestions.map((suggestion) => {
                                const item = relationOne(suggestion.item)
                                const profile = relationOne(suggestion.suggested_by_profile)
                                const canApplySuggestion = Boolean(
                                    item
                                    && suggestion.suggestion_type === "content"
                                    && (suggestion.status === "pending" || suggestion.status === "reviewing")
                                )
                                const canApplyImageSuggestion = Boolean(
                                    item
                                    && suggestion.suggestion_type === "image"
                                    && (suggestion.status === "pending" || suggestion.status === "reviewing")
                                )
                                const canApplyOwnerSuggestion = Boolean(
                                    item
                                    && suggestion.suggestion_type === "owner"
                                    && (suggestion.status === "pending" || suggestion.status === "reviewing")
                                )

                                return (
                                    <div key={suggestion.id} className="rounded-lg border bg-card p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                {item?.image_url ? (
                                                    <AppImage
                                                        src={item.image_url}
                                                        alt=""
                                                        width={48}
                                                        height={48}
                                                        sizes="48px"
                                                        className="h-12 w-12 shrink-0 rounded-md border object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge value={suggestion.status} />
                                                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                            {suggestion.suggestion_type}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-2 truncate font-semibold">{item?.name || "Deleted item"}</h3>
                                                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{suggestion.suggestion}</p>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {profileName(profile)} · {formatDate(suggestion.created_at)}
                                                    </p>
                                                    {canApplySuggestion && item && (
                                                        <form onSubmit={(event) => applySuggestion(event, suggestion)} className="mt-3 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Item name
                                                                <Input name="name" defaultValue={item.name} required className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Image URL
                                                                <Input name="imageUrl" defaultValue={item.image_url || ""} className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
                                                                Description
                                                                <textarea
                                                                    name="description"
                                                                    defaultValue={item.description || ""}
                                                                    rows={3}
                                                                    className="min-h-20 rounded-md border bg-background px-3 py-2 text-sm font-normal text-foreground outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                />
                                                            </label>
                                                            <div className="flex justify-end sm:col-span-2">
                                                                <Button
                                                                    type="submit"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    disabled={processingAction !== null || reviewNote.trim().length < 3}
                                                                >
                                                                    {processingAction === `suggestion-${suggestion.id}-apply` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                    Apply update
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    )}
                                                    {canApplyOwnerSuggestion && item && (
                                                        <form onSubmit={(event) => applyOwnerSuggestion(event, suggestion)} className="mt-3 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Owner kind
                                                                <select
                                                                    name="ownerKind"
                                                                    defaultValue={item.owner_kind || "operator"}
                                                                    className="h-9 rounded-md border bg-background px-3 text-sm font-normal text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                                >
                                                                    <option value="operator">Operator</option>
                                                                    <option value="profile">Profile</option>
                                                                    <option value="free_text">Free-text owner</option>
                                                                </select>
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Owner profile ID
                                                                <Input name="ownerProfileId" defaultValue={item.owner_profile_id || profile?.id || ""} className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
                                                                Owner label
                                                                <Input name="ownerLabel" defaultValue={item.owner_label || ""} className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <div className="flex justify-end sm:col-span-2">
                                                                <Button
                                                                    type="submit"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    disabled={processingAction !== null || reviewNote.trim().length < 3}
                                                                >
                                                                    {processingAction === `suggestion-${suggestion.id}-apply-owner` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                    Apply owner
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    )}
                                                    {canApplyImageSuggestion && item && (
                                                        <form onSubmit={(event) => applyImageSuggestion(event, suggestion)} className="mt-3 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Storage bucket
                                                                <Input name="storageBucket" defaultValue="items" required className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Storage path
                                                                <Input name="storagePath" placeholder="item-photos/image.webp" required className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground sm:col-span-2">
                                                                Public URL
                                                                <Input name="publicUrl" defaultValue={suggestion.suggestion.startsWith("http") ? suggestion.suggestion : item.image_url || ""} className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Caption
                                                                <Input name="caption" className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                                Alt text
                                                                <Input name="altText" defaultValue={item.name} required className="text-sm font-normal text-foreground" />
                                                            </label>
                                                            <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground sm:col-span-2">
                                                                <input name="isCover" type="checkbox" defaultChecked={!item.image_url} className="h-4 w-4 rounded border" />
                                                                Set as cover image
                                                            </label>
                                                            <div className="flex justify-end sm:col-span-2">
                                                                <Button
                                                                    type="submit"
                                                                    variant="secondary"
                                                                    size="sm"
                                                                    disabled={processingAction !== null || reviewNote.trim().length < 3}
                                                                >
                                                                    {processingAction === `suggestion-${suggestion.id}-apply-image` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                                    Apply image metadata
                                                                </Button>
                                                            </div>
                                                        </form>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 sm:max-w-56 sm:justify-end">
                                                {item && (
                                                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                        <Link href={`/items/details?id=${item.id}`}>Open item</Link>
                                                    </Button>
                                                )}
                                                {item && (
                                                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                        <Link href={`/admin/item-versions?itemId=${item.id}`}>
                                                            <History className="h-4 w-4" />
                                                            Versions
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => reviewSuggestion(suggestion.id, "reviewing")}
                                                    disabled={processingAction !== null || suggestion.status === "reviewing"}
                                                >
                                                    {processingAction === `suggestion-${suggestion.id}-reviewing` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                                    Reviewing
                                                </Button>
                                                {!canApplySuggestion && !canApplyOwnerSuggestion && !canApplyImageSuggestion && (
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => reviewSuggestion(suggestion.id, "accepted")}
                                                        disabled={processingAction !== null || suggestion.status === "accepted" || !canSubmitReviewStatus("accepted")}
                                                    >
                                                        {processingAction === `suggestion-${suggestion.id}-accepted` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                        Accept
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewSuggestion(suggestion.id, "rejected")}
                                                    disabled={processingAction !== null || suggestion.status === "rejected" || !canSubmitReviewStatus("rejected")}
                                                >
                                                    {processingAction === `suggestion-${suggestion.id}-rejected` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Flags</h2>
                            <span className="text-xs text-muted-foreground">{flags.length} records</span>
                        </div>
                        {flags.length === 0 ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No item flags yet.
                            </div>
                        ) : (
                            flags.map((flag) => {
                                const item = relationOne(flag.item)
                                const profile = relationOne(flag.flagged_by_profile)

                                return (
                                    <div key={flag.id} className="rounded-lg border bg-card p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                {item?.image_url ? (
                                                    <AppImage
                                                        src={item.image_url}
                                                        alt=""
                                                        width={48}
                                                        height={48}
                                                        sizes="48px"
                                                        className="h-12 w-12 shrink-0 rounded-md border object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border bg-muted">
                                                        <Package className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge value={flag.status} />
                                                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                            {flag.reason}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-2 truncate font-semibold">{item?.name || "Deleted item"}</h3>
                                                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{flag.note || "No note provided."}</p>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {profileName(profile)} · {formatDate(flag.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 sm:max-w-56 sm:justify-end">
                                                {item && (
                                                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                        <Link href={`/items/details?id=${item.id}`}>Open item</Link>
                                                    </Button>
                                                )}
                                                {item && (
                                                    <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                        <Link href={`/admin/item-versions?itemId=${item.id}`}>
                                                            <History className="h-4 w-4" />
                                                            Versions
                                                        </Link>
                                                    </Button>
                                                )}
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => reviewFlag(flag.id, "reviewing")}
                                                    disabled={processingAction !== null || flag.status === "reviewing"}
                                                >
                                                    {processingAction === `flag-${flag.id}-reviewing` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                                                    Reviewing
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewFlag(flag.id, "resolved")}
                                                    disabled={processingAction !== null || flag.status === "resolved" || !canSubmitReviewStatus("resolved")}
                                                >
                                                    {processingAction === `flag-${flag.id}-resolved` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Resolve
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewFlag(flag.id, "dismissed")}
                                                    disabled={processingAction !== null || flag.status === "dismissed" || !canSubmitReviewStatus("dismissed")}
                                                >
                                                    {processingAction === `flag-${flag.id}-dismissed` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                    Dismiss
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </section>
                </div>
            </div>
        </ProtectedRoute>
    )
}
