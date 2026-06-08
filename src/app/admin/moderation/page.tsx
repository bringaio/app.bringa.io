"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { CheckCircle2, Eye, EyeOff, History, Inbox, Loader2, Package, Pencil, Sparkles, XCircle } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { supabase } from "@/lib/supabaseclient"
import { buildAdminRouteGate } from "@/lib/admin-route-gate"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ItemDb, ItemSuggestion, Profile } from "@/app/model/model"
import { buildItemChangeApplication } from "@/lib/admin-moderation-review"
import { buildAdminVisibilityQueue, type AdminVisibilityQueueEntry, type AdminVisibilityQueueItem } from "@/lib/admin-visibility-queue"

type ModerationItem = Pick<ItemDb, "id" | "name" | "description" | "status" | "visibility_state" | "image_url" | "owner_kind" | "owner_profile_id" | "owner_label">
type ProfileSummary = Pick<Profile, "id" | "email" | "display_name" | "display_surname">

type ChangeRequestRow = ItemSuggestion & {
    item?: ModerationItem | ModerationItem[] | null
    suggested_by_profile?: ProfileSummary | ProfileSummary[] | null
}

const VISIBILITY_OPTIONS: Array<{ value: string; label: string }> = [
    { value: "visible", label: "Visible" },
    { value: "user_hidden", label: "User hidden" },
    { value: "admin_hidden", label: "Admin hidden" },
    { value: "pending_visible", label: "Pending visible" },
    { value: "deleted_user_hidden", label: "Deleted (user hidden)" },
    { value: "archived", label: "Archived" },
]

const OPEN_STATUSES = new Set(["pending", "reviewing"])

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
    const [requests, setRequests] = useState<ChangeRequestRow[]>([])
    const [visibilityItems, setVisibilityItems] = useState<AdminVisibilityQueueItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [processingAction, setProcessingAction] = useState<string | null>(null)
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [visibilityReasons, setVisibilityReasons] = useState<Record<string, string>>({})
    const adminGate = buildAdminRouteGate({ adminLoading, isAdmin, contentLoading: loading })

    const visibilityQueue = useMemo(() => buildAdminVisibilityQueue(visibilityItems), [visibilityItems])
    const openRequests = useMemo(() => requests.filter((row) => OPEN_STATUSES.has(row.status)), [requests])
    const historyRequests = useMemo(() => requests.filter((row) => !OPEN_STATUSES.has(row.status)), [requests])

    useEffect(() => {
        if (adminGate.redirectTo) {
            router.push(adminGate.redirectTo)
        }
    }, [adminGate.redirectTo, router])

    useEffect(() => {
        const fetchModeration = async () => {
            try {
                setLoading(true)
                setError(null)
                const [requestsRes, visibilityRes] = await Promise.all([
                    supabase
                        .from("item_suggestions")
                        .select(`
                            id,item_id,suggested_by,suggestion_type,suggestion,status,admin_note,reviewed_at,reviewed_by,created_at,
                            item:items!item_suggestions_item_id_fkey(id,name,description,status,visibility_state,image_url,owner_kind,owner_profile_id,owner_label),
                            suggested_by_profile:profiles!item_suggestions_suggested_by_fkey(id,email,display_name,display_surname)
                        `)
                        .order("created_at", { ascending: false })
                        .limit(100),
                    supabase
                        .from("items")
                        .select("id,name,status,visibility_state,visibility_reason,image_url,created_at")
                        .eq("visibility_state", "pending_visible")
                        .order("created_at", { ascending: false })
                        .limit(50),
                ])

                if (requestsRes.error) throw requestsRes.error
                if (visibilityRes.error) throw visibilityRes.error

                setRequests((requestsRes.data || []) as unknown as ChangeRequestRow[])
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

    const startReview = async (request: ChangeRequestRow) => {
        setActionError(null)
        setExpandedId(request.id)
        if (request.status === "reviewing") return

        const actionId = `review-${request.id}`
        setProcessingAction(actionId)
        try {
            const { data, error } = await supabase.rpc("review_item_suggestion", {
                suggestion_id_input: request.id,
                status_input: "reviewing",
                admin_note_input: null,
            })
            if (error) throw error
            if (!data) throw new Error("Review rejected")

            setRequests((rows) => rows.map((row) => (
                row.id === request.id ? { ...row, status: "reviewing" } : row
            )))
        } catch {
            setActionError("Could not mark this request as reviewing.")
        } finally {
            setProcessingAction(null)
        }
    }

    const acceptChanges = async (event: React.FormEvent<HTMLFormElement>, request: ChangeRequestRow) => {
        event.preventDefault()
        const formData = new FormData(event.currentTarget)
        const current = relationOne(request.item)
        const application = buildItemChangeApplication({
            name: String(formData.get("name") || ""),
            description: String(formData.get("description") || ""),
            imageUrl: current?.image_url || "",
            ownerKind: current?.owner_kind || "operator",
            ownerProfileId: current?.owner_profile_id || "",
            ownerLabel: current?.owner_label || "",
            visibilityState: String(formData.get("visibilityState") || ""),
        })

        if (!application.ok) {
            setActionError("Add an item name and a valid owner target before accepting these changes.")
            return
        }

        const actionId = `accept-${request.id}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("apply_item_change_request", {
                suggestion_id_input: request.id,
                name_input: application.name,
                description_input: application.description,
                image_url_input: application.imageUrl,
                owner_kind_input: application.ownerKind,
                owner_profile_id_input: application.ownerProfileId,
                owner_label_input: application.ownerLabel,
                visibility_state_input: application.visibilityState,
            })

            if (error) throw error
            if (!data) throw new Error("Change application rejected")

            const reviewedAt = new Date().toISOString()
            setRequests((rows) => rows.map((row) => {
                if (row.id !== request.id) return row
                const item = relationOne(row.item)
                return {
                    ...row,
                    status: "accepted",
                    reviewed_at: reviewedAt,
                    item: item
                        ? {
                            ...item,
                            name: application.name || item.name,
                            description: application.description,
                            image_url: application.imageUrl,
                            owner_kind: application.ownerKind,
                            owner_profile_id: application.ownerProfileId,
                            owner_label: application.ownerLabel,
                            visibility_state: application.visibilityState,
                        }
                        : row.item,
                }
            }))
            setExpandedId(null)
        } catch {
            setActionError("Could not apply the changes to the item.")
        } finally {
            setProcessingAction(null)
        }
    }

    const rejectRequest = async (request: ChangeRequestRow) => {
        const actionId = `reject-${request.id}`
        setProcessingAction(actionId)
        setActionError(null)
        try {
            const { data, error } = await supabase.rpc("review_item_suggestion", {
                suggestion_id_input: request.id,
                status_input: "rejected",
                admin_note_input: null,
            })

            if (error) throw error
            if (!data) throw new Error("Reject rejected")

            const reviewedAt = new Date().toISOString()
            setRequests((rows) => rows.map((row) => (
                row.id === request.id ? { ...row, status: "rejected", reviewed_at: reviewedAt } : row
            )))
            if (expandedId === request.id) setExpandedId(null)
        } catch {
            setActionError("Could not reject the change request.")
        } finally {
            setProcessingAction(null)
        }
    }

    const reviewVisibility = async (item: AdminVisibilityQueueEntry, visibilityState: "visible" | "admin_hidden") => {
        const reason = (visibilityReasons[item.id] || "").trim()
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
            setVisibilityReasons((current) => {
                const next = { ...current }
                delete next[item.id]
                return next
            })
        } catch {
            setActionError("Could not update the item visibility.")
        } finally {
            setProcessingAction(null)
        }
    }

    if (adminGate.showLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!adminGate.render) {
        return null
    }

    return (
        <ProtectedRoute>
            <div className="flex w-full flex-col gap-5 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Moderation Queue</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Member change requests and pending visibility for admin review</p>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard">Back to dashboard</Link>
                        </Button>
                    </div>

                    <section className="grid gap-3 sm:grid-cols-3">
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Open change requests</span>
                                <Inbox className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{openRequests.length}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Pending visibility</span>
                                <Eye className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{visibilityQueue.length}</p>
                        </div>
                        <div className="rounded-lg border bg-card p-3">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-medium text-muted-foreground">Change history</span>
                                <History className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <p className="mt-2 text-2xl font-semibold tabular-nums">{historyRequests.length}</p>
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
                                        <div className="flex w-full flex-col gap-2 sm:max-w-72">
                                            <Input
                                                value={visibilityReasons[item.id] || ""}
                                                onChange={(event) => setVisibilityReasons((current) => ({ ...current, [item.id]: event.target.value }))}
                                                placeholder="Visibility reason"
                                                className="text-sm"
                                            />
                                            <div className="flex flex-wrap gap-2 sm:justify-end">
                                                <Button asChild variant="outline" size="sm" className="sm:shrink-0">
                                                    <Link href={`/items/details?id=${item.id}`}>Open item</Link>
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="secondary"
                                                    size="sm"
                                                    onClick={() => reviewVisibility(item, "visible")}
                                                    disabled={processingAction !== null || (visibilityReasons[item.id] || "").trim().length < 3}
                                                >
                                                    {processingAction === `visibility-${item.id}-visible` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                    Approve
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => reviewVisibility(item, "admin_hidden")}
                                                    disabled={processingAction !== null || (visibilityReasons[item.id] || "").trim().length < 3}
                                                >
                                                    {processingAction === `visibility-${item.id}-admin_hidden` ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
                                                    Hide
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Change requests</h2>
                            <span className="text-xs text-muted-foreground">{openRequests.length} open</span>
                        </div>
                        {openRequests.length === 0 ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No open change requests.
                            </div>
                        ) : (
                            openRequests.map((request) => {
                                const item = relationOne(request.item)
                                const profile = relationOne(request.suggested_by_profile)
                                const expanded = expandedId === request.id

                                return (
                                    <div key={request.id} className="rounded-lg border bg-card p-4">
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
                                                        <StatusBadge value={request.status} />
                                                        <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                            <Sparkles className="h-3 w-3" />
                                                            Change request
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-2 truncate font-semibold">{item?.name || "Deleted item"}</h3>
                                                    <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{request.suggestion}</p>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {profileName(profile)} · {formatDate(request.created_at)}
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
                                                    variant={expanded ? "outline" : "secondary"}
                                                    size="sm"
                                                    onClick={() => (expanded ? setExpandedId(null) : startReview(request))}
                                                    disabled={processingAction !== null || !item}
                                                >
                                                    {processingAction === `review-${request.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
                                                    {expanded ? "Close" : "Review"}
                                                </Button>
                                            </div>
                                        </div>

                                        {expanded && item && (
                                            <form onSubmit={(event) => acceptChanges(event, request)} className="mt-4 grid gap-3 rounded-md border bg-background p-3 sm:grid-cols-2">
                                                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                    Item name
                                                    <Input name="name" defaultValue={item.name} required className="text-sm font-normal text-foreground" />
                                                </label>
                                                <label className="flex flex-col gap-1 text-xs font-medium text-muted-foreground">
                                                    Visibility
                                                    <select
                                                        name="visibilityState"
                                                        defaultValue={item.visibility_state || "visible"}
                                                        className="h-9 rounded-md border bg-background px-3 text-sm font-normal text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                                    >
                                                        {VISIBILITY_OPTIONS.map((option) => (
                                                            <option key={option.value} value={option.value}>{option.label}</option>
                                                        ))}
                                                    </select>
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
                                                <div className="flex flex-wrap justify-end gap-2 sm:col-span-2">
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => rejectRequest(request)}
                                                        disabled={processingAction !== null}
                                                    >
                                                        {processingAction === `reject-${request.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                        Reject
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        variant="secondary"
                                                        size="sm"
                                                        disabled={processingAction !== null}
                                                    >
                                                        {processingAction === `accept-${request.id}` ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                                                        Accept Changes
                                                    </Button>
                                                </div>
                                            </form>
                                        )}
                                    </div>
                                )
                            })
                        )}
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Change history</h2>
                            <span className="text-xs text-muted-foreground">{historyRequests.length} records</span>
                        </div>
                        {historyRequests.length === 0 ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No resolved change requests yet.
                            </div>
                        ) : (
                            historyRequests.map((request) => {
                                const item = relationOne(request.item)
                                const profile = relationOne(request.suggested_by_profile)

                                return (
                                    <div key={request.id} className="rounded-lg border bg-card p-4">
                                        <div className="flex min-w-0 items-start gap-3">
                                            {item?.image_url ? (
                                                <AppImage
                                                    src={item.image_url}
                                                    alt=""
                                                    width={40}
                                                    height={40}
                                                    sizes="40px"
                                                    className="h-10 w-10 shrink-0 rounded-md border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-muted">
                                                    <Package className="h-5 w-5 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <div className="flex flex-wrap items-center gap-2">
                                                    <StatusBadge value={request.status} />
                                                    <span className="text-xs text-muted-foreground">{formatDate(request.reviewed_at || request.created_at)}</span>
                                                </div>
                                                <h3 className="mt-2 truncate font-semibold">{item?.name || "Deleted item"}</h3>
                                                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{request.suggestion}</p>
                                                <p className="mt-2 text-xs text-muted-foreground">Requested by {profileName(profile)}</p>
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
