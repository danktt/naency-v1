"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
import * as React from "react";

// Mapeamento de nomes de ícones para componentes
const ICON_MAP = {
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

// Lista de nomes de ícones disponíveis
const AVAILABLE_ICONS = Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>;

type IconName = keyof typeof ICON_MAP;

type IconSelectorProps = {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
};

export function IconSelector({
  value,
  onChange,
  className,
}: IconSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedIconName = value as IconName | undefined;
  const SelectedIcon = selectedIconName ? ICON_MAP[selectedIconName] : null;

  const filteredIcons = React.useMemo(() => {
    if (!searchQuery) return AVAILABLE_ICONS;
    const query = searchQuery.toLowerCase();
    return AVAILABLE_ICONS.filter((iconName) =>
      iconName.toLowerCase().replace("icon", "").includes(query),
    );
  }, [searchQuery]);

  const handleIconSelect = (iconName: IconName) => {
    onChange(iconName);
    setOpen(false);
    setSearchQuery("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn("w-fit justify-start", className)}
        >
          {SelectedIcon ? (
            <SelectedIcon className="mr-2 h-4 w-4" />
          ) : (
            <span>Selecione um ícone</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="start">
        <div className="p-3 border-b">
          <Input
            placeholder="Buscar ícone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-9"
          />
        </div>
        <div className="p-2 max-h-[300px] overflow-y-auto">
          <div className="grid grid-cols-6 gap-2">
            {filteredIcons.map((iconName) => {
              const IconComponent = ICON_MAP[iconName];
              const isSelected = selectedIconName === iconName;

              return (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => handleIconSelect(iconName)}
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-md border transition-colors hover:bg-accent hover:text-accent-foreground",
                    isSelected && "border-primary bg-primary/10 text-primary",
                  )}
                  title={iconName.replace("Icon", "")}
                >
                  <IconComponent className="h-5 w-5" />
                </button>
              );
            })}
          </div>
          {filteredIcons.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Nenhum ícone encontrado
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
