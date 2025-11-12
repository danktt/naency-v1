"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

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

export function SignUpForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { isLoaded, signUp } = useSignUp();
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProviderClick = useCallback(
    async (provider: OAuthProvider) => {
      if (!isAuthLoaded || !isLoaded || !signUp) {
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

        await signUp.authenticateWithRedirect({
          strategy: OAUTH_STRATEGY[provider],
          redirectUrl: "/sign-up/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      } catch (error) {
        const clerkError =
          typeof error === "object" && error && "errors" in error
            ? (error as {
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
    [isAuthLoaded, isLoaded, isSignedIn, router, signUp],
  );

  const isButtonDisabled =
    !isAuthLoaded || !isLoaded || pendingProvider !== null;

  return (
    <form className={cn("flex flex-col gap-6", className)} {...props}>
      <FieldGroup>
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-bold">Create your account</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Choose a provider below to get started
          </p>
        </div>
        <Field className="space-y-3">
          <Button
            variant="outline"
            type="button"
            className="gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("google")}
            isLoading={pendingProvider === "google"}
          >
            <GoogleIcon />
            {pendingProvider === "google"
              ? "Redirecting..."
              : "Continue with Google"}
          </Button>
          <Button
            variant="outline"
            type="button"
            className="gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("apple")}
            isLoading={pendingProvider === "apple"}
          >
            <AppleIcon />
            {pendingProvider === "apple"
              ? "Redirecting..."
              : "Continue with Apple"}
          </Button>
        </Field>
        {errorMessage ? (
          <FieldError className="text-center" role="alert">
            {errorMessage}
          </FieldError>
        ) : null}
        <FieldDescription className="text-center">
          Already have an account?{" "}
          <a href="/sign-in" className="underline underline-offset-4">
            Sign in
          </a>
        </FieldDescription>
      </FieldGroup>
    </form>
  );
}
