"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2, Copy, Check } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import Link from "next/link"
import { buildAdminRouteGate } from "@/lib/admin-route-gate"

export default function AdminInviteCodePage() {
    const router = useRouter()
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [inviteCode, setInviteCode] = useState("")
    const [newCode, setNewCode] = useState("")
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [copied, setCopied] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [success, setSuccess] = useState<string | null>(null)
    const adminGate = buildAdminRouteGate({ adminLoading, isAdmin, contentLoading: loading })

    useEffect(() => {
        if (adminGate.redirectTo) {
            router.push(adminGate.redirectTo)
        }
    }, [adminGate.redirectTo, router])

    useEffect(() => {
        const fetchInviteCode = async () => {
            try {
                const { data, error } = await supabase.rpc('get_my_invite_code')

                if (error) throw error
                if (data) {
                    setInviteCode(data)
                    setNewCode(data)
                }
            } catch {
                setError('Fehler beim Laden des Codes')
            } finally {
                setLoading(false)
            }
        }

        if (isAdmin) {
            fetchInviteCode()
        }
    }, [isAdmin])

    const handleSave = async () => {
        setSaving(true)
        setError(null)
        setSuccess(null)

        try {
            const nextCode = newCode.trim().toUpperCase()
            const { data: updated, error } = await supabase.rpc('set_my_invite_code', {
                invite_code_input: nextCode,
            })

            if (error) throw error
            if (!updated) throw new Error('Invite code update rejected')

            setInviteCode(nextCode)
            setSuccess('Invite code updated successfully!')

            setTimeout(() => setSuccess(null), 3000)
        } catch {
            setError('Fehler beim Aktualisieren des Codes')
        } finally {
            setSaving(false)
        }
    }

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Failed to copy:', err)
        }
    }

    const generateRandomCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed confusing characters
        let code = ''
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length))
        }
        setNewCode(code)
    }

    if (adminGate.showLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!adminGate.render) {
        return null
    }

    return (
        <ProtectedRoute>
            <div className="flex flex-col items-center w-full max-w-2xl mx-auto mt-4 space-y-4 pt-12 px-4 pb-24">
                <div className="w-full mb-4">
                    <Link href="/admin/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
                        ← Back to Admin Dashboard
                    </Link>
                    <h1 className="text-2xl font-bold mt-2">Invite Code Management</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage your invite code for new users
                    </p>
                </div>

                <div className="w-full bg-card rounded-lg shadow-sm border p-6 space-y-6">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200 p-3 rounded-md text-sm">
                            {success}
                        </div>
                    )}

                    <div className="space-y-4">
                        <div>
                            <Label className="text-base font-semibold">Current Invite Code</Label>
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 bg-muted p-4 rounded-lg">
                                    <code className="text-2xl font-mono font-bold tracking-wider">
                                        {inviteCode}
                                    </code>
                                </div>
                                <Button
                                    variant="outline"
                                    size="icon"
                                    onClick={handleCopy}
                                    className="h-14 w-14"
                                >
                                    {copied ? (
                                        <Check className="h-5 w-5 text-green-600" />
                                    ) : (
                                        <Copy className="h-5 w-5" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Share this code with users to grant them access to the app
                            </p>
                        </div>

                        <div className="border-t pt-4">
                            <Label htmlFor="newCode" className="text-base font-semibold">
                                Update Invite Code
                            </Label>
                            <div className="flex items-center gap-2 mt-2">
                                <Input
                                    id="newCode"
                                    value={newCode}
                                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                                    placeholder="Enter new code"
                                    className="text-lg tracking-wider uppercase font-mono"
                                    maxLength={20}
                                />
                                <Button
                                    variant="outline"
                                    onClick={generateRandomCode}
                                >
                                    Generate
                                </Button>
                            </div>
                            <p className="text-xs text-muted-foreground mt-2">
                                Note: Changing the code will not affect users who have already entered it
                            </p>
                        </div>

                        <Button
                            onClick={handleSave}
                            disabled={saving || !newCode.trim() || newCode === inviteCode}
                            className="w-full"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                'Save Changes'
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </ProtectedRoute>
    )
}
