import { Slot } from "@radix-ui/react-slot";

import { cn } from "@/lib/utils";

type SkeletonProps = React.ComponentProps<"div"> & {
  asChild?: boolean;
};

function Skeleton({ className, asChild = false, ...props }: SkeletonProps) {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      data-slot="skeleton"
      className={cn("bg-accent animate-pulse rounded-md", className)}
      {...props}
    />
  );
}

export { Skeleton };
