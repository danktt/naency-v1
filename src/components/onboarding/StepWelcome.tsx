import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StepWelcome({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-left space-y-6">
      <DialogHeader>
        <DialogTitle>Bem-vindo(a) ao seu controle financeiro!</DialogTitle>
        <DialogDescription>
          Vamos criar sua primeira conta e configurar as categorias.
        </DialogDescription>
      </DialogHeader>

      <div className="flex justify-end">
        <Button onClick={onNext}>
          Começar <IconArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
