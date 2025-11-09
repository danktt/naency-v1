import { RedirectToSignIn, SignedIn, SignedOut } from "@clerk/nextjs";
import type { ReactNode } from "react";
import { BreadcrumbComponent } from "@/components/Breadcrumb";
import { DatePicker } from "@/components/DatePicker";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import OnboardingAnimationModal from "@/components/onboarding/OnboardingAnimationModal";
import { OnboardingModal } from "@/components/onboarding/OnboardingModal";
import { AppSidebar } from "@/components/Sidebar";
import { ToggleTheme } from "@/components/ToggleTheme";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

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
                  <Separator
                    orientation="vertical"
                    className="mr-2 data-[orientation=vertical]:h-4"
                  />
                  <BreadcrumbComponent />
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <LanguageSwitcher />
                  <DatePicker />
                  <ToggleTheme />
                </div>
              </div>
            </header>
            <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
              {children}
            </div>
          </SidebarInset>
          {/* <OnboardingModal /> */}
          <OnboardingAnimationModal />
        </SidebarProvider>
      </SignedIn>
      <SignedOut>
        <RedirectToSignIn />
      </SignedOut>
    </>
  );
}
