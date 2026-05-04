"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useEffect, useState } from "react"
import { Toggle } from "@/components/ui/toggle"

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)

    // Avoid hydration mismatch
    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect -- mounted state prevents theme hydration mismatch.
        setMounted(true)
    }, [])

    if (!mounted) {
        return (
            <Toggle variant="outline" size="default" className="w-9 h-9">
                <Sun className="h-[1.2rem] w-[1.2rem]" />
            </Toggle>
        )
    }

    return (
        <Toggle
            variant="outline"
            size="default"
            pressed={theme === "dark"}
            onPressedChange={(pressed) => setTheme(pressed ? "dark" : "light")}
            className="w-9 h-9 border-none"
        >
            {theme === "dark" ? (
                <Moon className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
            ) : (
                <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
            )}
            <span className="sr-only">Toggle theme</span>
        </Toggle>
    )
}
