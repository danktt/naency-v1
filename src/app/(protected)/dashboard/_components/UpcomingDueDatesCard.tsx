"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { GlowCard } from "@/components/gloweffect";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/helpers/formatCurrency";
import { formatDate } from "@/helpers/formatDate";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { IconArrowDownLeft, IconArrowUpRight } from "@tabler/icons-react";
import { Clock } from "lucide-react";
import Link from "next/link";
import * as React from "react";

interface UpcomingDueDatesCardProps {
  isLoading?: boolean;
}

export function UpcomingDueDatesCard({
  isLoading: externalLoading,
}: UpcomingDueDatesCardProps) {
  const now = React.useMemo(() => new Date(), []);
  const nextWeek = React.useMemo(() => {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return date;
  }, []);

  const { data: incomesData, isLoading: isLoadingIncomes } =
    trpc.transactions.list.useQuery({
      type: "income",
      limit: 10,
      dateRange: {
        from: now,
        to: nextWeek,
      },
    });

  const { data: expensesData, isLoading: isLoadingExpenses } =
    trpc.transactions.list.useQuery({
      type: "expense",
      limit: 10,
      dateRange: {
        from: now,
        to: nextWeek,
      },
    });

  const isLoadingState =
    externalLoading || isLoadingIncomes || isLoadingExpenses;

  const upcomingTransactions = React.useMemo(() => {
    const allTransactions = [
      ...(incomesData || []).map((t) => ({ ...t, type: "income" as const })),
      ...(expensesData || []).map((t) => ({ ...t, type: "expense" as const })),
    ];

    // Filtra apenas não pagas e ordena por data
    return allTransactions
      .filter((t) => !t.isPaid)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 5);
  }, [incomesData, expensesData]);

  const getDaysUntilDue = (date: Date | string) => {
    const dueDate = new Date(date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);
    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <GlowCard
      title="Próximos vencimentos"
      description="Transações que vencem nos próximos 7 dias."
      contentClassName="gap-4 h-full"
    >
      {isLoadingState ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`upcoming-${index}`} className="h-16 w-full" />
          ))}
        </div>
      ) : upcomingTransactions.length > 0 ? (
        <div className="space-y-2">
          {upcomingTransactions.map((transaction) => {
            const isIncome = transaction.type === "income";
            const Icon = isIncome ? IconArrowDownLeft : IconArrowUpRight;
            const daysUntilDue = getDaysUntilDue(transaction.date);
            const isOverdue = daysUntilDue < 0;
            const isToday = daysUntilDue === 0;
            const isSoon = daysUntilDue <= 3 && daysUntilDue > 0;

            let dueLabel = "";
            let dueLabelClassName = "";
            if (isOverdue) {
              dueLabel = `${Math.abs(daysUntilDue)} ${Math.abs(daysUntilDue) === 1 ? "dia" : "dias"} atrasado`;
              dueLabelClassName = "text-destructive";
            } else if (isToday) {
              dueLabel = "Vence hoje";
              dueLabelClassName = "text-amber-600 dark:text-amber-400";
            } else if (isSoon) {
              dueLabel = `Vence em ${daysUntilDue} ${daysUntilDue === 1 ? "dia" : "dias"}`;
              dueLabelClassName = "text-amber-600 dark:text-amber-400";
            } else {
              dueLabel = `Vence em ${daysUntilDue} dias`;
              dueLabelClassName = "text-muted-foreground";
            }

            return (
              <Link
                key={transaction.id}
                href={`${isIncome ? "/incomes" : "/expenses"}?edit=${transaction.id}`}
                className="border-border/50 bg-background hover:bg-muted flex duration-300 items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full",
                    isIncome
                      ? "bg-text-positive/10 text-text-positive dark:text-text-positive"
                      : "bg-text-negative/10 text-text-negative dark:text-text-negative",
                  )}
                >
                  <Icon className="size-5" />
                </div>
                <div className="flex flex-1 flex-col gap-1">
                  <p className="text-sm font-medium line-clamp-1">
                    {transaction.description || "Sem descrição"}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{formatDate(transaction.date)}</span>
                    {transaction.categoryName && (
                      <>
                        <span>•</span>
                        <span>{transaction.categoryName}</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span
                    className={cn(
                      "text-sm font-semibold",
                      isIncome ? "text-text-positive" : "text-text-negative",
                    )}
                  >
                    {isIncome ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                  <div className="flex items-center gap-1">
                    <Clock className="size-3" />
                    <span className={cn("text-xs", dueLabelClassName)}>
                      {dueLabel}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty className=" h-full">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DynamicIcon icon="calendar-time" />
            </EmptyMedia>
            <EmptyTitle>Nenhuma transação encontrada</EmptyTitle>
            <EmptyDescription>
              Adicione transações para vê-las aqui.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent className="flex flex-row justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              href="/expenses"
              icon={<IconArrowUpRight className="size-4" />}
            >
              Despesa
            </Button>
            <Button
              variant="secondary"
              size="sm"
              href="/incomes"
              icon={<IconArrowDownLeft className="size-4" />}
            >
              Receita
            </Button>
          </EmptyContent>
        </Empty>
      )}
    </GlowCard>
  );
}
