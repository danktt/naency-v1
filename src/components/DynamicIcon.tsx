"use client";

import {
  IconAlertCircle,
  IconAlertOctagon,
  IconAlertTriangle,
  IconArchive,
  IconArrowDownLeft,
  IconArrowsDoubleNeSw,
  IconArrowUpRight,
  IconBuildingBank,
  IconCalculator,
  IconCalendar,
  IconCalendarCheck,
  IconCalendarEvent,
  IconCalendarMonth,
  IconCalendarTime,
  IconCalendarWeek,
  IconCheck,
  IconChecks,
  IconChevronLeft,
  IconChevronRight,
  IconCircle,
  IconCircleCheck,
  IconDots,
  IconDotsVertical,
  IconEye,
  IconEyeOff,
  IconInfoCircle,
  IconLoader,
  IconMoon,
  IconPencil,
  IconPlus,
  IconReceipt,
  IconReceiptRefund,
  IconRefreshDot,
  IconRepeat,
  IconRestore,
  IconRocket,
  IconSun,
  IconTrash,
} from "@tabler/icons-react";
import type { ReactElement } from "react";

interface DynamicIconProps {
  icon: IconName;
  className?: string;
  size?: number;
  stroke?: number;
}
const sonnerIcons = {
  "sonner-success": IconCircleCheck,
  "sonner-info": IconInfoCircle,
  "sonner-warning": IconAlertTriangle,
  "sonner-error": IconAlertOctagon,
  "sonner-loading": IconLoader,
} as const;

const calendarIcons = {
  calendar: IconCalendar,
  "calendar-day": IconCalendarEvent,
  "calendar-week": IconCalendarWeek,
  "calendar-month": IconCalendarMonth,
  "calendar-check": IconCalendarCheck,
  "calendar-time": IconCalendarTime,
};
export const ICON_MAP = {
  unique: IconReceipt,
  archive: IconArchive,
  installment: calendarIcons["calendar-day"],
  recurring: IconRepeat,
  check: IconCheck,
  bank: IconBuildingBank,
  moon: IconMoon,
  sun: IconSun,
  income: IconArrowDownLeft,
  expense: IconArrowUpRight,
  "double-check": IconChecks,
  circle: IconCircle,
  "dots-horizontal": IconDots,
  "dots-vertical": IconDotsVertical,
  edit: IconPencil,
  "receipt-refund": IconReceiptRefund,
  "refresh-dot": IconRefreshDot,
  trash: IconTrash,
  warning: IconAlertCircle,
  transactions: IconArrowsDoubleNeSw,
  add: IconPlus,
  rocket: IconRocket,
  next: IconChevronRight,
  previous: IconChevronLeft,
  calculator: IconCalculator,
  eye: IconEye,
  "eye-off": IconEyeOff,
  restore: IconRestore,
  loading: IconLoader,
  ...calendarIcons,
  ...sonnerIcons,
} as const;

export type IconName = keyof typeof ICON_MAP;

export function getIconComponent(iconName: string | null | undefined) {
  if (!iconName) return null;
  return ICON_MAP[iconName as keyof typeof ICON_MAP] ?? null;
}

export function DynamicIcon({
  icon,
  className,
  size = 16,
  stroke = 1.5,
  ...props
}: DynamicIconProps): ReactElement | null {
  const IconComponent = getIconComponent(icon);

  if (!IconComponent) return null;

  return (
    <IconComponent
      className={className}
      size={size}
      stroke={stroke}
      {...props}
    />
  );
}
