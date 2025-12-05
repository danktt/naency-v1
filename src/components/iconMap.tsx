"use client";

import {
  IconBeach,
  IconBook,
  IconBuildingBank,
  IconBurger,
  IconCar,
  IconCategory,
  IconChartBar,
  IconChartPie,
  IconCoffee,
  IconCreditCard,
  IconCurrencyDollar,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconFileInvoice,
  IconGasStation,
  IconGift,
  IconHeart,
  IconHome,
  IconMedicalCross,
  IconMoodHappy,
  IconMoodSad,
  IconMovie,
  IconMusic,
  IconPlane,
  IconReceipt,
  IconSchool,
  IconShirt,
  IconShoppingBag,
  IconShoppingCart,
  IconStar,
  IconTag,
  IconTools,
  IconTransfer,
  IconTrendingDown,
  IconTrendingUp,
  IconWallet,
  IconWifi,
} from "@tabler/icons-react";
import type { ReactElement } from "react";

// Mapeamento de nomes de ícones para componentes
export const ICON_MAP = {
  IconCategory,
  IconWallet,
  IconCurrencyDollar,
  IconCreditCard,
  IconBuildingBank,
  IconTransfer,
  IconShoppingCart,
  IconHome,
  IconCar,
  IconPlane,
  IconMedicalCross,
  IconSchool,
  IconGift,
  IconChartBar,
  IconChartPie,
  IconTrendingUp,
  IconTrendingDown,
  IconReceipt,
  IconFileInvoice,
  IconShoppingBag,
  IconCoffee,
  IconMovie,
  IconMusic,
  IconHeart,
  IconBook,
  IconDeviceDesktop,
  IconDeviceMobile,
  IconWifi,
  IconGasStation,
  IconTools,
  IconShirt,
  IconBeach,
  IconMoodHappy,
  IconMoodSad,
  IconStar,
  IconTag,
  IconBurger,
} as const;

export function getIconComponent(iconName: string | null | undefined) {
  if (!iconName) return null;
  return ICON_MAP[iconName as keyof typeof ICON_MAP] ?? null;
}

export function Icon({
  iconName,
}: {
  iconName: string | null | undefined;
}): ReactElement | null {
  const IconComponent = getIconComponent(iconName);
  if (!IconComponent) return null;
  const Component = IconComponent as React.ComponentType<{
    className?: string;
    stroke?: number;
  }>;
  return <Component className="size-4" stroke={1.5} />;
}
