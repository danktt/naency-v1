"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
} from "@/components/ui/field";
import { cn } from "@/lib/utils";
import { AppleIcon, GoogleIcon } from "../Icon";

type OAuthProvider = "google" | "apple";

const OAUTH_STRATEGY = {
  google: "oauth_google",
  apple: "oauth_apple",
} as const;

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { isLoaded, signIn } = useSignIn();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastProvider, setLastProvider] = useState<OAuthProvider | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const storedProvider = window.localStorage.getItem("last-oauth-provider");

    if (storedProvider === "google" || storedProvider === "apple") {
      setLastProvider(storedProvider);
    }
  }, []);

  const handleProviderClick = useCallback(
    async (provider: OAuthProvider) => {
      if (!isAuthLoaded || !isLoaded || !signIn) {
        return;
      }

      if (isSignedIn) {
        setPendingProvider(null);
        router.replace("/dashboard");
        return;
      }

      try {
        setErrorMessage(null);
        setPendingProvider(provider);
        setLastProvider(provider);

        if (typeof window !== "undefined") {
          window.localStorage.setItem("last-oauth-provider", provider);
        }

        await signIn.authenticateWithRedirect({
          strategy: OAUTH_STRATEGY[provider],
          redirectUrl: "/sign-in/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      } catch (error) {
        const clerkError =
          typeof error === "object" && error && "errors" in error
            ? // ClerkError JSON response shape
              (error as {
                errors?: Array<{
                  message?: string;
                  longMessage?: string;
                  code?: string;
                }>;
              })
            : null;

        const hasExistingSession = clerkError?.errors?.some(
          (currentError) => currentError?.code === "session_exists",
        );

        if (hasExistingSession) {
          setPendingProvider(null);
          router.replace("/dashboard");
          return;
        }

        const fallbackMessage =
          error instanceof Error
            ? error.message
            : "Something went wrong. Please try again.";

        setErrorMessage(
          clerkError?.errors?.[0]?.longMessage ??
            clerkError?.errors?.[0]?.message ??
            fallbackMessage,
        );
        setPendingProvider(null);
      }
    },
    [isAuthLoaded, isLoaded, isSignedIn, router, signIn],
  );

  const isButtonDisabled =
    !isAuthLoaded || !isLoaded || pendingProvider !== null;

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Login to your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Choose a provider below to continue
          </p>
        </div>
        <Field className="space-y-3">
          <Button
            variant="outline"
            type="button"
            className="relative gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("google")}
          >
            {lastProvider === "google" && (
              <LastProviderBadge provider="google" />
            )}
            {pendingProvider === "google" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Redirecting...
              </>
            ) : (
              <>
                <GoogleIcon />
                Continue with Google
              </>
            )}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="relative gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("apple")}
          >
            {lastProvider === "apple" && <LastProviderBadge provider="apple" />}
            {pendingProvider === "apple" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Redirecting...
              </>
            ) : (
              <div className="flex items-center gap-2">
                <AppleIcon />
                Continue with Apple
              </div>
            )}
          </Button>
        </Field>
        {errorMessage ? (
          <FieldError className="text-center" role="alert">
            {errorMessage}
          </FieldError>
        ) : null}
        <FieldDescription className="text-center">
          Don&apos;t have an account?{" "}
          <a href="/sign-up" className="underline underline-offset-4">
            Sign up
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}

const LastProviderBadge = ({ provider }: { provider: OAuthProvider }) => {
  return (
    <Badge className="absolute -right-2 -top-2 px-2 uppercase leading-none">
      Last
    </Badge>
  );
};
