"use client";

import { cn } from "@/lib/utils";
import { type HTMLMotionProps, motion } from "framer-motion";
import type { ReactNode } from "react";

interface AnimatedModalProps {
  isOpen: boolean;
  onClose?: () => void;
  children: ReactNode;
  className?: string;
}

interface AnimatedModalContentProps extends HTMLMotionProps<"div"> {
  children: ReactNode;
  className?: string;
}

interface AnimatedModalHeaderProps {
  children: ReactNode;
  className?: string;
}

interface AnimatedModalBodyProps {
  children: ReactNode;
  className?: string;
}

interface AnimatedModalFooterProps {
  children: ReactNode;
  className?: string;
}

interface AnimatedModalProgressProps {
  value: number;
  max?: number;
  className?: string;
}

function BackgroundOrbs() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <motion.div
        className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full dark:bg-primary/5 bg-primary/15"
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360],
        }}
        transition={{
          duration: 20,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
      <motion.div
        className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full dark:bg-primary/5 bg-primary/15"
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [360, 180, 0],
        }}
        transition={{
          duration: 25,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
    </div>
  );
}

export function AnimatedModal({
  isOpen,
  onClose,
  children,
  className,
}: AnimatedModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 md:p-4",
        className,
      )}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose?.();
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onClose?.();
        }
      }}
      // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: This is a modal backdrop
      role="dialog"
    >
      <BackgroundOrbs />
      {children}
    </div>
  );
}

export function AnimatedModalContent({
  children,
  className,
  ...props
}: AnimatedModalContentProps) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.95, opacity: 0, y: 20 }}
      transition={{ type: "spring", duration: 0.5, bounce: 0.3 }}
      className={cn(
        "relative w-full max-w-3xl overflow-hidden rounded-none md:rounded-3xl bg-card/95 backdrop-blur-xl shadow-2xl border-0 md:border border-border/50 flex flex-col h-full md:h-auto md:max-h-[90vh] z-10",
        className,
      )}
      onClick={(e) => e.stopPropagation()}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export function AnimatedModalHeader({
  children,
  className,
}: AnimatedModalHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-6 shrink-0",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AnimatedModalBody({
  children,
  className,
}: AnimatedModalBodyProps) {
  return (
    <div
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar px-6",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AnimatedModalFooter({
  children,
  className,
}: AnimatedModalFooterProps) {
  return (
    <div
      className={cn(
        "flex justify-end gap-3 p-6 shrink-0 bg-card/50 backdrop-blur-sm z-10",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function AnimatedModalProgress({
  value,
  max = 100,
  className,
}: AnimatedModalProgressProps) {
  const percentage = max <= 20 ? (value / max) * 100 : value;

  return (
    <div
      className={cn(
        "relative h-1.5 w-full bg-muted overflow-hidden shrink-0",
        className,
      )}
    >
      <motion.div
        className="h-full bg-gradient-to-r from-primary via-primary to-accent"
        initial={{ width: "0%" }}
        animate={{
          width: `${percentage}%`,
        }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      />
      <motion.div
        className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
        animate={{ x: ["-100%", "500%"] }}
        transition={{
          duration: 2,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear",
        }}
      />
    </div>
  );
}
