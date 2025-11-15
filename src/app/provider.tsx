"use client";

import { ClerkProvider } from "@clerk/nextjs";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { I18nextProvider } from "react-i18next";
import { i18n } from "@/lib/i18n/client";
import { TRPCProvider } from "@/lib/trpc/provider";

type ProvidersProps = {
  children: ReactNode;
};

export function Providers({ children }: ProvidersProps) {
  return (
    <ClerkProvider
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignInUrl="/dashboard"
      afterSignUpUrl="/dashboard"
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/dashboard"
    >
      <TRPCProvider>
        <I18nextProvider i18n={i18n}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <HeroUIProvider>{children}</HeroUIProvider>
          </ThemeProvider>
        </I18nextProvider>
      </TRPCProvider>
    </ClerkProvider>
  );
}
