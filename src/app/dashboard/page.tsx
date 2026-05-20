"use client"

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseclient";
import { ItemDb } from "@/app/model/model";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemListCard } from "@/components/items/item-list-card";
import { User } from "@supabase/supabase-js";
import ProtectedRoute from "@/components/auth/protected-route";
import {
    buildDashboardEmptyMessage,
    buildDashboardInitialViewState,
    buildDashboardItemFilters,
    type DashboardView,
} from "@/lib/dashboard-item-query";

export default function DashboardPage() {
    const [query, setQuery] = useState("")
    const [results, setResults] = useState<ItemDb[]>([])
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<DashboardView>("available");
    const [borrowedCount, setBorrowedCount] = useState<number | null>(null);
    const [availableCount, setAvailableCount] = useState<number | null>(null);
    const [hasBorrowedItems, setHasBorrowedItems] = useState(false);
    const [ready, setReady] = useState(false);
    const [loading, setLoading] = useState(true);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

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

    const fetchCounts = useCallback(async (currentUser: User) => {
        const { count } = await supabase
            .from('items')
            .select('id', { count: 'exact', head: true })
            .eq('borrowed_by', currentUser.id);

        const { count: availCount } = await supabase
            .from('items')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'inStock')
            .eq('visibility_state', 'visible');

        setBorrowedCount(count);
        setAvailableCount(availCount);
        if (count !== null) setHasBorrowedItems(count > 0);
        return { count, availCount };
    }, []);

    useEffect(() => {
        const loadUserAndInitialView = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                setUser(user);
                if (user) {
                    const { count } = await fetchCounts(user);
                    const initialViewState = buildDashboardInitialViewState(count);
                    setView(initialViewState.view);
                }
            } catch (err) {
                console.error(err);
            } finally {
                setReady(true);
            }
        };
        loadUserAndInitialView();
    }, [fetchCounts])


    useEffect(() => {
        if (!ready) return;
        // eslint-disable-next-line react-hooks/set-state-in-effect -- item results are loaded from Supabase after auth/view changes.
        fetchItems(user, query, view);
        
        // Setup Supabase Realtime subscription for live reload
        const channel = supabase
            .channel('dashboard_items_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'items' },
                () => {
                    // Refetch list and counts on any change
                    fetchItems(user, query, view);
                    if (user) {
                        fetchCounts(user);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchItems, query, ready, user, view, fetchCounts]);

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

    const emptyMessage = buildDashboardEmptyMessage({ query, view });

    return (
        <ProtectedRoute>
            <div className="flex flex-col h-screen overflow-hidden">
                {/* Fixed Top Section: Tabs and Search */}
                <div className="pt-20 px-4 w-full max-w-2xl mx-auto flex flex-col shrink-0">
                    <div className="flex border-b mb-4">
                        <button
                            onClick={() => setView('borrowed')}
                            disabled={!hasBorrowedItems}
                            className={`pb-3 px-1 mr-6 border-b-2 font-medium flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${view === 'borrowed' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Borrowed {borrowedCount !== null && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground font-semibold">{borrowedCount}</span>}
                        </button>
                        <button
                            onClick={() => setView('available')}
                            className={`pb-3 px-1 mr-6 border-b-2 font-medium flex items-center gap-2 transition-colors ${view === 'available' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            Available {availableCount !== null && <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-foreground font-semibold">{availableCount}</span>}
                        </button>
                        <button
                            onClick={() => setView('all')}
                            className={`pb-3 px-1 border-b-2 font-medium transition-colors ${view === 'all' ? 'border-foreground text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
                        >
                            All items
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                            <Input
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                type="text"
                                aria-label="Search items"
                                placeholder="Search items..."
                                className="w-full pl-9 bg-card"
                            />
                        </div>
                        <Button asChild variant="secondary" className="shrink-0 font-medium">
                            <Link href="/items/create">
                                + Create
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* Scrollable Items List */}
                <div
                    ref={scrollContainerRef}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUpOrLeave}
                    onMouseLeave={handleMouseUpOrLeave}
                    className="flex-1 min-h-0 overflow-y-auto pt-6 pb-12 touch-pan-y"
                    style={{ userSelect: isDragging ? 'none' : 'auto' }}
                >
                    <div className="w-full max-w-2xl mx-auto px-4 pb-32">
                        {loading ? (
                            <div className="flex justify-center py-10">
                                <p className="text-sm text-muted-foreground">Loading items...</p>
                            </div>
                        ) : results.length === 0 ? (
                            <div className="text-center py-10 text-muted-foreground flex flex-col items-center gap-2">
                                <p>{emptyMessage}</p>
                            </div>
                        ) : (
                            <div className="flex flex-col space-y-2">
                                {results.map((item) => (
                                    <ItemListCard item={item} key={item.id} />
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    );
}
