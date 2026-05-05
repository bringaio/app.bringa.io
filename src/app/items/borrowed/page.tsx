"use client"

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseclient";
import { ItemDb } from "@/app/model/model";
import { Loader2 } from "lucide-react";
import ProtectedRoute from "@/components/auth/protected-route";
import { ItemListCard } from "@/components/items/item-list-card";

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
                                <ItemListCard item={item} key={item.id} />
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </ProtectedRoute>
    );
}
