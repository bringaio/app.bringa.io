import React, { useCallback, useEffect } from "react";

import { supabase } from "@/lib/supabaseclient";
import { appConfig } from "@/lib/app-config";
import { buildBrowserOAuthRedirectTo } from "@/lib/auth-redirect";
import { Button } from "@/components/ui/button";

type Props = {
    auto?: boolean;
    redirectTo?: string;
    disabled?: boolean;
    onError?: (error: unknown) => void;
    onSignInStart?: () => void;
};

export default function GoogleSignInButton({
    auto = false,
    redirectTo = appConfig.supabase.authRedirectPath,
    disabled = false,
    onError,
    onSignInStart,
}: Props) {
    const handleSignIn = useCallback(async () => {
        try {
            onSignInStart?.();
            const finalRedirect = buildBrowserOAuthRedirectTo(redirectTo);

            const { error } = await supabase.auth.signInWithOAuth({
                provider: "google",
                options: {
                    redirectTo: finalRedirect,
                },
            });

            if (error) {
                console.error("Error during Google sign-in:", error.message);
                onError?.(error);
            }
        } catch (err) {
            console.error("GoogleSignInButton sign-in error", err);
            onError?.(err);
        }
    }, [onError, onSignInStart, redirectTo]);

    useEffect(() => {
        if (auto) {
            handleSignIn();
        }
    }, [auto, handleSignIn]);

    return (
        <Button onClick={handleSignIn} variant="outline" disabled={disabled}>
            Sign in with Google
        </Button>
    );
}
