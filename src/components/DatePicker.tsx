"use client";

import {
  endOfMonth,
  endOfYear,
  format,
  startOfMonth,
  startOfYear,
  subDays,
  subMonths,
  subYears,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarIcon } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useDateStore } from "@/stores/useDateStore";

type PresetRange = {
  label: string;
  getRange: () => { from: Date; to: Date };
};

const cloneDate = (date: Date) => new Date(date.getTime());

export function DatePicker() {
  const { dateRange, setDateRange } = useDateStore();
  const today = useMemo(() => new Date(), []);

  const presets = useMemo<PresetRange[]>(() => {
    const getToday = () => {
      const base = new Date();
      return {
        from: cloneDate(base),
        to: cloneDate(base),
      };
    };

    const getYesterday = () => {
      const base = subDays(new Date(), 1);
      return {
        from: cloneDate(base),
        to: cloneDate(base),
      };
    };

    const getLast7Days = () => {
      const end = new Date();
      return {
        from: subDays(cloneDate(end), 6),
        to: cloneDate(end),
      };
    };

    const getLast30Days = () => {
      const end = new Date();
      return {
        from: subDays(cloneDate(end), 29),
        to: cloneDate(end),
      };
    };

    const getMonthToDate = () => {
      const end = new Date();
      return {
        from: startOfMonth(cloneDate(end)),
        to: cloneDate(end),
      };
    };

    const getLastMonth = () => {
      const base = subMonths(new Date(), 1);
      return {
        from: startOfMonth(cloneDate(base)),
        to: endOfMonth(cloneDate(base)),
      };
    };

    const getYearToDate = () => {
      const end = new Date();
      return {
        from: startOfYear(cloneDate(end)),
        to: cloneDate(end),
      };
    };

    const getLastYear = () => {
      const base = subYears(new Date(), 1);
      return {
        from: startOfYear(cloneDate(base)),
        to: endOfYear(cloneDate(base)),
      };
    };

    return [
      { label: "Today", getRange: getToday },
      { label: "Yesterday", getRange: getYesterday },
      { label: "Last 7 days", getRange: getLast7Days },
      { label: "Last 30 days", getRange: getLast30Days },
      { label: "Month to date", getRange: getMonthToDate },
      { label: "Last month", getRange: getLastMonth },
      { label: "Year to date", getRange: getYearToDate },
      { label: "Last year", getRange: getLastYear },
    ];
  }, []);

  const [month, setMonth] = useState<Date>(() => cloneDate(dateRange.to));
  const [date, setDate] = useState<DateRange>(() => ({
    from: dateRange.from,
    to: dateRange.to,
  }));

  useEffect(() => {
    setDate({
      from: dateRange.from,
      to: dateRange.to,
    });
    setMonth(cloneDate(dateRange.to));
  }, [dateRange]);

  const applyRange = useCallback(
    (range: DateRange) => {
      if (!range.from) {
        return;
      }

      const from = range.from;
      const to = range.to ?? from;
      const normalized: DateRange = { from, to };

      setDate(normalized);
      setMonth(cloneDate(to));
      setDateRange(normalized);
    },
    [setDateRange],
  );

  const handleSelect = useCallback(
    (nextRange: DateRange | undefined) => {
      if (!nextRange?.from) {
        return;
      }

      const { from, to } = nextRange;

      if (!from) {
        return;
      }

      applyRange({
        from,
        to: to ?? from,
      });
    },
    [applyRange],
  );

  const isActivePreset = useCallback(
    (range: { from: Date; to: Date }) => {
      if (!date?.from || !date?.to) {
        return false;
      }

      return (
        date.from.getTime() === range.from.getTime() &&
        date.to.getTime() === range.to?.getTime()
      );
    },
    [date],
  );

  const rangeLabel = useMemo(() => {
    if (!date?.from) {
      return "Select a period";
    }

    if (!date.to) {
      return format(date.from, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    }

    return `${format(date.from, "dd 'de' MMM", { locale: ptBR })} - ${format(date.to, "dd 'de' MMM 'de' yyyy", { locale: ptBR })}`;
  }, [date]);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className="justify-start text-left font-normal"
        >
          <CalendarIcon className="mr-2 size-4" />
          {rangeLabel}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="rounded-md border">
          <div className="flex max-sm:flex-col">
            <div className="relative py-4 max-sm:order-1 max-sm:border-t sm:w-32">
              <div className="h-full sm:border-e">
                <div className="flex flex-col px-2">
                  {presets.map((preset) => {
                    const range = preset.getRange();
                    const isActive = isActivePreset(range);

                    return (
                      <Button
                        key={preset.label}
                        variant={isActive ? "secondary" : "ghost"}
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => applyRange(range)}
                      >
                        {preset.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
            <Calendar
              mode="range"
              selected={date}
              onSelect={handleSelect}
              month={month}
              onMonthChange={setMonth}
              className="p-2"
              numberOfMonths={2}
              disabled={[{ after: today }]}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
