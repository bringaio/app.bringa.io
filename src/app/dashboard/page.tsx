"use client"

import { useCallback, useEffect, useState, useRef } from "react";
import Link from "next/link";

import { supabase } from "@/lib/supabaseclient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ItemListCard } from "@/components/items/item-list-card";
import { User } from "@supabase/supabase-js";
import ProtectedRoute from "@/components/auth/protected-route";
import { RefreshCw } from "lucide-react";
import {
    buildDashboardEmptyMessage,
    buildDashboardInitialViewState,
    buildDashboardItemFilters,
    ITEM_LIST_SELECT,
    type DashboardView,
} from "@/lib/dashboard-item-query";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import { useInfiniteItems } from "@/hooks/useInfiniteItems";

export default function DashboardPage() {
    const [query, setQuery] = useState("")
    const debouncedQuery = useDebouncedValue(query, 250);
    const [user, setUser] = useState<User | null>(null);
    const [view, setView] = useState<DashboardView>("available");
    const [borrowedCount, setBorrowedCount] = useState<number | null>(null);
    const [availableCount, setAvailableCount] = useState<number | null>(null);
    const [hasBorrowedItems, setHasBorrowedItems] = useState(false);
    const [hasNewUpdates, setHasNewUpdates] = useState(false);
    const [ready, setReady] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const sentinelRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startY, setStartY] = useState(0);
    const [scrollTop, setScrollTop] = useState(0);

    // Pull to refresh state
    const [pullDistance, setPullDistance] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const touchStartY = useRef(0);

    const buildItemsQuery = useCallback(({ from, to }: { from: number; to: number }) => {
        let queryBuilder = supabase
            .from('items')
            .select(ITEM_LIST_SELECT)
            .order('name', { ascending: true })
            .order('id', { ascending: true }) // stable tie-break so paging never skips/duplicates
            .range(from, to);
        const filterPlan = buildDashboardItemFilters({
            userId: user?.id ?? null,
            query: debouncedQuery,
            view,
        });
        for (const filter of filterPlan.filters) {
            queryBuilder = filter.method === "eq"
                ? queryBuilder.eq(filter.column, filter.value)
                : queryBuilder.ilike(filter.column, filter.value);
        }
        return queryBuilder;
    }, [user, debouncedQuery, view])

    const {
        items: results,
        hasMore,
        loading,
        loadingMore,
        reset: resetItems,
        loadMore,
        setEmpty: setItemsEmpty,
    } = useInfiniteItems(buildItemsQuery)

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
                    const savedView = sessionStorage.getItem("dashboardView") as DashboardView | null;
                    if (savedView) {
                        setView(savedView);
                    } else {
                        const initialViewState = buildDashboardInitialViewState(count);
                        setView(initialViewState.view);
                    }
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
        if (ready) {
            sessionStorage.setItem("dashboardView", view);
        }
    }, [view, ready]);


    // Load / reload the first page whenever the user, view or debounced search changes.
    useEffect(() => {
        if (!ready) return;
        const filterPlan = buildDashboardItemFilters({
            userId: user?.id ?? null,
            query: debouncedQuery,
            view,
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect -- reset the list and hide the stale "new items" toast when the query inputs change.
        setHasNewUpdates(false);
        // Show the new result set from the top (a short page-0 must not stay mid-scrolled).
        scrollContainerRef.current?.scrollTo({ top: 0 });
        if (filterPlan.empty) setItemsEmpty(); else resetItems();
    }, [ready, user, debouncedQuery, view, resetItems, setItemsEmpty]);

    // Realtime subscription lives in its own effect so it is not torn down and
    // re-created on every keystroke or view change.
    useEffect(() => {
        if (!ready) return;
        const channel = supabase
            .channel('dashboard_items_changes')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'items' },
                () => {
                    // Show the reload toast instead of jarring the user with instant changes
                    setHasNewUpdates(true);
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [ready]);

    // Infinite scroll: load the next page when the sentinel nears the bottom of
    // the custom scroll container. root MUST be the scroll container (not the
    // viewport) or the sentinel never intersects on this overflow-y-auto element.
    useEffect(() => {
        if (loading || !hasMore) return;
        const root = scrollContainerRef.current;
        const sentinel = sentinelRef.current;
        if (!sentinel) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0]?.isIntersecting) loadMore();
            },
            { root, rootMargin: "600px 0px", threshold: 0 },
        );
        observer.observe(sentinel);
        return () => observer.disconnect();
    }, [loading, hasMore, loadMore, results.length]);

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

    const handleTouchStart = (e: React.TouchEvent) => {
        if (scrollContainerRef.current?.scrollTop === 0) {
            touchStartY.current = e.touches[0].clientY;
        } else {
            touchStartY.current = 0;
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStartY.current > 0 && scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0) {
            const pull = e.touches[0].clientY - touchStartY.current;
            if (pull > 0) {
                // Apply friction
                setPullDistance(Math.min(pull * 0.4, 80));
            } else {
                setPullDistance(0);
            }
        }
    };

    const handleTouchEnd = () => {
        if (pullDistance > 60 && !isRefreshing) {
            setIsRefreshing(true);
            setPullDistance(60); // Hold open at 60px
            
            // Trigger refresh
            resetItems().finally(() => {
                if (user) fetchCounts(user);
                setIsRefreshing(false);
                setPullDistance(0);
                setHasNewUpdates(false);
            });
        } else {
            setPullDistance(0);
        }
        touchStartY.current = 0;
    };

    const emptyMessage = buildDashboardEmptyMessage({ query: debouncedQuery, view });

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
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleTouchEnd}
                    className="flex-1 min-h-0 overflow-y-auto pt-6 pb-12 touch-pan-y"
                    style={{ userSelect: isDragging ? 'none' : 'auto' }}
                >
                    {/* Pull to refresh indicator */}
                    <div 
                        className="w-full flex justify-center items-center overflow-hidden transition-all duration-200 ease-out"
                        style={{ height: `${pullDistance}px`, opacity: pullDistance / 60 }}
                    >
                        <RefreshCw 
                            className={`w-5 h-5 text-muted-foreground ${isRefreshing ? 'animate-spin' : ''}`} 
                            style={{ transform: `rotate(${pullDistance * 3}deg)` }} 
                        />
                    </div>

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
                                <div ref={sentinelRef} className="h-px w-full" aria-hidden="true" />
                                {loadingMore && (
                                    <div className="flex justify-center py-4">
                                        <p className="text-sm text-muted-foreground">Loading items...</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {hasNewUpdates && (
                    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
                        <Button 
                            onClick={() => {
                                resetItems();
                                if (user) fetchCounts(user);
                                setHasNewUpdates(false);
                            }}
                            className="rounded-full shadow-2xl bg-foreground text-background hover:bg-foreground/90 font-medium px-6 py-5 flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            New items added, Reload
                        </Button>
                    </div>
                )}
            </div>
        </ProtectedRoute>
    );
}
