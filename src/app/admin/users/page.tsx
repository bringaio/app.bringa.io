"use client"

import { useEffect, useState } from "react"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { Loader2, Users, ShieldAlert, ShieldCheck } from "lucide-react"
import { Admin, Profile } from "@/app/model/model"

export default function AdminUsersPage() {
    const router = useRouter()
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [profiles, setProfiles] = useState<Profile[]>([])
    const [admins, setAdmins] = useState<Admin[]>([])
    const [loading, setLoading] = useState(true)
    const [processingId, setProcessingId] = useState<string | null>(null)

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push('/dashboard')
        }
    }, [isAdmin, adminLoading, router])

    const fetchData = async () => {
        try {
            setLoading(true)
            const [profilesRes, adminsRes] = await Promise.all([
                supabase.from('profiles').select('*').order('created_at', { ascending: false }),
                supabase.from('admins').select('*')
            ])

            if (profilesRes.error) throw profilesRes.error
            if (adminsRes.error) throw adminsRes.error

            setProfiles(profilesRes.data || [])
            setAdmins(adminsRes.data || [])
        } catch {
            // Error handling removed to prevent leaking information
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isAdmin) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- admin data loads asynchronously after role resolution.
            fetchData()
        }
    }, [isAdmin])

    const handleMakeAdmin = async (profileId: string) => {
        try {
            setProcessingId(profileId)
            const { error } = await supabase
                .from('admins')
                .insert({
                    profile_id: profileId,
                    invite_code: 'default'
                })

            if (error) throw error

            // Refresh data
            await fetchData()
        } catch {
            alert('Failed to make user admin.')
        } finally {
            setProcessingId(null)
        }
    }

    const handleRemoveAdmin = async (profileId: string) => {
        try {
            setProcessingId(profileId)
            const { error } = await supabase
                .from('admins')
                .delete()
                .eq('profile_id', profileId)

            if (error) throw error

            // Refresh data
            await fetchData()
        } catch {
            alert('Failed to remove admin privileges.')
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
            <div className="flex flex-col items-center w-full max-w-2xl mx-auto mt-4 space-y-2 pt-12 px-4 pb-24">
                <div className="w-full mb-6">
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Users className="w-6 h-6" /> Manage Users
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">View all users and promote them to administrators.</p>
                </div>

                <div className="w-full space-y-3">
                    {profiles.map(profile => {
                        const isUserAdmin = admins.some(a => a.profile_id === profile.id)
                        const isProcessing = processingId === profile.id

                        return (
                            <div key={profile.id} className="border rounded-lg p-4 bg-card shadow-sm flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    {profile.avatar_url ? (
                                        <img src={profile.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border" />
                                    ) : (
                                        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center border text-muted-foreground">
                                            <Users className="w-5 h-5" />
                                        </div>
                                    )}
                                    <div className="w-full overflow-hidden">
                                        <h3 className="font-semibold flex items-center gap-2">
                                            {profile.display_name} {profile.display_surname}
                                            {isUserAdmin && (
                                                <span title="Admin" className="text-blue-600 dark:text-blue-400">
                                                    <ShieldCheck className="w-4 h-4" />
                                                </span>
                                            )}
                                        </h3>
                                        <p className="text-sm text-muted-foreground truncate">{profile.email || 'No email'}</p>
                                    </div>
                                </div>

                                <div>
                                    {isUserAdmin ? (
                                        <div className="flex items-center gap-2">
                                            <div className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-full font-medium flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Admin
                                            </div>
                                            <button
                                                onClick={() => handleRemoveAdmin(profile.id)}
                                                disabled={isProcessing}
                                                className="px-3 py-1.5 bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900 border border-red-200 dark:border-red-800 rounded-md text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors whitespace-nowrap"
                                            >
                                                {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Revoke'}
                                            </button>
                                        </div>
                                    ) : (
                                        <button
                                            onClick={() => handleMakeAdmin(profile.id)}
                                            disabled={isProcessing}
                                            className="px-3 py-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 border rounded-md text-xs font-medium flex items-center gap-1 disabled:opacity-50 transition-colors whitespace-nowrap"
                                        >
                                            {isProcessing ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShieldAlert className="w-3 h-3" />}
                                            Make Admin
                                        </button>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </ProtectedRoute>
    )
}
