"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";
import { ItemDb } from "@/app/model/model";
import { Loader2, Package } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { useRouter } from "next/navigation";
import { AppImage } from "@/components/ui/app-image";

export default function AdminDashboardPage() {
    const router = useRouter();
    // Extended interface for display
    interface AdminItem extends ItemDb {
        borrowerName?: string;
        borrowedDate?: string;
    }

    const [items, setItems] = useState<AdminItem[]>([]);
    const [loading, setLoading] = useState(true);
    const { isAdmin, loading: adminLoading } = useIsAdmin();

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
            <div className="flex flex-col items-center w-full max-w-2xl mx-auto mt-4 space-y-2 pt-12 px-4 pb-24">
                <div className="w-full mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
                            <p className="text-sm text-muted-foreground mt-1">View all items and their borrowing status</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
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
                </div>

                {items.length === 0 ? (
                    <div className="text-center text-muted-foreground mt-10">
                        <p>No items found in the system.</p>
                    </div>
                ) : (
                    items.map((item) => (
                        <Link href={`/items/details?id=${item.id}`} key={item.id} className="w-full">
                            <div className="w-full border rounded-lg p-4 bg-card shadow-sm hover:shadow-md transition-shadow flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    {item.image_url ? (
                                        <AppImage
                                            src={item.image_url}
                                            alt={item.name}
                                            width={56}
                                            height={56}
                                            sizes="56px"
                                            className="w-14 h-14 rounded-lg object-cover border"
                                        />
                                    ) : (
                                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center border">
                                            <Package className="h-6 w-6 text-muted-foreground" />
                                        </div>
                                    )}
                                    <div>
                                        <h3 className="font-semibold">{item.name}</h3>
                                        <p className="text-sm text-muted-foreground">{item.description || "No description"}</p>

                                        {/* Borrower Info */}
                                        {item.status === 'borrowed' && (
                                            <div className="mt-1 text-xs text-amber-600 dark:text-amber-500 font-medium flex flex-col">
                                                <span>Borrowed by: {item.borrowerName || 'Unknown'}</span>
                                                {item.borrowedDate && (
                                                    <span className="text-muted-foreground opacity-80">
                                                        {new Date(item.borrowedDate).toISOString().split('T')[0]}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'borrowed'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                                    }`}>
                                    {item.status === 'borrowed' ? 'Borrowed' : 'In Stock'}
                                </div>
                            </div>
                        </Link>
                    ))
                )}
            </div>
        </ProtectedRoute>
    );
}
