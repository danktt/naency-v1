"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { Icon } from "@/components/iconMap";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  IconChevronDown,
  IconChevronRight,
  IconPencil,
  IconTrash,
} from "@tabler/icons-react";
import * as React from "react";

type CategoryRowProps = {
  category: {
    id: string;
    name: string;
    type: "expense" | "income";
    color: string | null;
    icon: string | null;
    is_active: boolean;
    childrenCount?: number;
  };
  isChild?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggle?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onRestore?: () => void;
  onCreateSubcategory?: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  isProcessing?: boolean;
};

export function CategoryRow({
  category,
  isChild = false,
  hasChildren = false,
  isExpanded = false,
  onToggle,
  onEdit,
  onDelete,
  onRestore,
  onCreateSubcategory,
  onDuplicate,
  onMove,
  isProcessing = false,
}: CategoryRowProps) {
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<
    "delete" | "restore" | "archive" | null
  >(null);

  const isParent = !isChild;
  const canEdit = !(isChild && !category.is_active);

  const handleDeleteOrRestore = () => {
    if (isChild) {
      // Para subcategorias, sempre mostrar modal
      setPendingAction(category.is_active ? "delete" : "restore");
      setIsConfirmDialogOpen(true);
    } else {
      // Para categorias principais, mostrar modal ao arquivar
      if (category.is_active && onDelete) {
        setPendingAction("archive");
        setIsConfirmDialogOpen(true);
      } else if (!category.is_active && onRestore) {
        // Desarquivar pode ser direto ou com modal, vou deixar direto por enquanto
        onRestore();
      }
    }
  };

  const confirmAction = () => {
    if (pendingAction === "delete" && onDelete) {
      onDelete();
    } else if (pendingAction === "restore" && onRestore) {
      onRestore();
    } else if (pendingAction === "archive" && onDelete) {
      onDelete();
    }
    setIsConfirmDialogOpen(false);
    setPendingAction(null);
  };

  const handleToggle = () => {
    if (hasChildren && onToggle) {
      onToggle();
    }
  };

  return (
    <TooltipProvider delayDuration={300}>
      <div
        className={cn(
          "group flex flex-col md:grid w-full md:grid-cols-[1fr_120px_100px_50px] rounded-lg gap-2 md:gap-4 px-3 py-3 md:px-4 items-start md:items-center transition-colors hover:bg-muted/50 relative",
          isChild && "bg-muted/10",
          !category.is_active && "opacity-50",
        )}
      >
        {/* Category Name & Main Info */}
        <div
          className={cn("flex items-center gap-2 md:gap-3 w-full md:w-auto")}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={handleToggle}
              className={cn(
                "flex h-8 w-8 cursor-pointer md:h-6 md:w-6 shrink-0 items-center justify-center rounded-md hover:bg-muted transition-colors",
                isProcessing && "opacity-50 cursor-not-allowed",
              )}
              disabled={isProcessing}
            >
              <div className="relative h-4 w-4">
                <IconChevronRight
                  className={cn(
                    "absolute h-4 w-4 text-muted-foreground transition-all duration-200",
                    isExpanded
                      ? "rotate-90 opacity-0 scale-75"
                      : "rotate-0 opacity-100 scale-100",
                  )}
                />
                <IconChevronDown
                  className={cn(
                    "absolute h-4 w-4 text-muted-foreground transition-all duration-200",
                    isExpanded
                      ? "rotate-0 opacity-100 scale-100"
                      : "-rotate-90 opacity-0 scale-75",
                  )}
                />
              </div>
            </button>
          ) : (
            <div className="w-8 md:w-6 shrink-0" />
          )}

          <div
            className={cn(
              "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
              isParent ? "bg-muted" : "bg-transparent",
            )}
          >
            {category.icon && <Icon iconName={category.icon} />}
          </div>

          <div className="flex flex-col min-w-0 flex-1 ml-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground truncate">
                {category.name}
              </span>
              {!category.is_active && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1 py-0 border-muted-foreground/40 text-muted-foreground md:hidden"
                >
                  Inativa
                </Badge>
              )}
            </div>
            {hasChildren && (
              <span className="text-xs text-left text-muted-foreground truncate">
                {category.childrenCount ?? 0}{" "}
                {category.childrenCount === 1
                  ? "subcategoria"
                  : "subcategorias"}
              </span>
            )}
          </div>

          {/* Quick Actions - Desktop Only */}
          {(isParent || isChild) && (
            <div className="hidden md:flex items-center gap-1 ml-2">
              {isParent && onCreateSubcategory && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      className={cn(
                        "h-7 w-7 ",
                        "opacity-0 -translate-x-2 transition-all duration-150 ease-out",
                        "group-hover:opacity-100 group-hover:translate-x-0",
                        "group-hover:delay-0",
                      )}
                      onClick={onCreateSubcategory}
                      disabled={isProcessing}
                      icon={<DynamicIcon icon="add" />}
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Adicionar subcategoria</p>
                  </TooltipContent>
                </Tooltip>
              )}
              {onEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-muted",
                        "opacity-0 -translate-x-2 transition-all duration-150 ease-out",
                        "group-hover:opacity-100 group-hover:translate-x-0",
                        isParent && onCreateSubcategory
                          ? "group-hover:delay-[50ms]"
                          : "group-hover:delay-0",
                      )}
                      onClick={onEdit}
                      disabled={isProcessing || !canEdit}
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>
                      {!canEdit
                        ? "Não é possível editar subcategoria inativa"
                        : isChild
                          ? "Editar subcategoria"
                          : "Editar categoria"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          )}

          {/* Mobile Actions Dropdown Trigger - Always Visible */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  disabled={isProcessing}
                  icon={<DynamicIcon icon="dots-vertical" />}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-fit">
                {onEdit && (
                  <DropdownMenuItem
                    onClick={onEdit}
                    disabled={isProcessing || !canEdit}
                    className="gap-2 cursor-pointer"
                  >
                    <DynamicIcon icon="edit" />
                    Editar
                  </DropdownMenuItem>
                )}
                {isParent && onCreateSubcategory && (
                  <DropdownMenuItem
                    onClick={onCreateSubcategory}
                    disabled={isProcessing}
                    className="gap-2 cursor-pointer text-nowrap"
                  >
                    <DynamicIcon icon="add" />
                    Adicionar subcategoria
                  </DropdownMenuItem>
                )}

                {(onDelete || onRestore) && (
                  <>
                    {(onEdit ||
                      onCreateSubcategory ||
                      onDuplicate ||
                      onMove) && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={handleDeleteOrRestore}
                      disabled={isProcessing}
                      variant={category.is_active ? "destructive" : "default"}
                      className="gap-2 cursor-pointer"
                    >
                      {category.is_active ? (
                        <>
                          <DynamicIcon icon="archive" />
                          Arquivar
                        </>
                      ) : (
                        <>
                          <DynamicIcon icon="restore" />
                          Desarquivar
                        </>
                      )}
                    </DropdownMenuItem>
                  </>
                )}
                {onDelete && category.is_active && (
                  <DropdownMenuItem
                    onClick={onDelete}
                    disabled={isProcessing}
                    variant="destructive"
                    className="gap-2 cursor-pointer text-destructive"
                  >
                    <DynamicIcon icon="trash" />
                    Excluir
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Status Badge */}
        <div className="hidden md:block ">
          <Badge
            variant="secondary"
            className={cn(
              "text-xs font-medium ",
              category.is_active
                ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                : "bg-gray-500/20 text-gray-400 hover:bg-gray-500/30",
            )}
          >
            {category.is_active ? "Ativa" : "Inativa"}
          </Badge>
        </div>

        {/* Desktop Actions Dropdown */}
        <div className="hidden md:flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                disabled={isProcessing}
              >
                <DynamicIcon icon="dots-vertical" />
                <span className="sr-only">Mais ações</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {onEdit && (
                <DropdownMenuItem
                  onClick={onEdit}
                  disabled={isProcessing || !canEdit}
                  className="gap-2 cursor-pointer"
                >
                  <DynamicIcon icon="edit" />
                  Editar
                </DropdownMenuItem>
              )}
              {isParent && onCreateSubcategory && (
                <DropdownMenuItem
                  onClick={onCreateSubcategory}
                  disabled={isProcessing}
                  className="gap-2 cursor-pointer"
                >
                  <DynamicIcon icon="add" />
                  Adicionar subcategoria
                </DropdownMenuItem>
              )}

              {(onDelete || onRestore) && (
                <>
                  {(onEdit || onCreateSubcategory || onDuplicate || onMove) && (
                    <DropdownMenuSeparator />
                  )}
                  <DropdownMenuItem
                    onClick={handleDeleteOrRestore}
                    disabled={isProcessing}
                    variant={category.is_active ? "destructive" : "default"}
                    className="gap-2 cursor-pointer"
                  >
                    {category.is_active ? (
                      <>
                        <DynamicIcon icon="archive" />
                        Arquivar
                      </>
                    ) : (
                      <>
                        <DynamicIcon icon="restore" />
                        Desarquivar
                      </>
                    )}
                  </DropdownMenuItem>
                </>
              )}
              {onDelete && category.is_active && (
                <DropdownMenuItem
                  onClick={onDelete}
                  disabled={isProcessing}
                  variant="destructive"
                  className="gap-2 cursor-pointer text-destructive"
                >
                  <IconTrash className="h-4 w-4" />
                  Excluir
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Dialog de confirmação para arquivar/ativar/desativar */}
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "archive"
                ? "Arquivar categoria?"
                : pendingAction === "delete"
                  ? "Arquivar subcategoria?"
                  : "Desarquivar subcategoria?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction === "archive"
                ? `Tem certeza que deseja arquivar a categoria "${category.name}"? Ela ficará oculta mas não será excluída.`
                : pendingAction === "delete"
                  ? `Tem certeza que deseja desativar a subcategoria "${category.name}"?`
                  : `Tem certeza que deseja ativar a subcategoria "${category.name}"?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setIsConfirmDialogOpen(false);
                setPendingAction(null);
              }}
              disabled={isProcessing}
            >
              Cancelar
            </AlertDialogCancel>
            <Button
              onClick={confirmAction}
              disabled={isProcessing}
              variant={
                pendingAction === "delete" || pendingAction === "archive"
                  ? "destructive"
                  : "default"
              }
              isLoading={isProcessing}
            >
              {pendingAction === "restore" ? "Desarquivar" : "Arquivar"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}
