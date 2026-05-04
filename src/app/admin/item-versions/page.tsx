"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, History, Loader2, Package, RotateCcw } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { buildAdminItemVersionTimeline, summarizeAdminItemVersions, type AdminItemVersion, type AdminItemVersionTimelineEntry } from "@/lib/admin-item-versions"
import { supabase } from "@/lib/supabaseclient"
import type { ItemDb } from "@/app/model/model"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{12}$/i

type VersionedItem = Pick<ItemDb, "id" | "name" | "description" | "image_url" | "status" | "owner_kind" | "owner_label" | "visibility_state"> & {
    created_at: string | null
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "Unknown date"
    const date = new Date(value)
    if (!Number.isFinite(date.getTime())) return "Unknown date"
    return date.toISOString().split("T")[0]
}

function itemOwnerLabel(item: VersionedItem): string {
    if (item.owner_kind === "profile") return "Profile owner"
    if (item.owner_kind === "free_text") return item.owner_label || "Free-text owner"
    return item.owner_label || "Operator"
}

function StatusBadge({ value }: { value: string | null | undefined }) {
    const borrowed = value === "borrowed"

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${borrowed ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200"}`}>
            {borrowed ? "Borrowed" : "In stock"}
        </span>
    )
}

function VisibilityBadge({ value }: { value: string | null | undefined }) {
    const visibility = value || "visible"
    const hidden = visibility !== "visible"

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${hidden ? "bg-muted text-muted-foreground" : "bg-secondary text-secondary-foreground"}`}>
            {visibility.replaceAll("_", " ")}
        </span>
    )
}

function VersionCard({
    version,
    restoreReason,
    processingId,
    onRestore,
}: {
    version: AdminItemVersionTimelineEntry
    restoreReason: string
    processingId: string | null
    onRestore: (version: AdminItemVersionTimelineEntry) => void
}) {
    const isProcessing = processingId === version.id

    return (
        <div className="rounded-lg border bg-card p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 gap-3">
                    {version.image_url ? (
                        <AppImage
                            src={version.image_url}
                            alt=""
                            width={56}
                            height={56}
                            sizes="56px"
                            className="h-14 w-14 shrink-0 rounded-md border object-cover"
                        />
                    ) : (
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border bg-muted">
                            <Package className="h-6 w-6 text-muted-foreground" />
                        </div>
                    )}
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
                                {version.label}
                            </span>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                {version.visibilityLabel}
                            </span>
                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                {version.ownerLabel}
                            </span>
                        </div>
                        <h3 className="mt-2 truncate font-semibold">{version.name || "Unnamed item"}</h3>
                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{version.description || "No description"}</p>
                        <p className="mt-2 text-xs text-muted-foreground">
                            {formatDate(version.created_at)} · {version.reasonLabel}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2 sm:max-w-56 sm:justify-end">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => onRestore(version)}
                        disabled={processingId !== null || restoreReason.trim().length < 3}
                    >
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                        Restore
                    </Button>
                </div>
            </div>
        </div>
    )
}

function AdminItemVersionsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const itemId = searchParams.get("itemId")
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [item, setItem] = useState<VersionedItem | null>(null)
    const [versions, setVersions] = useState<AdminItemVersion[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const [restoreReason, setRestoreReason] = useState("")
    const [processingId, setProcessingId] = useState<string | null>(null)

    const timeline = useMemo(() => buildAdminItemVersionTimeline(versions), [versions])
    const summary = useMemo(() => summarizeAdminItemVersions(versions), [versions])

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push("/dashboard")
        }
    }, [adminLoading, isAdmin, router])

    const fetchVersions = useCallback(async () => {
        if (!itemId || !uuidPattern.test(itemId)) {
            setError("Choose a valid item from an admin item view.")
            setLoading(false)
            return
        }

        try {
            setLoading(true)
            setError(null)

            const [itemRes, versionsRes] = await Promise.all([
                supabase
                    .from("items")
                    .select("id,name,description,image_url,status,owner_kind,owner_label,visibility_state,created_at")
                    .eq("id", itemId)
                    .single(),
                supabase
                    .from("item_versions")
                    .select("id,item_id,version_number,name,description,image_url,owner_kind,owner_profile_id,owner_label,visibility_state,actor_id,reason,created_at")
                    .eq("item_id", itemId)
                    .order("version_number", { ascending: false }),
            ])

            if (itemRes.error) throw itemRes.error
            if (versionsRes.error) throw versionsRes.error

            setItem(itemRes.data as VersionedItem)
            setVersions((versionsRes.data || []) as AdminItemVersion[])
        } catch {
            setError("Item versions are unavailable until the Supabase versioning contract is applied.")
        } finally {
            setLoading(false)
        }
    }, [itemId])

    useEffect(() => {
        if (isAdmin && !adminLoading) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- admin data loads asynchronously after role resolution.
            fetchVersions()
        }
    }, [adminLoading, fetchVersions, isAdmin])

    const restoreVersion = async (version: AdminItemVersionTimelineEntry) => {
        const reason = restoreReason.trim()
        if (reason.length < 3) {
            setActionError("Add a short restore reason before restoring a version.")
            return
        }

        const confirmed = window.confirm(`Restore ${version.label} as the current item version?`)
        if (!confirmed) return

        setProcessingId(version.id)
        setActionError(null)
        setActionMessage(null)

        try {
            const { data, error: restoreError } = await supabase.rpc("restore_item_version", {
                version_id_input: version.id,
                reason_input: reason,
            })

            if (restoreError) throw restoreError
            if (!data) throw new Error("Restore rejected")

            setActionMessage(`${version.label} was restored as the current item version.`)
            setRestoreReason("")
            await fetchVersions()
        } catch {
            setActionError("Could not restore the selected item version.")
        } finally {
            setProcessingId(null)
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
                        <div className="min-w-0">
                            <Button asChild variant="ghost" size="sm" className="mb-2 w-fit px-0">
                                <Link href="/admin/dashboard">
                                    <ArrowLeft className="h-4 w-4" />
                                    Admin dashboard
                                </Link>
                            </Button>
                            <h1 className="text-2xl font-bold">Item Versions</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                Review snapshots and restore a selected version with a recorded reason.
                            </p>
                        </div>
                        {item && (
                            <Button asChild variant="outline">
                                <Link href={`/items/details?id=${item.id}`}>Open item</Link>
                            </Button>
                        )}
                    </div>

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

                    {actionMessage && (
                        <div role="status" className="rounded-lg border bg-card p-4 text-sm text-muted-foreground">
                            {actionMessage}
                        </div>
                    )}

                    {item && (
                        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_20rem]">
                            <div className="rounded-lg border bg-card p-4">
                                <div className="flex min-w-0 gap-3">
                                    {item.image_url ? (
                                        <AppImage
                                            src={item.image_url}
                                            alt=""
                                            width={64}
                                            height={64}
                                            sizes="64px"
                                            className="h-16 w-16 shrink-0 rounded-md border object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border bg-muted">
                                            <Package className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <StatusBadge value={item.status} />
                                            <VisibilityBadge value={item.visibility_state} />
                                            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                {itemOwnerLabel(item)}
                                            </span>
                                        </div>
                                        <h2 className="mt-2 truncate text-lg font-semibold">{item.name || "Unnamed item"}</h2>
                                        <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{item.description || "No description"}</p>
                                        <p className="mt-2 text-xs text-muted-foreground">Created {formatDate(item.created_at)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="rounded-lg border bg-card p-4">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <History className="h-4 w-4 text-muted-foreground" />
                                    Version history
                                </div>
                                <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Versions</dt>
                                        <dd className="font-semibold tabular-nums">{summary.totalVersions}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-xs text-muted-foreground">Latest</dt>
                                        <dd className="font-semibold tabular-nums">{summary.latestVersionNumber ?? "None"}</dd>
                                    </div>
                                    <div className="col-span-2">
                                        <dt className="text-xs text-muted-foreground">Latest date</dt>
                                        <dd className="font-semibold">{formatDate(summary.latestCreatedAt)}</dd>
                                    </div>
                                </dl>
                            </div>
                        </section>
                    )}

                    <section className="rounded-lg border bg-card p-4">
                        <label htmlFor="restore-reason" className="text-sm font-medium">Restore reason</label>
                        <textarea
                            id="restore-reason"
                            value={restoreReason}
                            onChange={(event) => setRestoreReason(event.target.value)}
                            rows={3}
                            className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Describe why this version should become current again."
                        />
                        <p className="mt-2 text-xs text-muted-foreground">Restore writes a new version record and keeps borrow state unchanged.</p>
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Snapshots</h2>
                            <span className="text-xs text-muted-foreground">{timeline.length} records</span>
                        </div>

                        {timeline.length === 0 && !error ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No item versions recorded yet.
                            </div>
                        ) : (
                            timeline.map((version) => (
                                <VersionCard
                                    key={version.id}
                                    version={version}
                                    restoreReason={restoreReason}
                                    processingId={processingId}
                                    onRestore={restoreVersion}
                                />
                            ))
                        )}
                    </section>
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function AdminItemVersionsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <AdminItemVersionsContent />
        </Suspense>
    )
}
