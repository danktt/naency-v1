"use client";

import * as React from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc/client";

type ImportDefaultsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function ImportDefaultsDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportDefaultsDialogProps) {
  const [overwrite, setOverwrite] = React.useState(false);
  const utils = trpc.useUtils();

  const importMutation = trpc.categories.importDefaults.useMutation({
    onSuccess: async (data) => {
      if (data.skipped) {
        toast.warning("Categorias já existem. Ative a opção de sobrescrever para importar.");
      } else {
        await utils.categories.list.invalidate();
        toast.success("Categorias importadas com sucesso.");
      }
      onOpenChange(false);
      setOverwrite(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error("Não foi possível importar as categorias.");
    },
  });

  const handleImport = () => {
    importMutation.mutate({ overwrite });
  };

  const isSubmitting = importMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Importar categorias padrão</DialogTitle>
          <DialogDescription>
            Importe categorias pré-definidas para começar rapidamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="overwrite"
              checked={overwrite}
              onCheckedChange={(checked) => setOverwrite(checked === true)}
            />
            <Label
              htmlFor="overwrite"
              className="text-sm font-normal leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Sobrescrever categorias existentes
            </Label>
          </div>
          {!overwrite && (
            <p className="text-sm text-muted-foreground">
              Isso excluirá todas as categorias existentes. Ative a opção de sobrescrever para continuar.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleImport} disabled={isSubmitting}>
            Importar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
