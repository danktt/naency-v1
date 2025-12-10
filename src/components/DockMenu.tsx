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
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import * as React from "react";

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
  const [isExpanded, setIsExpanded] = React.useState(false);

  // Não renderiza se não for mobile
  if (!isMobile) {
    return null;
  }

  const handleAddTransactionClick = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsExpanded(!isExpanded);
  };

  const handleOptionClick = () => {
    setIsExpanded(false);
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <TooltipProvider>
        <Dock direction="middle">
          {DATA.navbar.map((item) => {
            if (item.href === "#") {
              return (
                <DockIcon key={item.label} className="relative">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={handleAddTransactionClick}
                        aria-label={item.label}
                        className={cn(
                          buttonVariants({ variant: "ghost", size: "icon" }),
                          "size-12 rounded-full relative z-10 transition-transform",
                          isExpanded && "rotate-45",
                        )}
                      >
                        {isExpanded ? (
                          <IconX className="size-4" />
                        ) : (
                          <IconPlus className="size-4" />
                        )}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{item.label}</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Arc buttons */}
                  <AnimatePresence>
                    {isExpanded && (
                      <>
                        {/* Expense option (Right) */}
                        <motion.div
                          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                          animate={{ x: 60, y: -60, opacity: 1, scale: 1 }}
                          exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                            delay: 0.05,
                          }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href="/expenses"
                                onClick={handleOptionClick}
                                aria-label="Adicionar despesa"
                                className={cn(
                                  buttonVariants({
                                    variant: "ghost",
                                    size: "icon",
                                  }),
                                  "size-12 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 hover:bg-rose-500/20 shadow-sm border border-rose-200/20",
                                )}
                              >
                                <IconArrowUpRight className="size-5" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                              <p>Adicionar despesa</p>
                            </TooltipContent>
                          </Tooltip>
                        </motion.div>

                        {/* Income option (Left) */}
                        <motion.div
                          initial={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                          animate={{ x: -60, y: -60, opacity: 1, scale: 1 }}
                          exit={{ x: 0, y: 0, opacity: 0, scale: 0.5 }}
                          transition={{
                            type: "spring",
                            stiffness: 300,
                            damping: 20,
                            delay: 0.05,
                          }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-0"
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href="/incomes"
                                onClick={handleOptionClick}
                                aria-label="Adicionar receita"
                                className={cn(
                                  buttonVariants({
                                    variant: "ghost",
                                    size: "icon",
                                  }),
                                  "size-12 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 shadow-sm border border-emerald-200/20",
                                )}
                              >
                                <IconArrowDownLeft className="size-5" />
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent side="left">
                              <p>Adicionar receita</p>
                            </TooltipContent>
                          </Tooltip>
                        </motion.div>
                      </>
                    )}
                  </AnimatePresence>
                </DockIcon>
              );
            }

            return (
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
            );
          })}
        </Dock>
      </TooltipProvider>
    </div>
  );
}
