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
import Link from "next/link";
import * as React from "react";

interface RecentTransactionsCardProps {
  isLoading?: boolean;
}

export function RecentTransactionsCard({
  isLoading: externalLoading,
}: RecentTransactionsCardProps) {
  const { data: incomesData, isLoading: isLoadingIncomes } =
    trpc.transactions.list.useQuery({
      type: "income",
      limit: 5,
    });

  const { data: expensesData, isLoading: isLoadingExpenses } =
    trpc.transactions.list.useQuery({
      type: "expense",
      limit: 5,
    });

  const isLoadingState =
    externalLoading || isLoadingIncomes || isLoadingExpenses;

  const transactions = React.useMemo(() => {
    const allTransactions = [
      ...(incomesData || []).map((t) => ({ ...t, type: "income" as const })),
      ...(expensesData || []).map((t) => ({ ...t, type: "expense" as const })),
    ];

    return allTransactions
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [incomesData, expensesData]);

  return (
    <GlowCard
      title="Últimas transações"
      description="Suas transações mais recentes."
      contentClassName="gap-4"
      // hasAction={
      //   <Button href="/expenses" icon={<IconArrowRight className="size-4" />}>
      //     Ver todas as transações
      //   </Button>
      // }
    >
      {isLoadingState ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={`transaction-${index}`} className="h-16 w-full" />
          ))}
        </div>
      ) : transactions.length > 0 ? (
        <div className="space-y-2">
          {transactions.map((transaction) => {
            const isIncome = transaction.type === "income";
            const Icon = isIncome ? IconArrowDownLeft : IconArrowUpRight;
            const amountColor = isIncome
              ? "text-text-positive"
              : "text-text-negative";

            return (
              <Link
                key={transaction.id}
                href={`${isIncome ? "/incomes" : "/expenses"}?edit=${transaction.id}`}
                className="border-border/50 duration-300  bg-background hover:bg-muted flex items-center gap-3 rounded-lg border p-3 transition-colors"
              >
                <div
                  className={cn(
                    "flex size-10 items-center justify-center rounded-full",
                    isIncome
                      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "bg-rose-500/10 text-rose-600 dark:text-rose-400",
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
                  <span className={cn("text-sm font-semibold", amountColor)}>
                    {isIncome ? "+" : "-"}
                    {formatCurrency(transaction.amount)}
                  </span>
                  {transaction.isPaid && (
                    <span className="text-muted-foreground text-xs">Pago</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <DynamicIcon icon="transactions" />
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
