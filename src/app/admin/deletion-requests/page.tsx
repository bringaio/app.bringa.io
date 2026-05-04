"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, Clock3, Loader2, ShieldAlert, UserRound, XCircle } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { supabase } from "@/lib/supabaseclient"
import {
    buildDeletionRequestReview,
    canReviewDeletionRequestStatus,
    summarizeDeletionRequests,
    type AccountDeletionRequestSummary,
    type AccountDeletionReviewStatus,
} from "@/lib/admin-deletion-requests"
import type { AccountDeletionRequest, Profile } from "@/app/model/model"

type ProfileSummary = Pick<Profile, "id" | "email" | "display_name" | "display_surname" | "avatar_url">

type DeletionRequestRow = AccountDeletionRequest & {
    user?: ProfileSummary | ProfileSummary[] | null
}

function relationOne<T>(value: T | T[] | null | undefined): T | null {
    if (Array.isArray(value)) return value[0] ?? null
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

function StatusBadge({ value }: { value: AccountDeletionRequest["status"] }) {
    const open = value === "pending" || value === "reviewing"

    return (
        <span
            className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                open ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200" : "bg-muted text-muted-foreground"
            }`}
        >
            {value}
        </span>
    )
}

function SummaryCards({ summary }: { summary: AccountDeletionRequestSummary<DeletionRequestRow> }) {
    const cards = [
        { label: "Open", value: summary.openCount, icon: ShieldAlert },
        { label: "Pending", value: summary.counts.pending, icon: Clock3 },
        { label: "Reviewing", value: summary.counts.reviewing, icon: UserRound },
        { label: "Completed", value: summary.counts.completed, icon: CheckCircle2 },
        { label: "Cancelled", value: summary.counts.cancelled, icon: XCircle },
    ]

    return (
        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {cards.map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-lg border bg-card p-3">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-muted-foreground">{label}</span>
                        <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                </div>
            ))}
        </section>
    )
}

export default function AdminDeletionRequestsPage() {
    const router = useRouter()
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [summary, setSummary] = useState<AccountDeletionRequestSummary<DeletionRequestRow> | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [reviewNote, setReviewNote] = useState("")
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push("/dashboard")
        }
    }, [adminLoading, isAdmin, router])

    useEffect(() => {
        const fetchDeletionRequests = async () => {
            try {
                setLoading(true)
                setError(null)

                const { data, error } = await supabase
                    .from("account_deletion_requests")
                    .select(`
                        id,user_id,status,user_note,admin_note,requested_at,reviewed_at,reviewed_by,completed_at,created_at,
                        user:profiles!account_deletion_requests_user_id_fkey(id,email,display_name,display_surname,avatar_url)
                    `)
                    .order("requested_at", { ascending: false })
                    .limit(100)

                if (error) throw error
                setSummary(summarizeDeletionRequests((data || []) as unknown as DeletionRequestRow[]))
            } catch {
                setError("Deletion requests are unavailable until the account deletion contract is applied.")
            } finally {
                setLoading(false)
            }
        }

        if (isAdmin) {
            fetchDeletionRequests()
        }
    }, [isAdmin])

    const reviewDeletionRequest = async (request: DeletionRequestRow, status: AccountDeletionReviewStatus) => {
        const review = buildDeletionRequestReview({ status, note: reviewNote })
        if (!review.ok) {
            setActionError("Add a short admin note before cancelling this deletion request.")
            return
        }

        setProcessingId(`${request.id}-${status}`)
        setActionError(null)

        try {
            const { data, error: reviewError } = await supabase.rpc("review_account_deletion_request", {
                request_id_input: request.id,
                status_input: status,
                admin_note_input: review.adminNote,
            })

            if (reviewError) throw reviewError
            if (!data) throw new Error("Review rejected")

            const reviewedAt = new Date().toISOString()
            setSummary((current) => current
                ? summarizeDeletionRequests(current.sorted.map((row) => (
                    row.id === request.id
                        ? { ...row, status, admin_note: review.adminNote ?? row.admin_note, reviewed_at: reviewedAt, completed_at: null }
                        : row
                )))
                : current)
            if (review.adminNote) setReviewNote("")
        } catch {
            setActionError("Could not update the deletion request.")
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
                                    Back to dashboard
                                </Link>
                            </Button>
                            <h1 className="text-2xl font-bold">Deletion Requests</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Non-destructive operator review queue for account deletion requests</p>
                        </div>
                    </div>

                    <div className="rounded-lg border bg-card p-4">
                        <div className="flex items-center gap-2 text-sm font-medium">
                            <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                            No destructive action here
                        </div>
                        <p className="mt-2 text-sm text-muted-foreground">
                            This queue does not delete Supabase Auth users, Storage objects, or item records. Use it to triage requests before an approved operator workflow.
                        </p>
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

                    {summary && <SummaryCards summary={summary} />}

                    <section className="rounded-lg border bg-card p-4">
                        <label htmlFor="deletion-review-note" className="text-sm font-medium">Review note</label>
                        <textarea
                            id="deletion-review-note"
                            value={reviewNote}
                            onChange={(event) => setReviewNote(event.target.value)}
                            rows={3}
                            className="mt-2 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                            placeholder="Record triage context. Required when cancelling a request."
                        />
                        <p className="mt-2 text-xs text-muted-foreground">This route only updates review status and notes.</p>
                    </section>

                    {summary && summary.sorted.length === 0 && !error ? (
                        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                            No deletion requests yet.
                        </div>
                    ) : summary ? (
                        <section className="flex flex-col gap-2">
                            <div className="flex items-center justify-between">
                                <h2 className="text-sm font-semibold">Requests</h2>
                                <span className="text-xs text-muted-foreground">{summary.sorted.length} records</span>
                            </div>
                            {summary.sorted.map((request) => {
                                const profile = relationOne(request.user)
                                const canReview = canReviewDeletionRequestStatus(request.status)
                                const reviewDates = [
                                    request.reviewed_at ? `Reviewed ${formatDate(request.reviewed_at)}` : null,
                                    request.completed_at ? `Completed ${formatDate(request.completed_at)}` : null,
                                ].filter(Boolean)

                                return (
                                    <div key={request.id} className="rounded-lg border bg-card p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                {profile?.avatar_url ? (
                                                    <AppImage
                                                        src={profile.avatar_url}
                                                        alt=""
                                                        width={48}
                                                        height={48}
                                                        sizes="48px"
                                                        className="h-12 w-12 shrink-0 rounded-full border object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border bg-muted">
                                                        <UserRound className="h-5 w-5 text-muted-foreground" />
                                                    </div>
                                                )}
                                                <div className="min-w-0">
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <StatusBadge value={request.status} />
                                                        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                            Requested {formatDate(request.requested_at)}
                                                        </span>
                                                    </div>
                                                    <h3 className="mt-2 truncate font-semibold">{profileName(profile)}</h3>
                                                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{request.user_note || "No user note provided."}</p>
                                                    {reviewDates.length > 0 && (
                                                        <p className="mt-2 text-xs text-muted-foreground">
                                                            {reviewDates.join(" · ")}
                                                        </p>
                                                    )}
                                                    {request.admin_note && (
                                                        <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">Admin note: {request.admin_note}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 sm:max-w-64 sm:justify-end">
                                                {profile && (
                                                    <Button asChild variant="outline" size="sm">
                                                        <Link href={`/admin/user-items?id=${profile.id}`}>User items</Link>
                                                    </Button>
                                                )}
                                                {canReview && (
                                                    <>
                                                        <Button
                                                            type="button"
                                                            variant="secondary"
                                                            size="sm"
                                                            onClick={() => reviewDeletionRequest(request, "reviewing")}
                                                            disabled={processingId !== null || request.status === "reviewing"}
                                                        >
                                                            {processingId === `${request.id}-reviewing` ? <Loader2 className="h-4 w-4 animate-spin" /> : <Clock3 className="h-4 w-4" />}
                                                            Reviewing
                                                        </Button>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => reviewDeletionRequest(request, "cancelled")}
                                                            disabled={processingId !== null || request.status === "cancelled" || reviewNote.trim().length < 3}
                                                        >
                                                            {processingId === `${request.id}-cancelled` ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                                                            Cancel
                                                        </Button>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </section>
                    ) : null}
                </div>
            </div>
        </ProtectedRoute>
    )
}
