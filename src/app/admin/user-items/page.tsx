"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Edit, History, Loader2, Package, ShieldAlert, UserRound } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { AppImage } from "@/components/ui/app-image"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { supabase } from "@/lib/supabaseclient"
import { buildAdminUserItemGroups, type AdminUserItemGroup } from "@/lib/admin-user-items"
import type { ItemDb, Profile } from "@/app/model/model"

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

type AdminUserItem = ItemDb & {
    created_at: string | null
}

function profileName(profile: Profile | null): string {
    if (!profile) return "Unknown user"
    const name = `${profile.display_name || ""} ${profile.display_surname || ""}`.trim()
    return name || profile.email || "Unnamed user"
}

function formatDate(value: string | null | undefined): string {
    if (!value) return "Unknown date"
    return new Date(value).toISOString().split("T")[0]
}

function StatusBadge({ value }: { value: string | null | undefined }) {
    const status = value || "unknown"
    const borrowed = status === "borrowed"

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

function ownerLabel(item: AdminUserItem): string {
    if (item.owner_kind === "profile") return "Profile owner"
    if (item.owner_kind === "free_text") return item.owner_label || "Free-text owner"
    return item.owner_label || "Operator"
}

function AdminUserItemsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const profileId = searchParams.get("id")
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [profile, setProfile] = useState<Profile | null>(null)
    const [groups, setGroups] = useState<AdminUserItemGroup<AdminUserItem>[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const itemCount = useMemo(() => groups.reduce((total, group) => total + group.items.length, 0), [groups])

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push("/dashboard")
        }
    }, [adminLoading, isAdmin, router])

    useEffect(() => {
        const fetchUserItems = async () => {
            if (!profileId || !uuidPattern.test(profileId)) {
                setError("Choose a valid user from the admin user list.")
                setLoading(false)
                return
            }

            try {
                setLoading(true)
                setError(null)

                const [profileRes, itemsRes] = await Promise.all([
                    supabase.from("profiles").select("*").eq("id", profileId).single(),
                    supabase
                        .from("items")
                        .select("*")
                        .or(`created_by.eq.${profileId},owner_profile_id.eq.${profileId},borrowed_by.eq.${profileId}`)
                        .order("created_at", { ascending: false }),
                ])

                if (profileRes.error) throw profileRes.error
                if (itemsRes.error) throw itemsRes.error

                setProfile(profileRes.data as Profile)
                setGroups(buildAdminUserItemGroups((itemsRes.data || []) as AdminUserItem[], profileId))
            } catch {
                setError("User items are unavailable until the admin item contract is applied.")
            } finally {
                setLoading(false)
            }
        }

        if (isAdmin && !adminLoading) {
            fetchUserItems()
        }
    }, [adminLoading, isAdmin, profileId])

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
                                <Link href="/admin/users">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to users
                                </Link>
                            </Button>
                            <h1 className="text-2xl font-bold">User Items</h1>
                            <p className="mt-1 text-sm text-muted-foreground">
                                {profile ? `${profileName(profile)} · ${itemCount} related items` : "Items related to the selected user"}
                            </p>
                        </div>
                        <Button asChild variant="outline">
                            <Link href="/admin/dashboard">Admin dashboard</Link>
                        </Button>
                    </div>

                    {error && (
                        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                            {error}
                        </div>
                    )}

                    {profile && (
                        <section className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
                            <div className="rounded-lg border bg-card p-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    {profile.avatar_url ? (
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
                                        <h2 className="truncate text-sm font-semibold">{profileName(profile)}</h2>
                                        <p className="truncate text-sm text-muted-foreground">{profile.email || "No email"}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="rounded-lg border bg-card p-4">
                                <div className="flex items-center gap-2 text-sm font-medium">
                                    <ShieldAlert className="h-4 w-4 text-muted-foreground" />
                                    Admin-only context
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">Review ownership, visibility, and borrower state before changing items.</p>
                            </div>
                        </section>
                    )}

                    {groups.length === 0 && !error ? (
                        <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                            No related items for this user.
                        </div>
                    ) : (
                        groups.map((group) => (
                            <section key={group.key} className="flex flex-col gap-2">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-sm font-semibold">{group.label}</h2>
                                    <span className="text-xs text-muted-foreground">{group.items.length} records</span>
                                </div>
                                {group.items.map(({ item, relationLabels }) => (
                                    <div key={item.id} className="rounded-lg border bg-card p-4">
                                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                            <div className="flex min-w-0 gap-3">
                                                {item.image_url ? (
                                                    <AppImage
                                                        src={item.image_url}
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
                                                        <StatusBadge value={item.status} />
                                                        <VisibilityBadge value={item.visibility_state} />
                                                        {relationLabels.map((label) => (
                                                            <span key={label} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
                                                                {label}
                                                            </span>
                                                        ))}
                                                    </div>
                                                    <h3 className="mt-2 truncate font-semibold">{item.name}</h3>
                                                    <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.description || "No description"}</p>
                                                    <p className="mt-2 text-xs text-muted-foreground">
                                                        {ownerLabel(item)} · Created {formatDate(item.created_at)}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 sm:max-w-56 sm:justify-end">
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/items/details?id=${item.id}`}>Open item</Link>
                                                </Button>
                                                <Button asChild variant="outline" size="sm">
                                                    <Link href={`/admin/item-versions?itemId=${item.id}`}>
                                                        <History className="h-4 w-4" />
                                                        Versions
                                                    </Link>
                                                </Button>
                                                <Button asChild variant="secondary" size="sm">
                                                    <Link href={`/items/edit?id=${item.id}`}>
                                                        <Edit className="h-4 w-4" />
                                                        Edit
                                                    </Link>
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </section>
                        ))
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function AdminUserItemsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <AdminUserItemsContent />
        </Suspense>
    )
}
