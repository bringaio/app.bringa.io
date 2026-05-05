"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Bell, Eye, Loader2, Radio, TimerOff } from "lucide-react"
import ProtectedRoute from "@/components/auth/protected-route"
import { Button } from "@/components/ui/button"
import { useIsAdmin } from "@/hooks/useIsAdmin"
import { appConfig } from "@/lib/app-config"
import { supabase } from "@/lib/supabaseclient"
import {
    buildAdminNotificationSettings,
    type AdminNotificationEvent,
    type AdminNotificationMute,
    type AdminNotificationSectionKey,
} from "@/lib/admin-notification-settings"

const sectionIcons: Record<AdminNotificationSectionKey, typeof Bell> = {
    telegram: Bell,
    mute: TimerOff,
    dedupe: Radio,
    seen: Eye,
}

function StatusBadge({ value }: { value: string }) {
    const active = value === "Configured"

    return (
        <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${active ? "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-muted text-muted-foreground"}`}>
            {value}
        </span>
    )
}

export default function AdminNotificationsPage() {
    const router = useRouter()
    const { isAdmin, loading: adminLoading } = useIsAdmin()
    const [notificationEvents, setNotificationEvents] = useState<AdminNotificationEvent[] | undefined>(undefined)
    const [notificationMutes, setNotificationMutes] = useState<AdminNotificationMute[] | undefined>(undefined)
    const settings = buildAdminNotificationSettings({
        telegramAdminNotifications: appConfig.features.telegramAdminNotifications,
        notificationEvents,
        notificationMutes,
    })

    useEffect(() => {
        if (!adminLoading && !isAdmin) {
            router.push("/dashboard")
        }
    }, [adminLoading, isAdmin, router])

    useEffect(() => {
        const fetchNotificationState = async () => {
            try {
                const [eventsRes, mutesRes] = await Promise.all([
                    supabase
                        .from("notification_events")
                        .select("status,seen_at")
                        .order("created_at", { ascending: false })
                        .limit(100),
                    supabase
                        .from("notification_mutes")
                        .select("muted_forever,muted_until,revoked_at")
                        .order("created_at", { ascending: false })
                        .limit(100),
                ])

                setNotificationEvents(eventsRes.error ? [] : (eventsRes.data as AdminNotificationEvent[]))
                setNotificationMutes(mutesRes.error ? [] : (mutesRes.data as AdminNotificationMute[]))
            } catch {
                setNotificationEvents([])
                setNotificationMutes([])
            }
        }

        if (isAdmin) {
            fetchNotificationState()
        }
    }, [isAdmin])

    if (adminLoading) {
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
            <div className="flex w-full flex-col gap-5 px-4 pb-24 pt-16 sm:px-6 lg:px-8">
                <div className="mx-auto flex w-full max-w-5xl flex-col gap-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="min-w-0">
                            <Button asChild variant="ghost" size="sm" className="mb-2 w-fit px-0">
                                <Link href="/admin/dashboard">
                                    <ArrowLeft className="h-4 w-4" />
                                    Back to dashboard
                                </Link>
                            </Button>
                            <h1 className="text-2xl font-bold">Notification Settings</h1>
                            <p className="mt-1 text-sm text-muted-foreground">Telegram notification state and safeguards</p>
                        </div>
                    </div>

                    <section className="grid gap-3 sm:grid-cols-2">
                        {settings.sections.map((section) => {
                            const Icon = sectionIcons[section.key]

                            return (
                                <div key={section.key} className="rounded-lg border bg-card p-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex min-w-0 items-center gap-2">
                                            <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                                            <h2 className="truncate text-sm font-semibold">{section.label}</h2>
                                        </div>
                                        <StatusBadge value={section.status} />
                                    </div>
                                    <p className="mt-3 text-sm text-muted-foreground">{section.detail}</p>
                                </div>
                            )
                        })}
                    </section>

                    <section className="rounded-lg border bg-card p-4">
                        <div className="flex items-center gap-2">
                            <TimerOff className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <h2 className="text-sm font-semibold">Mute Durations</h2>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                            {settings.muteWindows.map((window) => (
                                <span key={window} className="rounded-full border bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                                    {window}
                                </span>
                            ))}
                        </div>
                    </section>
                </div>
            </div>
        </ProtectedRoute>
    )
}
