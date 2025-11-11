export const formatDate = (dateString: string | Date | null | undefined) => {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString("pt-BR");
};

export const formatDateRange = (
  fromInput: Date | string | number | null | undefined,
  toInput: Date | string | number | null | undefined,
): string => {
  const normalize = (
    value: Date | string | number | null | undefined,
  ): Date | null => {
    if (!value) return null;
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const from = normalize(fromInput);
  const to = normalize(toInput);

  if (!from || !to) return "Invalid period";

  const fromMonth = from.toLocaleDateString("en-US", { month: "long" });
  const toMonth = to.toLocaleDateString("en-US", { month: "long" });

  const fromYear = from.getFullYear();
  const toYear = to.getFullYear();

  if (fromYear === toYear) {
    if (fromMonth === toMonth) {
      return `${fromMonth} ${fromYear}`;
    }
    return `${fromMonth} ${fromYear} - ${toMonth} ${toYear}`;
  }

  return `${fromMonth} ${fromYear} - ${toMonth} ${toYear}`;
};
