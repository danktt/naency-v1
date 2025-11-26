"use client";

import { useUser } from "@clerk/nextjs";
import {
  IconBuildingBank,
  IconCategory,
  IconCreditCard,
  IconCurrencyDollar,
  IconLayoutDashboard,
  IconTableFilled,
  IconTransfer,
  IconWallet,
} from "@tabler/icons-react";
import { Bot, Frame, LifeBuoy, PieChart, Send } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useMemo } from "react";
import { NavMain } from "@/components/Sidenav/nav-main";
import { NavProjects } from "@/components/Sidenav/nav-projects";
import { NavSecondary } from "@/components/Sidenav/nav-secondary";
import { NavUser } from "@/components/Sidenav/nav-user";
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
        title: "Home",
        url: "/dashboard",
        icon: IconLayoutDashboard,
      },
      {
        title: "Receitas",
        url: "/incomes",
        icon: IconCurrencyDollar,
      },
      {
        title: "Despesas",
        url: "/expenses",
        icon: IconWallet,
      },
      {
        title: "Transferências",
        url: "/transfers",
        icon: IconTransfer,
      },
      {
        title: "Contas bancárias",
        url: "/bank-accounts",
        icon: IconBuildingBank,
      },
      {
        title: "Provisões",
        url: "/provisions",
        icon: IconCreditCard,
      },
      {
        title: "Categorias",
        url: "/categories",
        icon: IconCategory,
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
        title: "Suporte",
        url: "/",
        icon: LifeBuoy,
      },
      {
        title: "Sugestões",
        url: "/feedback",
        icon: Send,
      },
    ],
    [],
  );

  const projects = useMemo(
    () => [
      {
        name: "Financeiro",
        url: "/dashboard?workspace=design",
        icon: Frame,
      },
      {
        name: "Planejamento",
        url: "/dashboard?workspace=sales",
        icon: PieChart,
      },
      {
        name: "Métricas",
        url: "/dashboard?workspace=product",
        icon: Bot,
      },
    ],
    [],
  );

  return (
    <Sidebar variant="floating" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link href="/dashboard">
                <div className=" flex aspect-square items-center justify-center rounded-lg">
                  <IconTableFilled className="size-8 text-primary" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">Næncy</span>
                  <span className="truncate text-xs">Finance Control</span>
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
