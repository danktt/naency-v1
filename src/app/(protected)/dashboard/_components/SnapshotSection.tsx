"use client";

import * as React from "react";
import { ArrowUpRight } from "lucide-react";

import { GridItem } from "@/components/gloweffect";

export type SnapshotCard = {
  key: string;
  title: string;
  value: string;
  subtitle: string;
  icon: React.ElementType;
  valueClassName?: string;
  iconContainerClassName?: string;
};

interface SnapshotSectionProps {
  title: string;
  description: string;
  retryLabel: string;
  isLoading: boolean;
  isError: boolean;
  cards: SnapshotCard[];
  onRetry: () => void;
}

export function SnapshotSection({
  title,
  description,
  retryLabel,
  isLoading,
  isError,
  cards,
  onRetry,
}: SnapshotSectionProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {isError ? (
          <button
            type="button"
            onClick={onRetry}
            className="text-primary inline-flex items-center gap-1 text-sm font-medium"
          >
            {retryLabel}
            <ArrowUpRight className="size-4" />
          </button>
        ) : null}
      </div>

      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((card) => {
          const Icon = card.icon as React.ElementType;
          return (
            <GridItem
              key={card.key}
              icon={<Icon className="size-5" stroke={1.5} />}
              title={card.title}
              value={card.value}
              valueClassName={card.valueClassName}
              iconContainerClassName={card.iconContainerClassName}
              description={card.subtitle}
              isLoading={isLoading}
            />
          );
        })}
      </ul>
    </section>
  );
}

