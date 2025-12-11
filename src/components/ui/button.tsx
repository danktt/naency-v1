import { cn } from "@/lib/utils";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import Link from "next/link";
import type * as React from "react";
import { DynamicIcon } from "../DynamicIcon";

const buttonVariants = cva(
  "inline-flex items-center cursor-pointer justify-center duration-300 gap-2 whitespace-nowrap rounded-md text-sm font-medium  disabled:pointer-events-none disabled:opacity-50 transition-all [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive active:scale-[0.99]",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground dark:hover:bg-primary/80 hover:bg-primary/70 active:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/80 active:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:hover:bg-destructive/60",
        outline:
          "border bg-background shadow-xs hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  isLoading = false,
  disabled,
  children,
  icon,
  href,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    isLoading?: boolean;
    icon?: React.ReactNode;
    href?: string;
  }) {
  const Comp = asChild ? Slot : "button";

  if (href) {
    return (
      <Link href={href}>
        <Button
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {icon}
          {children}
        </Button>
      </Link>
    );
  }

  return (
    <Comp
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        isLoading && "cursor-progress",
        className,
      )}
      aria-busy={isLoading || undefined}
      {...props}
      disabled={isLoading || disabled}
    >
      {isLoading ? (
        <>
          <DynamicIcon icon="sonner-loading" className="size-4 animate-spin" />
          <span className="sr-only">Loading</span>
        </>
      ) : (
        icon
      )}

      {children}
    </Comp>
  );
}

export { Button, buttonVariants };
