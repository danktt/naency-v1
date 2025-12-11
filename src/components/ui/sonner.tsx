"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";
import { DynamicIcon } from "../DynamicIcon";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <DynamicIcon icon="sonner-success" className="size-4 text-success" />
        ),
        info: <DynamicIcon icon="sonner-info" className="size-4 text-info" />,
        warning: (
          <DynamicIcon icon="sonner-warning" className="size-4 text-warning" />
        ),
        error: (
          <DynamicIcon icon="sonner-error" className="size-4 text-error" />
        ),
        loading: (
          <DynamicIcon icon="sonner-loading" className="size-4 animate-spin " />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
