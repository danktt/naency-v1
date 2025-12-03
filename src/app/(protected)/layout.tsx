"use client";
import { DatePicker } from "@/components/DatePicker";
import OnboardingAnimationModal from "@/components/onboarding/OnboardingAnimationModal";
import { AppSidebar } from "@/components/Sidebar";
import { ToggleTheme } from "@/components/ToggleTheme";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";
import type { ReactNode } from "react";

export default function ProtectedLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <SignedIn>
        <SidebarProvider>
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2">
              <div className="flex items-center  px-4 justify-between w-full">
                <div className="flex items-center gap-2">
                  <SidebarTrigger className="-ml-1" />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <DatePicker />
                  <ToggleTheme />
                </div>
              </div>
            </header>
            <div className="p-4 pt-0">{children}</div>
          </SidebarInset>
          <OnboardingAnimationModal />
        </SidebarProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
