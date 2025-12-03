"use client";

import { motion } from "framer-motion";
import { Tabs as TabsPrimitive } from "radix-ui";
import * as React from "react";

import { cn } from "@/lib/utils";

function Tabs({
  className,
  isEdit,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root> & { isEdit?: boolean }) {
  return (
    <TabsPrimitive.Root
      className={cn(
        "flex flex-col gap-2",
        isEdit && "pointer-events-none opacity-50",
        className,
      )}
      data-slot="tabs"
      {...props}
    />
  );
}

function TabsList({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-fit items-center justify-center rounded-md bg-muted p-0.5 text-muted-foreground/70",
        className,
      )}
      data-slot="tabs-list"
      {...props}
    />
  );
}

function TabsTrigger({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  const [isActive, setIsActive] = React.useState(false);
  const ref = React.useRef<HTMLButtonElement>(null);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new MutationObserver(() => {
      setIsActive(element.getAttribute("data-state") === "active");
    });

    observer.observe(element, {
      attributes: true,
      attributeFilter: ["data-state"],
    });

    // Check initial state
    setIsActive(element.getAttribute("data-state") === "active");

    return () => observer.disconnect();
  }, []);

  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        "relative inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 font-medium text-sm outline-none transition-all hover:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-35 data-[state=active]:text-foreground [&_svg]:shrink-0",
        className,
      )}
      data-slot="tabs-trigger"
      {...props}
    >
      {isActive && (
        <motion.div
          layoutId="active-tab"
          className="absolute inset-0 bg-background rounded-md shadow-sm"
          transition={{
            type: "spring",
            duration: 0.4,
            bounce: 0.2,
          }}
        />
      )}
      <span className="relative z-10 flex items-center justify-center">
        {props.children}
      </span>
    </TabsPrimitive.Trigger>
  );
}

function TabsContent({
  className,
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn("flex-1 outline-none", className)}
      data-slot="tabs-content"
      {...props}
    />
  );
}

export { Tabs, TabsContent, TabsList, TabsTrigger };
