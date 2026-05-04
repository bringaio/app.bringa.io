"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { ItemDb, BorrowHistoryWithProfile } from "@/app/model/model"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"
import Link from "next/link"
import { User } from "@supabase/supabase-js"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { AppImage } from "@/components/ui/app-image"

function ItemDetailsContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const id = searchParams.get('id')

    const [item, setItem] = useState<ItemDb | null>(null)
    const [loading, setLoading] = useState(true)
    const [actionLoading, setActionLoading] = useState(false)
    const [user, setUser] = useState<User | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [borrowHistory, setBorrowHistory] = useState<BorrowHistoryWithProfile[]>([])
    const { isAdmin } = useIsAdmin()

    useEffect(() => {
        const loadData = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()
                setUser(user)

                if (!id) {
                    setError("No item ID provided")
                    setLoading(false)
                    return
                }

                const { data, error } = await supabase
                    .from('items')
                    .select('*')
                    .eq('id', id)
                    .single()

                if (error) throw error
                setItem(data)

                // If admin, fetch last 3 borrow history records
                if (user) {
                    const { data: adminCheck } = await supabase
                        .from('admins')
                        .select('id')
                        .eq('profile_id', user.id)
                        .single()

                    if (adminCheck) {
                        const { data: historyData, error: historyError } = await supabase
                            .from('borrow_history')
                            .select(`
                                *,
                                borrower:profiles!borrow_history_borrower_id_fkey(*)
                            `)
                            .eq('item_id', id)
                            .order('borrowed_at', { ascending: false })
                            .limit(3)

                        if (!historyError && historyData) {
                            setBorrowHistory(historyData as BorrowHistoryWithProfile[])
                        }
                    }
                }
            } catch {
                setError("Ein Fehler ist aufgetreten. Bitte versuche es später erneut.")
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [id])

    const handleBorrow = async () => {
        if (!user || !item) return
        setActionLoading(true)
        try {
            // Update item status
            const { error } = await supabase
                .from('items')
                .update({
                    status: 'borrowed',
                    borrowed_by: user.id
                })
                .eq('id', item.id)

            if (error) throw error

            // Insert into borrow_history
            const { error: historyError } = await supabase
                .from('borrow_history')
                .insert({
                    item_id: item.id,
                    borrower_id: user.id,
                    borrowed_at: new Date().toISOString()
                })

            if (historyError) {
                console.error('Failed to log borrow history:', historyError)
            }

            // Refresh item data
            setItem({ ...item, status: 'borrowed', borrowed_by: user.id })
            router.refresh()
        } catch {
            alert('Aktion fehlgeschlagen. Bitte versuche es erneut.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleReturn = async () => {
        if (!user || !item) return
        setActionLoading(true)
        try {
            // Update item status
            const { error } = await supabase
                .from('items')
                .update({
                    status: 'inStock',
                    borrowed_by: null
                })
                .eq('id', item.id)

            if (error) throw error

            // Update borrow_history with return timestamp
            const { error: historyError } = await supabase
                .from('borrow_history')
                .update({ returned_at: new Date().toISOString() })
                .eq('item_id', item.id)
                .eq('borrower_id', user.id)
                .is('returned_at', null)

            if (historyError) {
                console.error('Failed to update borrow history:', historyError)
            }

            // Refresh item data
            setItem({ ...item, status: 'inStock', borrowed_by: null })
            router.refresh()
        } catch {
            alert('Aktion fehlgeschlagen. Bitte versuche es erneut.')
        } finally {
            setActionLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!item) return;
        if (!confirm("Are you sure you want to delete this item? This action cannot be undone.")) return;

        setActionLoading(true)
        try {
            const { error } = await supabase
                .from('items')
                .delete()
                .eq('id', item.id)

            if (error) throw error

            router.push('/dashboard')
            router.refresh()
        } catch {
            alert("Fehler beim Löschen des Eintrags.")
            setActionLoading(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error || !item) {
        return (
            <div className="min-h-screen p-4 flex flex-col items-center justify-center text-center">
                <p className="text-red-500 mb-4">{error || "Item not found"}</p>
                <Link href="/">
                    <Button variant="outline">Go Back</Button>
                </Link>
            </div>
        )
    }

    const isBorrowedByMe = item.borrowed_by === user?.id;
    const isAvailable = item.status === 'inStock';

    return (
        <ProtectedRoute>
            <div className="min-h-screen bg-background pb-20">
                <div className="max-w-2xl mx-auto px-4 pt-20 relative z-10">
                    <div className="bg-card rounded-xl shadow-sm border p-6 space-y-4">
                        {item.image_url ? (
                            <AppImage
                                src={item.image_url}
                                alt={item.name}
                                width={1200}
                                height={800}
                                sizes="(max-width: 768px) 100vw, 672px"
                                loading="lazy"
                                className="w-full h-full object-cover rounded-xl rounded-b-none"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                                No Image
                            </div>
                        )}
                        <div className="flex justify-between items-start">
                            <div>
                                <h1 className="text-2xl font-bold">{item.name}</h1>
                                <span className={`inline-block mt-2 px-3 py-1 rounded-full text-xs font-medium ${item.status === 'borrowed'
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
                                    : 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
                                    }`}>
                                    {item.status === 'borrowed' ? 'Borrowed' : 'In Stock'}
                                </span>
                            </div>
                        </div>

                        <div className="prose prose-sm text-muted-foreground">
                            <h3 className="text-sm font-semibold uppercase tracking-wider">Description</h3>
                            <p>{item.description || "No description provided."}</p>
                        </div>

                        {/* Admin View: Last 3 Borrowers */}
                        {isAdmin && borrowHistory.length > 0 && (
                            <div className="pt-4 border-t">
                                <h3 className="text-sm font-semibold uppercase tracking-wider mb-3">Last 3 Borrowers</h3>
                                <div className="space-y-3">
                                    {borrowHistory.map((history) => (
                                        <div key={history.id} className="bg-muted rounded-lg p-3 text-sm">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <p className="font-medium">
                                                        {history.borrower
                                                            ? `${history.borrower.display_name ?? ''} ${history.borrower.display_surname ?? ''}`.trim()
                                                            : 'Unknown User'}

                                                    </p>
                                                    <p className="text-muted-foreground text-xs">{history.borrower.email}</p>
                                                </div>
                                            </div>
                                            <div className="mt-2 text-xs text-muted-foreground">
                                                <p>
                                                    <span className="font-medium">Borrowed:</span>{' '}
                                                    {new Date(history.borrowed_at).toLocaleDateString('en-US', {
                                                        year: 'numeric',
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    })}
                                                </p>
                                                {history.returned_at ? (
                                                    <p>
                                                        <span className="font-medium">Returned:</span>{' '}
                                                        {new Date(history.returned_at).toLocaleDateString('en-US', {
                                                            year: 'numeric',
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                ) : (
                                                    <p className="text-orange-600 font-medium">Currently borrowed</p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 border-t">
                            {isAvailable && (
                                <Button
                                    className="w-full"
                                    size="lg"
                                    onClick={handleBorrow}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Borrow Item"}
                                </Button>
                            )}

                            {isBorrowedByMe && (
                                <Button
                                    className="w-full"
                                    variant="outline"
                                    size="lg"
                                    onClick={handleReturn}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Return Item"}
                                </Button>
                            )}

                            {!isAvailable && !isBorrowedByMe && (
                                <Button className="w-full" variant="secondary" disabled>
                                    Currently Borrowed
                                </Button>
                            )}


                            {user && item.created_by === user.id && (
                                <Link href={`/items/edit?id=${item.id}`}>
                                    <Button
                                        className="w-full mt-4"
                                        variant="outline"
                                    >
                                        Edit Item
                                    </Button>
                                </Link>
                            )}

                            {(isAdmin || (user && item.created_by === user.id)) && (
                                <Button
                                    className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white"
                                    variant="destructive"
                                    onClick={handleDelete}
                                    disabled={actionLoading}
                                >
                                    {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Delete Item"}
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}

export default function ItemDetailsPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <ItemDetailsContent />
        </Suspense>
    )
}
