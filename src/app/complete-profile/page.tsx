"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function CompleteProfilePage() {
    const router = useRouter()
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [userId, setUserId] = useState<string | null>(null)

    // Form state
    const [name, setName] = useState("")
    const [surname, setSurname] = useState("")
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession()
            if (!session) {
                router.replace("/login")
                return
            }
            setUserId(session.user.id)

            // Fetch current profile to prefill
            const { data: profile } = await supabase
                .from('profiles')
                .select('display_name, display_surname')
                .eq('id', session.user.id)
                .single()

            if (profile) {
                if (profile.display_name) setName(profile.display_name)
                if (profile.display_surname) setSurname(profile.display_surname)
            }

            setLoading(false)
        }
        checkAuth()
    }, [router])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!userId) return

        // Basic validation
        if (!name.trim() || !surname.trim()) {
            setError("Bitte füllen Sie beide Felder aus.")
            return
        }

        setSaving(true)
        setError(null)

        try {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({
                    display_name: name.trim(),
                    display_surname: surname.trim()
                })
                .eq('id', userId)

            if (updateError) throw updateError

            // Redirect to dashboard or where they were going
            router.push("/dashboard")
        } catch (err: unknown) {
            console.error("Error updating profile:", err)
            setError(err instanceof Error ? err.message : "Something went wrong")
        } finally {
            setSaving(false)
        }
    }

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <Card className="w-full max-w-md">
                <CardHeader>
                    <CardTitle>Profil vervollständigen</CardTitle>
                    <CardDescription>
                        Bitte geben Sie Ihren Vor- und Nachnamen ein, um fortzufahren.
                    </CardDescription>
                </CardHeader>
                <form onSubmit={handleSubmit}>
                    <CardContent className="space-y-4">
                        {error && (
                            <div className="text-sm text-destructive font-medium p-2 bg-destructive/10 rounded">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="name">Vorname</Label>
                            <Input
                                id="name"
                                placeholder="Max"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="surname">Nachname</Label>
                            <Input
                                id="surname"
                                placeholder="Mustermann"
                                value={surname}
                                onChange={(e) => setSurname(e.target.value)}
                                required
                            />
                        </div>
                    </CardContent>
                    <CardFooter>
                        <Button type="submit" className="w-full" disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Speichern & Fortfahren
                        </Button>
                    </CardFooter>
                </form>
            </Card>
        </div>
    )
}
