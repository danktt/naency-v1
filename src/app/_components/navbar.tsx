"use client";
import { DynamicIcon } from "@/components/DynamicIcon";
import { Button } from "@heroui/button";
import { IconTableFilled } from "@tabler/icons-react";
import Link from "next/link";
import React from "react";
import { siteConfig } from "./items";
import {
  MobileNav,
  MobileNavHeader,
  MobileNavMenu,
  MobileNavToggle,
  NavbarButton,
  NavBody,
  NavItems,
  Navbar as RNavbar,
} from "./resizable-navbar";

interface NavbarProps {
  isAuthenticated: boolean;
}

export const Navbar = ({ isAuthenticated }: NavbarProps) => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const scrollToSection = (href: string) => {
    if (href.startsWith("#")) {
      if (href === "#hero") {
        // Scroll to top of page and clear hash from URL
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.history.pushState("", "", window.location.pathname);
      } else {
        const element = document.querySelector(href);
        if (element) {
          element.scrollIntoView({ behavior: "smooth", block: "start" });
        }
      }
    }
    setMobileOpen(false);
  };

  const items = siteConfig.navItems.map((i) => ({
    name: i.label,
    link: i.href,
    onClick: i.href.startsWith("#")
      ? (e: React.MouseEvent) => {
          e.preventDefault();
          scrollToSection(i.href);
        }
      : undefined,
  })) as Array<{
    name: string;
    link: string;
    onClick?: (e: React.MouseEvent) => void;
  }>;

  return (
    <RNavbar className="top-4">
      <NavBody>
        <div className="relative z-20 mr-4 flex items-center space-x-2 px-2 py-1">
          <Link href="/" className="flex items-center gap-2">
            <IconTableFilled className="text-primary" size={24} />
            <span className="font-semibold text-black dark:text-white">
              {siteConfig.name}
            </span>
          </Link>
        </div>

        <NavItems items={items} onItemClick={() => setMobileOpen(false)} />

        <div className="relative z-20 ml-auto hidden lg:flex items-center gap-2">
          <Link href={isAuthenticated ? "/dashboard" : "/sign-in"}>
            <Button
              color="primary"
              startContent={
                !isAuthenticated ? <DynamicIcon icon="login" /> : undefined
              }
              endContent={
                isAuthenticated ? (
                  <DynamicIcon
                    icon="next"
                    className="group-hover:translate-x-1 transition-transform duration-300"
                  />
                ) : undefined
              }
            >
              {isAuthenticated ? "Página inicial" : "Iniciar sessão"}
            </Button>
          </Link>
        </div>
      </NavBody>

      <MobileNav visible>
        <MobileNavHeader>
          <Link href="/" className="flex items-center gap-2">
            <IconTableFilled className="text-black dark:text-white" size={24} />
            <span className="font-semibold text-black dark:text-white">
              {siteConfig.name}
            </span>
          </Link>
          <MobileNavToggle
            isOpen={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          />
        </MobileNavHeader>
        <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
          <div className="flex flex-col gap-2 w-full">
            {items.map((item, idx) => (
              <a
                key={idx}
                href={item.link}
                className="w-full rounded-md px-3 py-2 text-left text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                onClick={(e) => {
                  if (item.onClick) {
                    item.onClick(e);
                  } else {
                    setMobileOpen(false);
                  }
                }}
              >
                {item.name}
              </a>
            ))}
            <NavbarButton
              href={isAuthenticated ? "/dashboard" : "/sign-in"}
              className="mt-2 bg-primary text-white"
            >
              {isAuthenticated ? "Dashboard" : "Entrar"}
            </NavbarButton>
          </div>
        </MobileNavMenu>
      </MobileNav>
    </RNavbar>
  );
};
