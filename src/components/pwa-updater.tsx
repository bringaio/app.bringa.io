"use client";

import { useEffect, useRef } from "react";

export function PwaUpdater() {
    const initialETag = useRef<string | null>(null);

    useEffect(() => {
        // Function to check if the HTML file on the server has changed (new deployment)
        const checkUpdate = async () => {
            try {
                // Fetch the headers of the current page with cache-busting
                const res = await fetch(window.location.href, {
                    method: "HEAD",
                    cache: "no-store",
                    headers: {
                        'Pragma': 'no-cache',
                        'Cache-Control': 'no-cache'
                    }
                });

                const currentETag = res.headers.get("ETag");
                const currentLastModified = res.headers.get("Last-Modified");

                // We use a combination of ETag and Last-Modified to be safe
                const versionIdentifier = currentETag || currentLastModified;

                if (!versionIdentifier) return;

                if (!initialETag.current) {
                    // First check, just store it
                    initialETag.current = versionIdentifier;
                } else if (initialETag.current !== versionIdentifier) {
                    console.log("New app version detected, reloading...");
                    // Hard reload to fetch new assets
                    window.location.reload();
                }
            } catch {
                // Ignore errors (e.g. offline)
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "visible") {
                checkUpdate();
            }
        };

        // Check when the app comes back to the foreground
        document.addEventListener("visibilitychange", handleVisibilityChange);

        // Also check periodically (every 10 minutes)
        const interval = setInterval(checkUpdate, 10 * 60 * 1000);

        // Initial check on load
        checkUpdate();

        return () => {
            clearInterval(interval);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
        };
    }, []);

    return null;
}
