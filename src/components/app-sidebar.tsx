"use client";

import { useUser } from "@clerk/nextjs";
import { IconTableFilled } from "@tabler/icons-react";
import {
  BookOpen,
  Bot,
  Command,
  Frame,
  LifeBuoy,
  PieChart,
  Send,
  Settings2,
  SquareTerminal,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useMemo } from "react";
import { NavMain } from "@/components/nav-main";
import { NavProjects } from "@/components/nav-projects";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useUser();

  const navMain = useMemo(() => {
    const routes = [
      {
        title: "Dashboard",
        url: "/dashboard",
        icon: SquareTerminal,
      },
      {
        title: "Automations",
        url: "/automations",
        icon: Bot,
      },
      {
        title: "Models",
        url: "/models",
        icon: BookOpen,
      },
      {
        title: "Settings",
        url: "/settings",
        icon: Settings2,
      },
    ];

    return routes.map((route) => ({
      ...route,
      isActive:
        pathname === route.url ||
        (pathname?.startsWith(route.url) && route.url !== "/"),
    }));
  }, [pathname]);

  const navSecondary = useMemo(
    () => [
      {
        title: "Support",
        url: "/help",
        icon: LifeBuoy,
      },
      {
        title: "Feedback",
        url: "/feedback",
        icon: Send,
      },
    ],
    [],
  );

  const projects = useMemo(
    () => [
      {
        name: "Design Engineering",
        url: "/dashboard?workspace=design",
        icon: Frame,
      },
      {
        name: "Sales & Marketing",
        url: "/dashboard?workspace=sales",
        icon: PieChart,
      },
      {
        name: "Product Discovery",
        url: "/dashboard?workspace=product",
        icon: Bot,
      },
    ],
    [],
  );

  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className=" flex aspect-square  items-center justify-center rounded-lg">
                  <IconTableFilled className="size-8 text-primary" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Næncy</span>
                  <span className="truncate text-xs">Control Center</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navMain} />
        <NavProjects projects={projects} />
        <NavSecondary items={navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser
          user={{
            name: user?.fullName ?? user?.username ?? "Team Member",
            email:
              user?.primaryEmailAddress?.emailAddress ??
              user?.emailAddresses?.[0]?.emailAddress ??
              "no-email@placeholder.dev",
            avatar: user?.imageUrl ?? "",
          }}
        />
      </SidebarFooter>
    </Sidebar>
  );
}
