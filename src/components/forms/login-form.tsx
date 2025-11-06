"use client";

import { useSignIn } from "@clerk/nextjs";
import { Loader2 } from "lucide-react";
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

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"form">) {
  const { isLoaded, signIn } = useSignIn();
  const [pendingProvider, setPendingProvider] = useState<OAuthProvider | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleProviderClick = useCallback(
    async (provider: OAuthProvider) => {
      if (!isLoaded || !signIn) {
        return;
      }

      try {
        setErrorMessage(null);
        setPendingProvider(provider);

        await signIn.authenticateWithRedirect({
          strategy: OAUTH_STRATEGY[provider],
          redirectUrl: "/sign-in/sso-callback",
          redirectUrlComplete: "/dashboard",
        });
      } catch (error) {
        console.error("Failed to authenticate with Clerk", error);

        const clerkError =
          typeof error === "object" && error && "errors" in error
            ? // ClerkError JSON response shape
              (error as {
                errors?: Array<{ message?: string; longMessage?: string }>;
              })
            : null;

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
    [isLoaded, signIn],
  );

  const isButtonDisabled = !isLoaded || pendingProvider !== null;

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
            className="gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("google")}
          >
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
            className="gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("apple")}
          >
            {pendingProvider === "apple" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                Redirecting...
              </>
            ) : (
              <>
                <AppleIcon />
                Continue with Apple
              </>
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
