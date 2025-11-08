import { endOfDay, isAfter, isToday, startOfDay, subDays } from "date-fns";
import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface DateRangeValue {
  from: Date;
  to: Date;
}

interface DateStore {
  dateRange: DateRangeValue;
  setDateRange: (range: Partial<DateRangeValue> | undefined) => void;
  resetToDefault: () => void;
}

const DEFAULT_OFFSET_DAYS = 30;

const createDefaultRange = (): DateRangeValue => {
  const today = new Date();
  const from = subDays(today, DEFAULT_OFFSET_DAYS);

  return {
    from: startOfDay(from),
    to: endOfDay(today),
  };
};

const toDate = (value: Date | string | undefined): Date | undefined => {
  if (!value) {
    return undefined;
  }

  const parsed = value instanceof Date ? value : new Date(value);

  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const normalizeRange = (
  range: Partial<DateRangeValue> | undefined,
  fallback: DateRangeValue,
): DateRangeValue => {
  const from = toDate(range?.from) ?? fallback.from;
  const to = toDate(range?.to) ?? fallback.to;

  const sorted = isAfter(from, to)
    ? { from: to, to: from }
    : { from, to };

  return {
    from: startOfDay(sorted.from),
    to: endOfDay(sorted.to),
  };
};

const adjustPersistedDates = (
  storedDateRange: Partial<DateRangeValue> | undefined,
): DateRangeValue => {
  const today = new Date();
  const fallback = createDefaultRange();
  const normalized = normalizeRange(storedDateRange, fallback);

  if (!isToday(normalized.to) && !isAfter(normalized.to, today)) {
    const todayEnd = endOfDay(today);
    return normalizeRange(
      {
        from: normalized.from,
        to: todayEnd,
      },
      normalized,
    );
  }

  return normalized;
};

export const useDateStore = create<DateStore>()(
  persist(
    (set, get) => ({
      dateRange: createDefaultRange(),
      setDateRange: (range) =>
        set({
          dateRange: normalizeRange(range, get().dateRange),
        }),
      resetToDefault: () => set({ dateRange: createDefaultRange() }),
    }),
    {
      name: "date-range-storage",
      version: 1,
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return;
        }

        const adjusted = adjustPersistedDates(state.dateRange);
        state.dateRange = adjusted;
      },
    },
  ),
);

