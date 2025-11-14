"use client";

import * as TabsPrimitive from "@radix-ui/react-tabs";
import { motion } from "framer-motion";
import * as React from "react";

import { cn } from "@/lib/utils";

const Tabs = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) => {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  );
};
Tabs.displayName = "Tabs";

const TabsList = ({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) => {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn(
        "bg-muted text-muted-foreground relative inline-flex h-9 w-fit items-center justify-center rounded-lg p-1",
        className,
      )}
      {...props}
    />
  );
};
TabsList.displayName = "TabsList";

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, children, ...props }, ref) => {
  const dataState = (props as { "data-state"?: "active" | "inactive" })[
    "data-state"
  ];
  const isActive = dataState === "active";

  return (
    <TabsPrimitive.Trigger asChild {...props}>
      <motion.button
        ref={ref}
        data-slot="tabs-trigger"
        className={cn(
          "relative text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center rounded-md px-2 py-1 text-sm font-medium whitespace-nowrap focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
          className,
        )}
        layout
        transition={{ type: "spring", stiffness: 260, damping: 30 }}
        whileTap={{ scale: 0.97 }}
      >
        <span className="relative flex w-full items-center justify-center gap-1.5 px-2 py-1">
          {isActive ? (
            <motion.span
              layoutId="tabs-active-indicator"
              className="absolute inset-0 rounded-md bg-background shadow-sm dark:bg-input/40"
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            />
          ) : null}
          <span className="relative z-10">{children}</span>
        </span>
      </motion.button>
    </TabsPrimitive.Trigger>
  );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  return (
    <TabsPrimitive.Content asChild {...props}>
      <motion.div
        ref={ref}
        data-slot="tabs-content"
        className={cn("flex-1 outline-none", className)}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {children}
      </motion.div>
    </TabsPrimitive.Content>
  );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
