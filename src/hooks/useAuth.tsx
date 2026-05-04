"use client"

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseclient";
import { User } from "@supabase/supabase-js";

export function useAuth() {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        supabase.auth.getSession().then(res => {
            setUser(res.data.session?.user ?? null);
        })


        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user ?? null);
        })

        return () => {
            listener?.subscription.unsubscribe()
        }
    }, []);

    return { user };
}
