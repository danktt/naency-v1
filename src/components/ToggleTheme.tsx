"use client";

import { Button, type buttonVariants } from "@/components/ui/button";
import type { VariantProps } from "class-variance-authority";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "next-themes";
import * as React from "react";
import { DynamicIcon } from "./DynamicIcon";

export function ToggleTheme({
  className,
  size = "icon",
  variant = "outline",
}: {
  className?: string;
  size?: VariantProps<typeof buttonVariants>["size"];
  variant?: VariantProps<typeof buttonVariants>["variant"];
}) {
  const { theme, setTheme } = useTheme();

  const toggleTheme = React.useCallback(() => {
    if (!document.startViewTransition) {
      setTheme(theme === "dark" ? "light" : "dark");
      return;
    }

    document.startViewTransition(() => {
      setTheme(theme === "dark" ? "light" : "dark");
    });
  }, [theme, setTheme]);

  return (
    <Button
      variant={variant}
      size={size}
      onClick={toggleTheme}
      className={className}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={theme}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          exit={{ scale: 0, rotate: 90 }}
          transition={{ duration: 0.2 }}
        >
          <DynamicIcon
            icon={theme === "dark" ? "moon" : "sun"}
            className="size-4 "
          />
        </motion.div>
      </AnimatePresence>
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
