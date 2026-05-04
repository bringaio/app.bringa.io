"use client"

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";
import { ItemDb } from "@/app/model/model";
import {
    Bell,
    Clock3,
    Database,
    EyeOff,
    Flag,
    ImageIcon,
    Loader2,
    Package,
    PackageCheck,
    ShieldCheck,
    Sparkles,
    Trash2,
    Users,
} from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/ui/app-image";
import { appConfig } from "@/lib/app-config";

export default function AdminDashboardPage() {
    const router = useRouter();
    // Extended interface for display
    interface AdminItem extends ItemDb {
        borrowerName?: string;
        borrowedDate?: string;
    }

    const [items, setItems] = useState<AdminItem[]>([]);
    const [queueCounts, setQueueCounts] = useState<{
        pendingSuggestions: number | null;
        pendingFlags: number | null;
        openDeletionRequests: number | null;
    }>({
        pendingSuggestions: null,
        pendingFlags: null,
        openDeletionRequests: null,
    });
    const [loading, setLoading] = useState(true);
    const { isAdmin, loading: adminLoading } = useIsAdmin();

    const stats = useMemo(() => {
        const hiddenStates = new Set(["user_hidden", "admin_hidden", "deleted_user_hidden", "archived"]);
        const hidden = items.filter((item) => hiddenStates.has(item.visibility_state || "")).length;
        const pendingVisible = items.filter((item) => item.visibility_state === "pending_visible").length;
        const borrowed = items.filter((item) => item.status === "borrowed").length;
        const available = items.filter((item) => item.status === "inStock" && !hiddenStates.has(item.visibility_state || "")).length;
        const withImages = items.filter((item) => Boolean(item.image_url)).length;

        return {
            total: items.length,
            available,
            borrowed,
            hidden,
            pendingVisible,
            withImages,
        };
    }, [items]);

    const statCards = [
        { label: "Total items", value: stats.total, icon: Package },
        { label: "Available", value: stats.available, icon: PackageCheck },
        { label: "Borrowed", value: stats.borrowed, icon: Users },
        { label: "Hidden", value: stats.hidden, icon: EyeOff },
        { label: "Pending visible", value: stats.pendingVisible, icon: Clock3 },
        { label: "With images", value: stats.withImages, icon: ImageIcon },
        { label: "Suggestions", value: queueCounts.pendingSuggestions ?? "—", icon: Sparkles },
        { label: "Flags", value: queueCounts.pendingFlags ?? "—", icon: Flag },
        { label: "Deletion requests", value: queueCounts.openDeletionRequests ?? "—", icon: Trash2 },
    ];

    const healthItems = [
        {
            label: "Telegram",
            value: appConfig.features.telegramAdminNotifications ? "Configured by deployment" : "Disabled",
            icon: Bell,
        },
        {
            label: "Supabase contract",
            value: "Checked in CI",
            icon: Database,
        },
        {
            label: "Media policy",
            value: `${Math.round(appConfig.media.maxUploadBytes / 1024 / 1024)} MB, ${appConfig.media.acceptedImageMimeTypes.length} types`,
            icon: ShieldCheck,
        },
        {
            label: "Flags",
            value: queueCounts.pendingFlags === null ? "Queue prepared" : `${queueCounts.pendingFlags} pending`,
            icon: Flag,
        },
        {
            label: "Deletion requests",
            value: queueCounts.openDeletionRequests === null ? "Queue prepared" : `${queueCounts.openDeletionRequests} open`,
            icon: Trash2,
        },
    ];

    useEffect(() => {
        // Redirect non-admins
        if (!adminLoading && !isAdmin) {
            router.push('/dashboard');
        }
    }, [isAdmin, adminLoading, router]);

    useEffect(() => {
        const fetchAllItems = async () => {
            try {
                // 1. Fetch all items
                const { data: itemsData, error: itemsError } = await supabase
                    .from('items')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (itemsError) throw itemsError;
                if (!itemsData) return;

                // 2. Identify borrowed items to fetch details for
                const borrowedItems = itemsData.filter(i => i.status === 'borrowed' && i.borrowed_by);
                const borrowedItemIds = borrowedItems.map(i => i.id);
                const borrowerIds = borrowedItems.map(i => i.borrowed_by).filter((id): id is string => !!id);

                let enrichedItems: AdminItem[] = [...itemsData];

                if (borrowedItems.length > 0) {
                    // 3. Fetch borrower profiles
                    const { data: profiles } = await supabase
                        .from('profiles')
                        .select('id, display_name, display_surname')
                        .in('id', borrowerIds);

                    // 4. Fetch active borrow history to get dates
                    // We look for history entries for these items that haven't been returned
                    const { data: history } = await supabase
                        .from('borrow_history')
                        .select('item_id, borrowed_at')
                        .in('item_id', borrowedItemIds)
                        .is('returned_at', null);

                    // 5. Merge data
                    enrichedItems = itemsData.map(item => {
                        if (item.status !== 'borrowed' || !item.borrowed_by) return item;

                        const profile = profiles?.find(p => p.id === item.borrowed_by);
                        const hist = history?.find(h => h.item_id === item.id);

                        return {
                            ...item,
                            borrowerName: profile
                                ? `${profile.display_name || ''} ${profile.display_surname || ''}`.trim()
                                : 'Unknown User',
                            borrowedDate: hist?.borrowed_at
                        };
                    });
                }

                // 6. Sort: Borrowed first, then by date (optional), or just keep created_at within groups
                // The user requested: "On the top there are the borrowed items and then the not borrowed ones."
                enrichedItems.sort((a, b) => {
                    const aBorrowed = a.status === 'borrowed';
                    const bBorrowed = b.status === 'borrowed';
                    if (aBorrowed && !bBorrowed) return -1;
                    if (!aBorrowed && bBorrowed) return 1;
                    return 0; // Maintain existing sort (created_at desc) within groups
                });

                setItems(enrichedItems);
            } catch (err) {
                console.error('Error fetching items:', err);
            } finally {
                setLoading(false);
            }
        };

        if (isAdmin) {
            fetchAllItems();
        }
    }, [isAdmin]);

    useEffect(() => {
        const fetchQueueCounts = async () => {
            try {
                const [suggestionsRes, flagsRes, deletionRequestsRes] = await Promise.all([
                    supabase.from("item_suggestions").select("id,status"),
                    supabase.from("item_flags").select("id,status"),
                    supabase.from("account_deletion_requests").select("id,status"),
                ]);

                setQueueCounts({
                    pendingSuggestions: suggestionsRes.error
                        ? null
                        : (suggestionsRes.data || []).filter((row) => row.status === "pending").length,
                    pendingFlags: flagsRes.error
                        ? null
                        : (flagsRes.data || []).filter((row) => row.status === "pending").length,
                    openDeletionRequests: deletionRequestsRes.error
                        ? null
                        : (deletionRequestsRes.data || []).filter((row) => row.status === "pending" || row.status === "reviewing").length,
                });
            } catch {
                setQueueCounts({ pendingSuggestions: null, pendingFlags: null, openDeletionRequests: null });
            }
        };

        if (isAdmin) {
            fetchQueueCounts();
        }
    }, [isAdmin]);

    if (adminLoading || loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!isAdmin) {
        return null; // Will redirect
    }

    return (
        <ProtectedRoute>
            <div className="flex w-full flex-col gap-5 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-6xl flex-col gap-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                            <p className="text-sm text-muted-foreground mt-1">Items, queues, and system readiness</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <Link href="/admin/moderation">
                                <button className="inline-flex items-center gap-2 rounded-md bg-secondary px-4 py-2 text-sm font-medium text-secondary-foreground shadow transition-colors hover:bg-secondary/80">
                                    <Flag className="h-4 w-4" />
                                    Moderation Queue
                                </button>
                            </Link>
                            <Link href="/admin/deletion-requests">
                                <button className="inline-flex items-center gap-2 rounded-md border bg-card px-4 py-2 text-sm font-medium shadow transition-colors hover:bg-accent">
                                    <Trash2 className="h-4 w-4" />
                                    Deletion Requests
                                </button>
                            </Link>
                            <Link href="/admin/users">
                                <button className="px-4 py-2 rounded-md bg-orange-600 text-white shadow hover:bg-orange-700 transition-colors text-sm font-medium">
                                    Manage Users
                                </button>
                            </Link>
                            <Link href="/admin/invite-code">
                                <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium">
                                    Manage Invite Code
                                </button>
                            </Link>
                        </div>
                    </div>

                    <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        {statCards.map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-lg border bg-card p-3">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-xs font-medium text-muted-foreground">{label}</span>
                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                </div>
                                <p className="mt-2 text-2xl font-semibold tabular-nums">{value}</p>
                            </div>
                        ))}
                    </section>

                    <section className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        {healthItems.map(({ label, value, icon: Icon }) => (
                            <div key={label} className="rounded-lg border bg-card p-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                    <span className="text-sm font-medium">{label}</span>
                                </div>
                                <p className="mt-2 text-sm text-muted-foreground">{value}</p>
                            </div>
                        ))}
                    </section>

                    <section className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <h2 className="text-sm font-semibold">Items</h2>
                            <span className="text-xs text-muted-foreground">{items.length} records</span>
                        </div>

                        {items.length === 0 ? (
                            <div className="rounded-lg border bg-card p-8 text-center text-sm text-muted-foreground">
                                No items found in the system.
                            </div>
                        ) : (
                            items.map((item) => (
                                <Link href={`/items/details?id=${item.id}`} key={item.id} className="w-full">
                                    <div className="flex w-full items-center justify-between gap-3 rounded-lg border bg-card p-4 transition-colors hover:bg-accent">
                                        <div className="flex min-w-0 items-center gap-4">
                                            {item.image_url ? (
                                                <AppImage
                                                    src={item.image_url}
                                                    alt={item.name}
                                                    width={56}
                                                    height={56}
                                                    sizes="56px"
                                                    className="h-14 w-14 shrink-0 rounded-lg border object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg border bg-muted">
                                                    <Package className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                            )}
                                            <div className="min-w-0">
                                                <h3 className="truncate font-semibold">{item.name}</h3>
                                                <p className="truncate text-sm text-muted-foreground">{item.description || "No description"}</p>

                                                {item.status === 'borrowed' && (
                                                    <div className="mt-1 flex flex-col text-xs font-medium text-amber-600 dark:text-amber-500">
                                                        <span className="truncate">Borrowed by: {item.borrowerName || 'Unknown'}</span>
                                                        {item.borrowedDate && (
                                                            <span className="text-muted-foreground opacity-80">
                                                                {new Date(item.borrowedDate).toISOString().split('T')[0]}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            <div className={`rounded-full px-3 py-1 text-xs font-medium ${item.status === 'borrowed'
                                                ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                                : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                                                }`}>
                                                {item.status === 'borrowed' ? 'Borrowed' : 'In Stock'}
                                            </div>
                                            {item.visibility_state && item.visibility_state !== "visible" && (
                                                <div className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                                    {item.visibility_state.replaceAll("_", " ")}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </Link>
                            ))
                        )}
                    </section>
                </div>
            </div>
        </ProtectedRoute>
    );
}
