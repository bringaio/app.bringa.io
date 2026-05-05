"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabaseclient"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { appConfig } from "@/lib/app-config"
import {
    buildInviteCodeInput,
    buildInviteErrorMessage,
    buildInviteIntroCopy,
    buildInviteSubmitState,
} from "@/lib/invite-flow"

export default function InviteCodePage() {
    const router = useRouter()
    const [code, setCode] = useState("")
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const inviteIntro = buildInviteIntroCopy({
        appName: appConfig.app.name,
        allowSignupWithoutInvite: appConfig.invites.allowSignupWithoutInvite,
    })
    const submitState = buildInviteSubmitState({ code, loading })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) {
                router.push('/login')
                return
            }

            const inviteCode = buildInviteCodeInput(code)
            const { data: inviteAccepted, error: inviteError } = await supabase
                .rpc('verify_and_apply_invite', {
                    invite_code_input: inviteCode,
                })

            if (inviteError) {
                throw inviteError
            }

            if (!inviteAccepted) {
                setError(buildInviteErrorMessage("invalidCode"))
                setLoading(false)
                return
            }

            // Redirect to dashboard
            router.push('/dashboard')
            router.refresh()
        } catch {
            setError(buildInviteErrorMessage("unexpected"))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4">
            <div className="w-full max-w-md bg-card rounded-lg shadow-sm border p-8">
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-bold mb-2">{inviteIntro.title}</h1>
                    <p className="text-sm text-muted-foreground">
                        {inviteIntro.description}
                    </p>
                </div>

                {error && (
                    <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4 text-sm" role="alert">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="code">Invite Code</Label>
                        <Input
                            id="code"
                            type="text"
                            placeholder="Enter your invite code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            required
                            className="text-center text-lg tracking-wider"
                            autoFocus
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={submitState.disabled} aria-busy={submitState.busy}>
                        {submitState.busy ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                {submitState.label}
                            </>
                        ) : (
                            submitState.label
                        )}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <button
                        onClick={async () => {
                            await supabase.auth.signOut()
                            router.push('/login')
                        }}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </div>
    )
}
