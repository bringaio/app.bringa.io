"use client";

import Link from "next/link";

import GitSignInButton from "@/components/auth/git-signin-button";
import GoogleSignInButton from "@/components/auth/google-signin-button";
import LocalDevEmailLogin from "@/components/auth/local-dev-email-login";
import { Button } from "@/components/ui/button";
import { buildOAuthSignInErrorCopy } from "@/lib/login-terms";
import { localDemoModeEnabled } from "@/lib/supabaseclient";

type LoginAuthOptionsProps = {
  oauthDisabled: boolean;
  termsAccepted: boolean;
  onAuthError: (message: string | null) => void;
};

export default function LoginAuthOptions({
  oauthDisabled,
  termsAccepted,
  onAuthError,
}: LoginAuthOptionsProps) {
  const clearAuthError = () => onAuthError(null);

  return (
    <>
      <div className="flex flex-col gap-2">
        {localDemoModeEnabled && (
          <Button asChild onClick={clearAuthError}>
            <Link href="/dashboard">Open local demo</Link>
          </Button>
        )}
        <GitSignInButton
          disabled={oauthDisabled}
          onSignInStart={clearAuthError}
          onError={() => onAuthError(buildOAuthSignInErrorCopy("GitHub"))}
        />
        <GoogleSignInButton
          disabled={oauthDisabled}
          onSignInStart={clearAuthError}
          onError={() => onAuthError(buildOAuthSignInErrorCopy("Google"))}
        />
      </div>

      <LocalDevEmailLogin termsAccepted={termsAccepted} />

      <div className="mt-6 text-center">
        <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
          Docs
        </Link>
      </div>
    </>
  );
}
