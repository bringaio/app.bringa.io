"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Eye, Flag, History, Inbox, Lightbulb, Loader2, Package, XCircle } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { supabase } from "@/lib/supabaseclient"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { ItemDb, ItemFlag, ItemFlagStatus, ItemSuggestion, ItemSuggestionStatus, Profile } from "@/app/model/model"

type ModerationItem = Pick<ItemDb, "id" | "name" | "status" | "visibility_state" | "image_url">
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

function formatDate(value: string): string {
    return new Date(value).toISOString().split("T")[0]
}

function StatusBadge({ value }: { value: string }) {
    const isOpen = value === "pending" || value === "reviewing"
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
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [processingAction, setProcessingAction] = useState<string | null>(null)

    const stats = useMemo(() => ({
        pendingSuggestions: suggestions.filter((row) => row.status === "pending").length,
        pendingFlags: flags.filter((row) => row.status === "pending").length,
        openTotal: [...suggestions, ...flags].filter((row) => row.status === "pending" || row.status === "reviewing").length,
    }), [flags, suggestions])

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
                const [suggestionsRes, flagsRes] = await Promise.all([
                    supabase
                        .from("item_suggestions")
                        .select(`
                            id,item_id,suggested_by,suggestion_type,suggestion,status,admin_note,reviewed_at,reviewed_by,created_at,
                            item:items!item_suggestions_item_id_fkey(id,name,status,visibility_state,image_url),
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
                ])

                if (suggestionsRes.error) throw suggestionsRes.error
                if (flagsRes.error) throw flagsRes.error

                setSuggestions((suggestionsRes.data || []) as unknown as SuggestionQueueRow[])
                setFlags((flagsRes.data || []) as unknown as FlagQueueRow[])
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
        const actionId = `suggestion-${suggestionId}-${status}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("review_item_suggestion", {
                suggestion_id_input: suggestionId,
                status_input: status,
                admin_note_input: null,
            })

            if (error) throw error
            if (!data) throw new Error("Review rejected")

            const reviewedAt = new Date().toISOString()
            setSuggestions((rows) => rows.map((row) => (
                row.id === suggestionId ? { ...row, status, reviewed_at: reviewedAt } : row
            )))
        } catch {
            setActionError("Could not update the suggestion status.")
        } finally {
            setProcessingAction(null)
        }
    }

    const reviewFlag = async (flagId: string, status: Exclude<ItemFlagStatus, "pending">) => {
        const actionId = `flag-${flagId}-${status}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("review_item_flag", {
                flag_id_input: flagId,
                status_input: status,
                admin_note_input: null,
            })

            if (error) throw error
            if (!data) throw new Error("Review rejected")

            const reviewedAt = new Date().toISOString()
            setFlags((rows) => rows.map((row) => (
                row.id === flagId ? { ...row, status, reviewed_at: reviewedAt } : row
            )))
        } catch {
            setActionError("Could not update the flag status.")
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

                    <section className="grid gap-3 sm:grid-cols-3">
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
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewSuggestion(suggestion.id, "accepted")}
                                                    disabled={processingAction !== null || suggestion.status === "accepted"}
                                                >
                                                    {processingAction === `suggestion-${suggestion.id}-accepted` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Accept
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewSuggestion(suggestion.id, "rejected")}
                                                    disabled={processingAction !== null || suggestion.status === "rejected"}
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
                                                    disabled={processingAction !== null || flag.status === "resolved"}
                                                >
                                                    {processingAction === `flag-${flag.id}-resolved` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Resolve
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewFlag(flag.id, "dismissed")}
                                                    disabled={processingAction !== null || flag.status === "dismissed"}
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
