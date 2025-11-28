"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { BankAccount } from "./types";

type DeleteAccountDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  account: BankAccount | null;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteAccountDialog({
  open,
  onOpenChange,
  account,
  onConfirm,
  isLoading,
}: DeleteAccountDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Excluir conta</AlertDialogTitle>
          <AlertDialogDescription>
            Essa ação não pode ser desfeita. Você realmente deseja excluir a
            conta{" "}
            <span className="font-medium">{account?.name ?? "esta conta"}</span>
            ?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel asChild>
            <Button
              variant="outline"
              disabled={isLoading}
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              Excluir
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
