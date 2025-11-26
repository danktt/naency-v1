"use client";

import { Button } from "@/components/ui/button";
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
import type { CreditCard } from "./types";

type DeleteCreditCardDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: CreditCard | null;
  onConfirm: () => void;
  isLoading: boolean;
};

export function DeleteCreditCardDialog({
  open,
  onOpenChange,
  card,
  onConfirm,
  isLoading,
}: DeleteCreditCardDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete credit card</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. Do you really want to delete the card{" "}
            <span className="font-medium">
              {card?.name ?? "this card"}
            </span>
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
              Cancel
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              variant="destructive"
              onClick={onConfirm}
              isLoading={isLoading}
            >
              Delete
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


