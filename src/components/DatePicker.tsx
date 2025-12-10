"use client";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useDateStore } from "@/stores/useDateStore";
import {
  endOfMonth,
  endOfWeek,
  endOfYear,
  format,
  startOfMonth,
  startOfWeek,
  startOfYear,
  subMonths,
  subWeeks,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";

const MONTHS = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

export function DatePicker() {
  const { dateRange, setDateRange } = useDateStore();
  const [open, setOpen] = React.useState(false);
  const [selectedYear, setSelectedYear] = React.useState(
    new Date().getFullYear(),
  );

  // Sincroniza o selectedYear com o dateRange atual
  React.useEffect(() => {
    setSelectedYear(dateRange.from.getFullYear());
  }, [dateRange.from]);

  const handleMonthSelect = (monthIndex: number) => {
    const from = startOfMonth(new Date(selectedYear, monthIndex));
    const to = endOfMonth(new Date(selectedYear, monthIndex));
    const newRange = { from, to };
    setDateRange(newRange);
    setOpen(false);
  };

  const handleWeekSelect = (weeksAgo: number) => {
    const now = new Date();
    const targetWeek = subWeeks(now, weeksAgo);
    const from = startOfWeek(targetWeek, { weekStartsOn: 0 });
    const to = endOfWeek(targetWeek, { weekStartsOn: 0 });
    const newRange = { from, to };
    setDateRange(newRange);
    setOpen(false);
  };

  const handleQuickSelect = (type: string) => {
    const now = new Date();
    let from: Date;
    let to: Date;

    switch (type) {
      case "thisMonth":
        from = startOfMonth(now);
        to = endOfMonth(now);
        break;
      case "lastMonth":
        from = startOfMonth(subMonths(now, 1));
        to = endOfMonth(subMonths(now, 1));
        break;
      case "last3Months":
        from = startOfMonth(subMonths(now, 2));
        to = endOfMonth(now);
        break;
      case "thisYear":
        from = startOfYear(now);
        to = endOfYear(now);
        break;
      default:
        return;
    }

    const newRange = { from, to };
    setDateRange(newRange);
    setOpen(false);
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const formatDisplayDate = () => {
    const fromMonth = dateRange.from.getMonth();
    const toMonth = dateRange.to.getMonth();
    const fromYear = dateRange.from.getFullYear();
    const toYear = dateRange.to.getFullYear();

    if (fromMonth === toMonth && fromYear === toYear) {
      return format(dateRange.from, "MMMM yyyy", { locale: ptBR });
    }

    return `${format(dateRange.from, "MMM yyyy", { locale: ptBR })} - ${format(dateRange.to, "MMM yyyy", { locale: ptBR })}`;
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 bg-card border-border hover:bg-muted capitalize"
        >
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span>{formatDisplayDate()}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[340px] p-0" align="end">
        <Tabs defaultValue="month" className="w-full">
          <div className="border-b border-border p-3">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="month">Mês</TabsTrigger>
              <TabsTrigger value="week">Semana</TabsTrigger>
              <TabsTrigger value="quick">Rápido</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="month" className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedYear(selectedYear - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold">{selectedYear}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setSelectedYear(selectedYear + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {MONTHS.map((month, index) => {
                const isCurrentMonth =
                  index === currentMonth && selectedYear === currentYear;
                const isSelected =
                  dateRange.from.getMonth() === index &&
                  dateRange.from.getFullYear() === selectedYear &&
                  dateRange.to.getMonth() === index &&
                  dateRange.to.getFullYear() === selectedYear;

                return (
                  <Button
                    key={month}
                    variant={isSelected ? "default" : "ghost"}
                    size="sm"
                    className={cn(
                      "h-10",
                      isCurrentMonth &&
                        !isSelected &&
                        "border border-primary text-primary",
                      isSelected &&
                        "bg-primary hover:bg-primary/90 text-primary-foreground",
                    )}
                    onClick={() => handleMonthSelect(index)}
                  >
                    {month}
                  </Button>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="week" className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Selecione uma semana:
            </p>
            {[
              { label: "Esta semana", value: 0 },
              { label: "Semana passada", value: 1 },
              { label: "2 semanas atrás", value: 2 },
              { label: "3 semanas atrás", value: 3 },
              { label: "4 semanas atrás", value: 4 },
            ].map((item) => (
              <Button
                key={item.value}
                variant="ghost"
                className="w-full justify-start h-10"
                onClick={() => handleWeekSelect(item.value)}
              >
                {item.label}
              </Button>
            ))}
          </TabsContent>

          <TabsContent value="quick" className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground mb-3">
              Atalhos rápidos:
            </p>
            {[
              { label: "Este mês", value: "thisMonth", icon: "📅" },
              { label: "Mês passado", value: "lastMonth", icon: "⏪" },
              { label: "Últimos 3 meses", value: "last3Months", icon: "📊" },
              { label: "Este ano", value: "thisYear", icon: "📆" },
            ].map((item) => (
              <Button
                key={item.value}
                variant="ghost"
                className="w-full justify-start h-10 gap-3"
                onClick={() => handleQuickSelect(item.value)}
              >
                <span>{item.icon}</span>
                {item.label}
              </Button>
            ))}
          </TabsContent>
        </Tabs>
      </PopoverContent>
    </Popover>
  );
}
