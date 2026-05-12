"use client"

import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import Link from "next/link";
import { appConfig } from "@/lib/app-config";
import { buildLoginCopy, buildLoginOAuthGate, normalizeTermsAccepted } from "@/lib/login-terms";
import { buildSetupRequiredCopy, evaluateSetupReadiness } from "@/lib/setup-readiness";

const LoginAuthOptions = dynamic(() => import("@/components/auth/login-auth-options"), {
  ssr: false,
  loading: () => <div className="text-sm text-muted-foreground">Loading sign-in...</div>,
});

function subscribeToOriginStore() {
  return () => {};
}

function getBrowserOriginSnapshot() {
  return window.location.origin;
}

function getServerOriginSnapshot() {
  return null;
}

export default function LoginPage() {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const browserOrigin = useSyncExternalStore(
    subscribeToOriginStore,
    getBrowserOriginSnapshot,
    getServerOriginSnapshot,
  );
  const loginCopy = buildLoginCopy({ termsPath: appConfig.legal.termsPath });
  const oauthGate = buildLoginOAuthGate({ termsAccepted });
  const setupReadiness = evaluateSetupReadiness({
    config: appConfig,
    currentOrigin: browserOrigin,
    nodeEnv: process.env.NODE_ENV,
  });
  const setupCopy = buildSetupRequiredCopy();

  if (setupReadiness.status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="p-6 bg-card rounded-lg shadow max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2">Checking setup</h1>
          <p className="text-sm text-muted-foreground">
            Preparing this deployment before loading sign-in.
          </p>
          <div className="mt-6 text-center">
            <Link href="/docs" className="text-sm text-muted-foreground hover:text-foreground">
              Docs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (setupReadiness.status === "setup-required") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="p-6 bg-card rounded-lg shadow max-w-md w-full">
          <h1 className="text-xl font-semibold mb-2">{setupCopy.title}</h1>
          <p className="text-sm text-muted-foreground leading-6">
            {setupCopy.description}
          </p>
          <ol className="mt-5 list-decimal space-y-2 pl-5 text-sm leading-6">
            {setupCopy.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            <Link
              href={setupCopy.guideHref}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Fork launch guide
            </Link>
            <Link
              href={setupCopy.docsHref}
              className="inline-flex h-10 items-center justify-center rounded-md border px-4 text-sm font-medium hover:bg-accent"
            >
              Docs
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="p-6 bg-card rounded-lg shadow max-w-md w-full">
        <h1 className="text-xl font-semibold mb-4">{loginCopy.title}</h1>

        <div className="mb-4 flex items-start gap-3">
          <Checkbox
            id="terms"
            checked={termsAccepted}
            onCheckedChange={(checked) => setTermsAccepted(normalizeTermsAccepted(checked))}
            className="mt-1"
          />
          <label htmlFor="terms" className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
            {loginCopy.termsLabelPrefix}{" "}
            <Link
              href={loginCopy.termsPath}
              target="_blank"
              className="text-primary hover:underline font-medium"
            >
              {loginCopy.termsLinkLabel}
            </Link>
          </label>
        </div>

        {authError && (
          <div className="mb-4 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive" role="alert">
            {authError}
          </div>
        )}

        <LoginAuthOptions
          oauthDisabled={oauthGate.disabled}
          termsAccepted={termsAccepted}
          onAuthError={setAuthError}
        />
      </div>
    </div>
  );
}
