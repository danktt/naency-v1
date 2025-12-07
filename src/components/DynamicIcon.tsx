"use client";

import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBuildingBank,
  IconCalendarEvent,
  IconCalendarMonth,
  IconCalendarWeek,
  IconCheck,
  IconMoon,
  IconReceipt,
  IconRepeat,
  IconSun,
} from "@tabler/icons-react";
import type { ReactElement } from "react";

interface DynamicIconProps {
  icon: IconName;
  className?: string;
  size?: number;
  stroke?: number;
}

const calendarIcons = {
  "calendar-day": IconCalendarEvent,
  "calendar-week": IconCalendarWeek,
  "calendar-month": IconCalendarMonth,
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
