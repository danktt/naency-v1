"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { Icon } from "@/components/iconMap";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
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
import { IconChevronDown, IconChevronRight } from "@tabler/icons-react";
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
  subcategories?: Array<{ id: string; name: string }>;
  isChild?: boolean;
  hasChildren?: boolean;
  isExpanded?: boolean;
  hasTransactions?: boolean;
  isHighlighted?: boolean;
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
  subcategories = [],
  isChild = false,
  hasChildren = false,
  isExpanded = false,
  hasTransactions = false,
  isHighlighted = false,
  onToggle,
  onEdit,
  onDelete,
  onRestore,
  onCreateSubcategory,
  onDuplicate,
  onMove,
  isProcessing = false,
}: CategoryRowProps) {
  const rowRef = React.useRef<HTMLDivElement>(null);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = React.useState(false);
  const [pendingAction, setPendingAction] = React.useState<
    "delete" | "restore" | "archive" | null
  >(null);

  const isParent = !isChild;
  const canEdit = !(isChild && !category.is_active);

  // Scroll e focus na subcategoria recém-criada
  React.useEffect(() => {
    if (isHighlighted && rowRef.current) {
      rowRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    }
  }, [isHighlighted]);

  const handleDeleteOrRestore = () => {
    if (isChild) {
      // Para subcategorias, sempre mostrar modal
      setPendingAction(category.is_active ? "delete" : "restore");
      setIsConfirmDialogOpen(true);
    } else {
      // Para categorias principais, mostrar modal ao arquivar ou desarquivar
      if (category.is_active && onDelete) {
        setPendingAction("archive");
        setIsConfirmDialogOpen(true);
      } else if (!category.is_active && onRestore) {
        // Se tem filhos, mostrar modal de confirmação
        if (hasChildren && subcategories.length > 0) {
          setPendingAction("restore");
          setIsConfirmDialogOpen(true);
        } else {
          // Se não tem filhos, desarquivar diretamente
          onRestore();
        }
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
        ref={rowRef}
        className={cn(
          "group flex flex-col md:grid w-full md:grid-cols-[1fr_120px_100px_50px] rounded-lg gap-2 md:gap-4 px-3 py-3 md:px-4 items-start md:items-center transition-all hover:bg-muted/50  relative",
          isChild && "bg-muted/30",
          !category.is_active && "opacity-50",
          isHighlighted &&
            "animate-highlight ring-2 ring-primary/50 bg-primary/10",
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
          {isParent && (
            <div
              className={cn(
                "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                isParent ? "bg-muted" : "bg-transparent",
              )}
            >
              {category.icon && <Icon iconName={category.icon} />}
            </div>
          )}
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
                    onClick={(e) => {
                      if (isProcessing || !canEdit || !category.is_active) {
                        e.preventDefault();
                        return;
                      }
                      onEdit();
                    }}
                    disabled={isProcessing || !canEdit || !category.is_active}
                    className={cn(
                      "gap-2",
                      (isProcessing || !canEdit || !category.is_active) &&
                        "cursor-not-allowed",
                    )}
                  >
                    <DynamicIcon icon="edit" />
                    Editar
                  </DropdownMenuItem>
                )}
                {isParent && onCreateSubcategory && (
                  <DropdownMenuItem
                    onClick={(e) => {
                      if (isProcessing || !category.is_active) {
                        e.preventDefault();
                        return;
                      }
                      onCreateSubcategory();
                    }}
                    disabled={isProcessing || !category.is_active}
                    className={cn(
                      "gap-2 text-nowrap",
                      (isProcessing || !category.is_active) &&
                        "cursor-not-allowed",
                    )}
                  >
                    <DynamicIcon icon="add" />
                    Adicionar subcategoria
                  </DropdownMenuItem>
                )}

                {(onDelete || onRestore) && (
                  <>
                    {(onEdit ||
                      (isParent && onCreateSubcategory) ||
                      onDuplicate ||
                      onMove) && <DropdownMenuSeparator />}
                    <DropdownMenuItem
                      onClick={handleDeleteOrRestore}
                      disabled={isProcessing}
                      variant={category.is_active ? "destructive" : "default"}
                      className="gap-2 "
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

        {/* Desktop Actions - Icons with Tooltips (appear on hover) */}
        <div className="hidden md:flex items-center gap-1 justify-center">
          {/* Editar */}
          {onEdit && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-muted-foreground hover:text-foreground",
                    "opacity-0 translate-x-2 transition-all duration-150 ease-out",
                    "group-hover:opacity-100 group-hover:translate-x-0",
                  )}
                  onClick={onEdit}
                  disabled={isProcessing || !canEdit || !category.is_active}
                >
                  <DynamicIcon icon="edit" />
                  <span className="sr-only">Editar</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {!category.is_active
                  ? "Não é possível editar categoria arquivada"
                  : !canEdit
                    ? "Não é possível editar subcategoria inativa"
                    : isChild
                      ? "Editar subcategoria"
                      : "Editar categoria"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Arquivar/Desarquivar */}
          {(onDelete || onRestore) && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    category.is_active
                      ? "text-muted-foreground hover:text-destructive"
                      : "text-muted-foreground hover:text-foreground",
                    "opacity-0 translate-x-2 transition-all duration-150 ease-out",
                    "group-hover:opacity-100 group-hover:translate-x-0 group-hover:delay-[50ms]",
                  )}
                  onClick={handleDeleteOrRestore}
                  disabled={isProcessing}
                >
                  <DynamicIcon
                    icon={category.is_active ? "archive" : "restore"}
                  />
                  <span className="sr-only">
                    {category.is_active ? "Arquivar" : "Desarquivar"}
                  </span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {category.is_active ? "Arquivar" : "Desarquivar"}
              </TooltipContent>
            </Tooltip>
          )}

          {/* Adicionar subcategoria */}
          {isParent && onCreateSubcategory && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-primary/50 dark:hover:bg-primary/30 transition-all duration-300",
                    "opacity-0 translate-x-2 transition-all ease-out",
                    "group-hover:opacity-100 group-hover:translate-x-0 group-hover:delay-[100ms]",
                  )}
                  onClick={onCreateSubcategory}
                  disabled={isProcessing || !category.is_active}
                >
                  <DynamicIcon icon="add" />
                  <span className="sr-only">Adicionar subcategoria</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {!category.is_active
                  ? "Não é possível adicionar subcategoria em categoria arquivada"
                  : "Adicionar subcategoria"}
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Dialog de confirmação para arquivar/ativar/desativar */}
      <AlertDialog
        open={isConfirmDialogOpen}
        onOpenChange={setIsConfirmDialogOpen}
      >
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction === "archive"
                ? "Arquivar categoria?"
                : pendingAction === "delete"
                  ? "Arquivar subcategoria?"
                  : isChild
                    ? "Desarquivar subcategoria?"
                    : "Desarquivar categoria?"}
            </AlertDialogTitle>
            <div className="text-muted-foreground text-sm space-y-3">
              {pendingAction === "archive" &&
              hasChildren &&
              subcategories.length > 0 ? (
                <>
                  <p>
                    Tem certeza que deseja arquivar a categoria{" "}
                    <strong>"{category.name}"</strong>?
                  </p>
                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-left">
                    <p className="text-sm font-medium">
                      As seguintes subcategorias também serão arquivadas:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {subcategories.map((subcategory) => (
                        <li key={subcategory.id}>{subcategory.name}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> Os lançamentos feitos com essas
                    categorias anteriormente não serão alterados. Apenas novas
                    transações não poderão usar categorias arquivadas.
                  </p>
                </>
              ) : pendingAction === "archive" ? (
                <>
                  <p>
                    Tem certeza que deseja arquivar a categoria{" "}
                    <strong>"{category.name}"</strong>? Ela ficará oculta mas
                    não será excluída.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> Os lançamentos feitos com essa
                    categoria anteriormente não serão alterados. Apenas novas
                    transações não poderão usar categorias arquivadas.
                  </p>
                </>
              ) : pendingAction === "delete" ? (
                <>
                  <p>
                    Tem certeza que deseja arquivar a subcategoria{" "}
                    <strong>"{category.name}"</strong>?
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> Os lançamentos feitos com essa
                    subcategoria anteriormente não serão alterados. Apenas novas
                    transações não poderão usar subcategorias arquivadas.
                  </p>
                </>
              ) : pendingAction === "restore" &&
                hasChildren &&
                subcategories.length > 0 ? (
                <>
                  <p>
                    Tem certeza que deseja desarquivar a categoria{" "}
                    <strong>"{category.name}"</strong>?
                  </p>
                  <div className="rounded-md bg-muted/50 p-3 space-y-2 text-left">
                    <p className="text-sm font-medium">
                      As seguintes subcategorias também serão desarquivadas:
                    </p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {subcategories.map((subcategory) => (
                        <li key={subcategory.id}>{subcategory.name}</li>
                      ))}
                    </ul>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    <strong>Importante:</strong> Os lançamentos feitos com essas
                    categorias anteriormente não serão alterados. As categorias
                    desarquivadas poderão ser usadas em novas transações.
                  </p>
                </>
              ) : (
                <p>
                  Tem certeza que deseja desarquivar{" "}
                  {isChild ? "a subcategoria" : "a categoria"}{" "}
                  <strong>"{category.name}"</strong>?
                </p>
              )}
            </div>
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
