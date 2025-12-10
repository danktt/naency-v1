"use client";

import { Dock, DockIcon } from "@/components/float-dock";
import { buttonVariants } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconCategory,
  IconDashboard,
  IconPlus,
} from "@tabler/icons-react";
import Link from "next/link";
import type React from "react";

export type IconProps = React.HTMLAttributes<SVGElement>;

const DATA = {
  navbar: [
    { href: "/dashboard", icon: IconDashboard, label: "Página inicial" },
    { href: "/expenses", icon: IconArrowUpRight, label: "Despesas" },
    { href: "#", icon: IconPlus, label: "Adicionar transação" },
    { href: "/incomes", icon: IconArrowDownLeft, label: "Receitas" },
    { href: "/categories", icon: IconCategory, label: "Categorias" },
  ],
};

export function DockMenu() {
  const isMobile = useIsMobile();

  // Não renderiza se não for mobile
  if (!isMobile) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <TooltipProvider>
        <Dock direction="middle">
          {DATA.navbar.map((item) => (
            <DockIcon key={item.label}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    className={cn(
                      buttonVariants({ variant: "ghost", size: "icon" }),
                      "size-12 rounded-full",
                    )}
                  >
                    <item.icon className="size-4" />
                  </Link>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{item.label}</p>
                </TooltipContent>
              </Tooltip>
            </DockIcon>
          ))}

          {/* <Separator orientation="vertical" className="h-full py-2" />
          <DockIcon>
            <Tooltip>
              <TooltipTrigger asChild>
                <ModeToggle />
              </TooltipTrigger>
              <TooltipContent>
                <p>Theme</p>
              </TooltipContent>
            </Tooltip>
          </DockIcon> */}
        </Dock>
      </TooltipProvider>
    </div>
  );
}
