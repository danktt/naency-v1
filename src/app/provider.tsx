"use client";

import { TRPCProvider } from "@/lib/trpc/provider";
import { ClerkProvider } from "@clerk/nextjs";
import { HeroUIProvider } from "@heroui/react";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";

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
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <HeroUIProvider>
            <NuqsAdapter>{children}</NuqsAdapter>
          </HeroUIProvider>
        </ThemeProvider>
      </TRPCProvider>
    </ClerkProvider>
  );
}
