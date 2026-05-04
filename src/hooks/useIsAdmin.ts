"use client"

import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabaseclient"

export function useIsAdmin() {
    const [isAdmin, setIsAdmin] = useState(false)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const checkAdminStatus = async () => {
            try {
                const { data: { user } } = await supabase.auth.getUser()

                if (!user) {
                    setIsAdmin(false)
                    setLoading(false)
                    return
                }

                // Check if user's profile_id exists in admins table
                const { data, error } = await supabase
                    .from('admins')
                    .select('id')
                    .eq('profile_id', user.id)
                    .single()

                if (error) {
                    // If error is "no rows", user is not admin
                    setIsAdmin(false)
                } else {
                    setIsAdmin(!!data)
                }
            } catch {
                // Ignore error to prevent leak
                setIsAdmin(false)
            } finally {
                setLoading(false)
            }
        }

        checkAdminStatus()
    }, [])

    return { isAdmin, loading }
}
