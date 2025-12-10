"use client";

import { NavMain } from "@/components/Sidenav/nav-main";
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
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "@clerk/nextjs";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBuildingBank,
  IconCategory,
  IconCreditCard,
  IconHome,
  IconTableFilled,
  IconTransfer,
} from "@tabler/icons-react";
import { Bot, Frame, PieChart } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type * as React from "react";
import { useMemo } from "react";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { user } = useUser();
  const { isMobile, setOpenMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  const navMain = useMemo(() => {
    const routes = [
      {
        title: "Página inicial",
        url: "/dashboard",
        icon: IconHome,
      },
      {
        title: "Receitas",
        url: "/incomes",
        icon: IconArrowDownLeft,
      },
      {
        title: "Despesas",
        url: "/expenses",
        icon: IconArrowUpRight,
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
        title: "Cartões de crédito",
        url: "/credit-cards",
        icon: IconCreditCard,
      },
      {
        title: "Planejamento",
        url: "/provisions",
        icon: PieChart,
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
      // {
      //   title: "Suporte",
      //   url: "/",
      //   icon: LifeBuoy,
      // },
      // {
      //   title: "Sugestões",
      //   url: "/feedback",
      //   icon: Send,
      // },
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
              <Link href="/dashboard" onClick={handleLinkClick}>
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
        {/* <NavProjects projects={projects} /> */}
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
