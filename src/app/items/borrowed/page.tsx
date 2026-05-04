"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";
import { ItemDb } from "@/app/model/model";
import { Loader2, Package } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { ItemContent, ItemTitle, ItemDescription } from "@/components/items/item-card";
import { AppImage } from "@/components/ui/app-image";

export default function BorrowedItemsPage() {
    const [items, setItems] = useState<ItemDb[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBorrowedItems = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('items')
                    .select('*')
                    .eq('borrowed_by', user.id)
                    .eq('status', 'borrowed')
                    .order('created_at', { ascending: false });

                if (error) throw error;
                setItems(data || []);
            } catch (err) {
                console.error('Error fetching borrowed items:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchBorrowedItems();
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background pt-16 px-4 pb-20">
                <div className="max-w-2xl mx-auto">
                    <h1 className="text-2xl font-bold mb-6">Borrowed Items</h1>

                    {items.length === 0 ? (
                        <div className="text-center text-muted-foreground mt-10">
                            <p>You have not borrowed any items currently.</p>
                            <Link href="/dashboard" className="text-primary hover:underline mt-2 inline-block">
                                Browse items to borrow
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {items.map((item) => (
                                <Link href={`/items/details?id=${item.id}`} key={item.id} className="block">
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
                                            <ItemContent>
                                                <ItemTitle>{item.name}</ItemTitle>
                                                <ItemDescription>{item.description || "No description"}</ItemDescription>
                                            </ItemContent>
                                        </div>
                                        <div className="px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200">
                                            Borrowed
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
