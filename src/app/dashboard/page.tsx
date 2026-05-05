"use client"

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseclient";
import { ItemDb } from "@/app/model/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemContent, ItemTitle, ItemDescription } from "@/components/items/item-card";
import { User } from "@supabase/supabase-js";
import ProtectedRoute from "@/components/auth/protected-route";
import { Package } from "lucide-react";
import { AppImage } from "@/components/ui/app-image";
import {
    buildDashboardInitialViewState,
    buildDashboardItemFilters,
    buildDashboardViewControlState,
    type DashboardView,
} from "@/lib/dashboard-item-query";

export default function DashboardPage() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<ItemDb[]>([])
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<DashboardView>("available");
    const [hasBorrowedItems, setHasBorrowedItems] = useState(false);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);
    const borrowedControlState = buildDashboardViewControlState({ currentView: view, controlView: "borrowed" });
    const availableControlState = buildDashboardViewControlState({ currentView: view, controlView: "available" });
    const allControlState = buildDashboardViewControlState({ currentView: view, controlView: "all" });

    const fetchItems = useCallback(async (currentUser: User | null, searchQuery: string, selectedView: DashboardView) => {
        try {
            setLoading(true);
            let queryBuilder = supabase.from('items').select('*').order('name', { ascending: true });
            const filterPlan = buildDashboardItemFilters({
                userId: currentUser?.id ?? null,
                query: searchQuery,
                view: selectedView,
            });

            if (filterPlan.empty) {
                setResults([]);
                return;
            }

            for (const filter of filterPlan.filters) {
                queryBuilder = filter.method === "eq"
                    ? queryBuilder.eq(filter.column, filter.value)
                    : queryBuilder.ilike(filter.column, filter.value);
            }

            const { data, error } = await queryBuilder;

            if (error) throw error;
            setResults(data || []);
        } catch (err) {
            console.error('Error fetching items:', err)
        } finally {
            setLoading(false);
        }
    }, [])

    useEffect(() => {
        const loadUserAndInitialView = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
                if (user) {
                    const { count, error } = await supabase
                        .from('items')
                        .select('id', { count: 'exact', head: true })
                        .eq('borrowed_by', user.id);

                    if (error) throw error;

                    const initialViewState = buildDashboardInitialViewState(count);
                    setHasBorrowedItems(initialViewState.hasBorrowedItems);
                    setView(initialViewState.view);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setReady(true);
            }
        };
        loadUserAndInitialView();
    }, [])


    useEffect(() => {
        if (!ready) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- item results are loaded from Supabase after auth/view changes.
        fetchItems(user, query, view);
    }, [fetchItems, query, ready, user, view]);

    const handleMouseDown = (e: React.MouseEvent) => {
        if (!scrollContainerRef.current) return;
        setIsDragging(true);
        setStartY(e.pageY - scrollContainerRef.current.offsetTop);
        setScrollTop(scrollContainerRef.current.scrollTop);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !scrollContainerRef.current) return;
        e.preventDefault();
        const y = e.pageY - scrollContainerRef.current.offsetTop;
        const walk = (y - startY) * 2;
        scrollContainerRef.current.scrollTop = scrollTop - walk;
    };

    const handleMouseUpOrLeave = () => {
        setIsDragging(false);
    };

    const emptyMessage = query
        ? "No items match your search."
        : view === "borrowed"
            ? "You haven't borrowed any items right now."
            : view === "available"
                ? "No items are currently available."
                : "No items found.";

    return (
        <ProtectedRoute>
            <div className="flex flex-col h-screen">
                {loading && (
                    <div className="flex-1 flex items-center justify-center">
                        <p className="text-sm text-muted-foreground">Loading items...</p>
                    </div>
                )}

                {!loading && results.length === 0 && (
                    <div className="flex-1 flex items-center justify-center">
                        <div className="text-center text-muted-foreground flex flex-col items-center gap-2">
                            <p>{emptyMessage}</p>
                        </div>
                    </div>
                )}

                {!loading && results.length > 0 && (
                    <div
                        ref={scrollContainerRef}
                        onMouseDown={handleMouseDown}
                        onMouseMove={handleMouseMove}
                        onMouseUp={handleMouseUpOrLeave}
                        onMouseLeave={handleMouseUpOrLeave}
                        className={`flex-1 min-h-0 overflow-y-auto pt-16 pb-12  touch-pan-y`}
                        style={{ userSelect: isDragging ? 'none' : 'auto' }}
                    >
                        <div className="flex flex-col items-center w-full max-w-2xl mx-auto space-y-2 px-4 pb-32">
                            {results.map((item) => (
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
                                                    loading="lazy"
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
                                        <div className={`px-3 py-1 rounded-full text-xs font-medium ${item.status === 'borrowed'
                                            ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                            : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                                            }`}>
                                            {item.status === 'borrowed' ? 'Borrowed' : 'In Stock'}
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </div>
                )}

                <div className="fixed bottom-4 left-1/2 -translate-x-1/2 w-full max-w-2xl px-4 flex flex-col gap-2 ">
                    {!query && (
                        <div className="grid grid-cols-2 gap-2">
                            {hasBorrowedItems && (
                                <Button
                                    aria-pressed={borrowedControlState.ariaPressed}
                                    variant={borrowedControlState.variant}
                                    onClick={() => setView("borrowed")}
                                    className="w-full shadow-lg cursor-pointer"
                                >
                                    Borrowed
                                </Button>
                            )}
                            <Button
                                aria-pressed={availableControlState.ariaPressed}
                                variant={availableControlState.variant}
                                onClick={() => setView("available")}
                                className="w-full shadow-lg cursor-pointer"
                            >
                                Available
                            </Button>
                            <Button
                                aria-pressed={allControlState.ariaPressed}
                                variant={allControlState.variant}
                                onClick={() => setView("all")}
                                className="w-full shadow-lg cursor-pointer"
                            >
                                All Items
                            </Button>
                            <Button
                                asChild
                                variant="secondary"
                                className="w-full shadow-lg"
                            >
                                <Link href="/items/create">
                                    Create Item
                                </Link>
                            </Button>
                        </div>
                    )}
                    <div className="flex items-center gap-2 bg-card border rounded-xl shadow-lg p-2">
                        <Input
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            type="text"
                            aria-label="Search items"
                            placeholder="Search items..."
                            className="flex-1 border-none focus-visible:ring-0"
                        />
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
