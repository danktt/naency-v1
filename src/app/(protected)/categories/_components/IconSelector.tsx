"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { ICON_MAP } from "@/components/iconMap";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import * as React from "react";

// Lista de nomes de ícones disponíveis
const AVAILABLE_ICONS = Object.keys(ICON_MAP) as Array<keyof typeof ICON_MAP>;

type IconName = keyof typeof ICON_MAP;

type IconSelectorProps = {
  value?: string;
  onChange: (iconName: string) => void;
  className?: string;
  hasError?: boolean;
  usedIcons?: string[];
  /** Ícone original da categoria sendo editada - permanece habilitado durante toda a edição */
  editingCategoryIcon?: string;
};

export function IconSelector({
  value,
  onChange,
  className,
  hasError,
  usedIcons = [],
  editingCategoryIcon,
}: IconSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");

  const selectedIconName = value as IconName | undefined;
  const SelectedIcon = selectedIconName ? ICON_MAP[selectedIconName] : null;

  // Exclui o ícone original da categoria sendo editada da lista de usados
  const usedIconsSet = React.useMemo(
    () => new Set(usedIcons.filter((icon) => icon !== editingCategoryIcon)),
    [usedIcons, editingCategoryIcon],
  );

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
      <PopoverTrigger
        asChild
        className={cn(
          "w-full ",
          hasError
            ? "ring-destructive/20 border-destructive dark:border-destructive"
            : "",
        )}
      >
        <Button
          type="button"
          size="icon"
          variant="outline"
          className={cn(className)}
        >
          {SelectedIcon ? (
            <SelectedIcon />
          ) : (
            <DynamicIcon
              icon="dots-horizontal"
              className="text-muted-foreground"
            />
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
        <TooltipProvider delayDuration={300}>
          <div className="p-2 max-h-[300px] overflow-y-auto">
            <div className="grid grid-cols-6 gap-2">
              {filteredIcons.map((iconName) => {
                const IconComponent = ICON_MAP[iconName];
                const isSelected = selectedIconName === iconName;
                const isUsed = usedIconsSet.has(iconName);

                const iconButton = (
                  <button
                    key={iconName}
                    type="button"
                    onClick={() => !isUsed && handleIconSelect(iconName)}
                    disabled={isUsed}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-md border transition-colors",
                      isSelected && "border-primary bg-primary/10 text-primary",
                      isUsed
                        ? "cursor-not-allowed opacity-50 bg-muted"
                        : "hover:bg-accent hover:text-accent-foreground",
                    )}
                    title={!isUsed ? iconName.replace("Icon", "") : undefined}
                  >
                    <IconComponent className="h-5 w-5" />
                    {isUsed && (
                      <div className="absolute -bottom-1 -right-1.5 flex size-3 items-center justify-center rounded-full bg-success/90 ">
                        <DynamicIcon
                          icon="check"
                          stroke={2}
                          className="size-2 text-white "
                        />
                      </div>
                    )}
                  </button>
                );

                if (isUsed) {
                  return (
                    <Tooltip key={iconName}>
                      <TooltipTrigger asChild>{iconButton}</TooltipTrigger>
                      <TooltipContent side="top">
                        <p>Este ícone já está em uso</p>
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return iconButton;
              })}
            </div>
            {filteredIcons.length === 0 && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                Nenhum ícone encontrado
              </div>
            )}
          </div>
        </TooltipProvider>
      </PopoverContent>
    </Popover>
  );
}
