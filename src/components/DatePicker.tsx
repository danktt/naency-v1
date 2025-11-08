"use client";

import { endOfMonth, format, isSameMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useEffect, useState } from "react";
import type { DateRange } from "react-day-picker";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useDateStore } from "@/stores/useDateStore";

export function DatePicker() {
  const { dateRange, setDateRange } = useDateStore();
  const [month, setMonth] = useState<Date>(() => startOfMonth(dateRange.to));

  const updateRangeForMonth = (targetMonth: Date) => {
    const now = new Date();
    const from = startOfMonth(targetMonth);
    const to = isSameMonth(targetMonth, now) ? now : endOfMonth(targetMonth);

    setDateRange({
      from,
      to,
    });
  };

  useEffect(() => {
    setMonth((current) => {
      const rangeMonth = startOfMonth(dateRange.to);
      return current.getFullYear() === rangeMonth.getFullYear() &&
        current.getMonth() === rangeMonth.getMonth()
        ? current
        : rangeMonth;
    });
  }, [dateRange]);

  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const years = Array.from(
    { length: 11 },
    (_, i) => new Date().getFullYear() - 5 + i,
  );

  const handleMonthChange = (monthIndex: string) => {
    const newDate = new Date(month);
    newDate.setMonth(Number.parseInt(monthIndex));
    setMonth(newDate);

    updateRangeForMonth(newDate);
  };

  const handleYearChange = (year: string) => {
    const newDate = new Date(month);
    newDate.setFullYear(Number.parseInt(year));
    setMonth(newDate);

    updateRangeForMonth(newDate);
  };

  const handleSelect = (range: DateRange | undefined) => {
    if (!range?.from) {
      return;
    }

    const from = range.from;
    const to = range.to ?? range.from;

    setDateRange({ from, to });
  };

  const date: DateRange = {
    from: dateRange.from,
    to: dateRange.to,
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "justify-start text-left font-normal",
            !date && "text-muted-foreground",
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date?.from ? (
            date.to ? (
              <>
                {format(date.from, "dd 'de' MMM", { locale: ptBR })} -{" "}
                {format(date.to, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}
              </>
            ) : (
              format(date.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
            )
          ) : (
            "Select a period"
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <Select
            value={month.getMonth().toString()}
            onValueChange={handleMonthChange}
          >
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((monthName, index) => (
                <SelectItem key={index} value={index.toString()}>
                  {monthName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={month.getFullYear().toString()}
            onValueChange={handleYearChange}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="range"
          selected={date}
          onSelect={handleSelect}
          month={month}
          onMonthChange={setMonth}
          numberOfMonths={2}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
}
