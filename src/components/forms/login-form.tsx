"use client";

import { useAuth, useSignIn } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";
import { useLocalStorage } from "usehooks-ts";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup } from "@/components/ui/field";
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
  const [lastProvider, setLastProvider] = useLocalStorage<OAuthProvider | null>(
    "last-oauth-provider",
    null,
  );

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

        // Salvar provedor no localStorage antes do redirecionamento
        setLastProvider(provider);

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

        // Fallback: pegar mensagem e traduzir se necessário
        const fallbackMessage =
          error instanceof Error
            ? "Algo deu errado. Por favor, tente novamente."
            : "Algo deu errado. Por favor, tente novamente.";

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
          <h1 className="text-2xl font-bold">Entrar na sua conta</h1>
          <p className="text-muted-foreground text-sm text-balance">
            Escolha um provedor abaixo para continuar
          </p>
        </div>
        <Field className="space-y-3">
          <Button
            variant="outline"
            type="button"
            className="relative gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("google")}
            icon={<GoogleIcon />}
            isLoading={pendingProvider === "google"}
          >
            {lastProvider === "google" && !pendingProvider && (
              <LastProviderBadge />
            )}
            Continuar com Google
          </Button>
          <Button
            variant="outline"
            type="button"
            className="relative gap-2"
            disabled={isButtonDisabled}
            onClick={() => handleProviderClick("apple")}
            icon={<AppleIcon />}
            isLoading={pendingProvider === "apple"}
          >
            {lastProvider === "apple" && !pendingProvider && (
              <LastProviderBadge />
            )}
            Continuar com Apple
          </Button>
        </Field>
      </FieldGroup>
    </form>
  );
}

const LastProviderBadge = () => {
  return (
    <Badge className="absolute -right-2 -top-2 px-2 uppercase leading-none">
      Último
    </Badge>
  );
};
