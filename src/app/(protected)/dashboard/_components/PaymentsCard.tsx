"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

import { GlowCard } from "@/components/gloweffect";
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

type PaymentStatus = {
  key: string;
  icon: React.ReactNode;
  accentClassName: string;
  title: string;
  description: string;
  value: number;
};

export type PaymentSection = {
  key: string;
  href: string;
  title: string;
  description: string;
  cta: string;
  statuses: PaymentStatus[];
};

interface PaymentsCardProps {
  sections: PaymentSection[];
  hasPaymentStatuses: boolean;
  isLoading: boolean;
  formatNumber: (value: number) => string;
}

export function PaymentsCard({
  sections,
  hasPaymentStatuses,
  isLoading,
  formatNumber,
}: PaymentsCardProps) {
  return (
    <GlowCard
      title="Status de pagamentos"
      description="Acompanhe quais transações estão em dia, atrasadas ou pendentes."
      contentClassName="gap-6"
    >
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Skeleton key={`status-${index}`} className="h-[72px] w-full" />
          ))}
        </div>
      ) : hasPaymentStatuses ? (
        <Tabs defaultValue="incomes">
          <TabsList>
            {sections.map((section) => (
              <TabsTrigger key={section.key} value={section.key}>
                {section.title}
              </TabsTrigger>
            ))}
          </TabsList>
          {sections.map((section) => (
            <TabsContent key={section.key} value={section.key}>
              <div className="space-y-3 rounded-lg border border-border/40 bg-muted/30 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-sm font-semibold">{section.title}</p>
                    <p className="text-muted-foreground text-xs">
                      {section.description}
                    </p>
                  </div>
                  <Link
                    href={section.href}
                    className="text-primary inline-flex items-center gap-1 text-xs font-medium"
                  >
                    {section.cta}
                    <ArrowUpRight className="size-3" />
                  </Link>
                </div>
                <div className="space-y-3">
                  {section.statuses.map((status) => (
                    <div
                      key={`${section.key}-${status.key}`}
                      className="border-border/50 bg-background/60 flex items-start gap-3 rounded-lg border p-4"
                    >
                      <div
                        className={`${status.accentClassName} mt-1 inline-flex size-8 items-center justify-center rounded-full`}
                      >
                        {status.icon}
                      </div>
                      <div className="flex flex-1 flex-col gap-1">
                        <p className="text-sm font-medium">{status.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {status.description}
                        </p>
                      </div>
                      <span className="text-foreground text-xl font-semibold">
                        {formatNumber(status.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <Empty className="h-[240px]">
          <EmptyHeader>
            <EmptyTitle>Nada por aqui ainda</EmptyTitle>
            <EmptyDescription>
              Adicione transações para acompanhar o status de pagamento.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </GlowCard>
  );
}
