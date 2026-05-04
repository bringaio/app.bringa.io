"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { Loader2 } from "lucide-react"
import TopBar from "@/components/layout/topbar"

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [authenticated, setAuthenticated] = useState(false)
    const [profileValid, setProfileValid] = useState(false)

    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession()

                if (!mounted) return;

                if (!session) {
                    router.replace("/login")
                    return
                }

                // Check if user's profile is valid (has entered invite code) and complete
                const { data: profile, error: profileError } = await supabase
                    .from('profiles')
                    .select('profile_valid, display_name, display_surname')
                    .eq('id', session.user.id)
                    .single()

                if (profileError) {
                    router.replace("/login")
                    return
                }

                if (!profile.profile_valid) {
                    // User hasn't entered invite code yet
                    router.replace("/invite")
                    return
                }

                if (!profile.display_name?.trim() || !profile.display_surname?.trim()) {
                    // User hasn't completed their profile (name/surname)
                    router.replace("/complete-profile")
                    return
                }

                setAuthenticated(true)
                setProfileValid(true)
            } catch {
                if (mounted) router.replace("/login")
            } finally {
                if (mounted) setLoading(false)
            }
        }

        checkAuth()

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (!mounted) return;

            if (event === 'SIGNED_OUT') {
                setAuthenticated(false)
                setProfileValid(false)
                router.replace("/login")
            } else if (session) {
                // Re-check profile validity
                checkAuth()
            }
        })

        return () => {
            mounted = false;
            subscription.unsubscribe()
        }
    }, [router])

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!authenticated || !profileValid) {
        return null // Will redirect
    }

    return (
        <>
            <TopBar />
            {children}
        </>
    )
}
