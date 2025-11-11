"use client";

import { IconArrowRight, IconChevronLeft } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_CATEGORY_TEMPLATES } from "@/config/defaultCategories";

export function StepCategories({
  onNext,
  onBack,
  isLoading,
}: {
  onNext: (categories: any[]) => Promise<void>;
  onBack: () => void;
  isLoading: boolean;
}) {
  const handleFinish = async () => {
    await onNext(DEFAULT_CATEGORY_TEMPLATES);
  };

  return (
    <div className="max-w-[640px] space-y-6">
      <DialogHeader>
        <DialogTitle>Categorias recomendadas</DialogTitle>
        <DialogDescription>
          Você pode revisar e ajustar suas categorias depois no painel.
        </DialogDescription>
      </DialogHeader>

      <div className="rounded-lg border bg-muted/10 p-4 text-sm text-muted-foreground">
        <p>{DEFAULT_CATEGORY_TEMPLATES.length} categorias serão importadas.</p>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={onBack}>
          <IconChevronLeft className="mr-2 size-4" />
          Voltar
        </Button>
        <Button type="button" onClick={handleFinish} disabled={isLoading}>
          {isLoading ? "Concluindo..." : "Concluir"}
          <IconArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
