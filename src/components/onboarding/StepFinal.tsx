import { IconArrowRight } from "@tabler/icons-react";
import { Button } from "@/components/ui/button";
import {
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function StepFinal({
  onFinish,
  user,
}: {
  onFinish: () => void;
  user?: any;
}) {
  const name = user?.firstName ?? "";

  return (
    <div className="text-left space-y-8 max-w-[420px]">
      <DialogHeader>
        <DialogTitle>Tudo pronto, {name || "usuário"}!</DialogTitle>
        <DialogDescription>
          Você concluiu sua configuração inicial. Agora é só começar a registrar
          suas finanças.
        </DialogDescription>
      </DialogHeader>

      <div className="text-center space-y-2">
        <p className="text-lg font-medium text-foreground">Parabéns! 🚀</p>
        <p className="text-muted-foreground">
          Seu controle financeiro está pronto.
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={onFinish}>
          Ir para dashboard
          <IconArrowRight className="ml-2 size-4" />
        </Button>
      </div>
    </div>
  );
}
