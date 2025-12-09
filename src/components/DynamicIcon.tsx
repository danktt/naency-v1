"use client";

import {
  IconAlertCircle,
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBuildingBank,
  IconCalendar,
  IconCalendarCheck,
  IconCalendarEvent,
  IconCalendarMonth,
  IconCalendarTime,
  IconCalendarWeek,
  IconCheck,
  IconChecks,
  IconCircle,
  IconDotsVertical,
  IconMoon,
  IconPencil,
  IconReceipt,
  IconReceiptRefund,
  IconRefreshDot,
  IconRepeat,
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
  dotsVertical: IconDotsVertical,
  edit: IconPencil,
  receiptRefund: IconReceiptRefund,
  refreshDot: IconRefreshDot,
  trash: IconTrash,
  warning: IconAlertCircle,

  ...calendarIcons,
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
