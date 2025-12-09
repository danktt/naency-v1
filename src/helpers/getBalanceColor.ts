/**
 * Return the appropriate CSS class based on the value:
 * - < 0: red (text-text-negative)
 * - > 0: green (text-text-positive)
 * - = 0: undefined (default color/white)
 */
export const getTextBalanceColor = (
  value: number | null | undefined,
): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (value < 0) return "text-text-negative dark:text-text-negative";
  if (value > 0) return "text-text-positive dark:text-text-positive";
  return undefined;
};
