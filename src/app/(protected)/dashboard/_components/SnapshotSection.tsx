"use client";

import type * as React from "react";

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

export function SnapshotSection({ isLoading, cards }: SnapshotSectionProps) {
  return (
    <section className="space-y-4">
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
