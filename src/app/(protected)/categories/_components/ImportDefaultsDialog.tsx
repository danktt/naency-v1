"use client";

import * as React from "react";
import { useTranslation } from "react-i18next";
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
  const { t, i18n } = useTranslation("categories");
  const [isMounted, setIsMounted] = React.useState(false);
  const [overwrite, setOverwrite] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  const fallbackT = React.useCallback(
    (key: string) => {
      const fallbackLng =
        (Array.isArray(i18n.options?.fallbackLng) &&
          i18n.options.fallbackLng[0]) ||
        (typeof i18n.options?.fallbackLng === "string"
          ? i18n.options.fallbackLng
          : "en");
      return i18n.getFixedT(fallbackLng, "categories")(key);
    },
    [i18n],
  );

  const translate = isMounted ? t : fallbackT;
  const utils = trpc.useUtils();

  const importMutation = trpc.categories.importDefaults.useMutation({
    onSuccess: async (data) => {
      if (data.skipped) {
        toast.warning(translate("toasts.importSkipped"));
      } else {
        await utils.categories.list.invalidate();
        toast.success(translate("toasts.importSuccess"));
      }
      onOpenChange(false);
      setOverwrite(false);
      onSuccess?.();
    },
    onError: () => {
      toast.error(translate("toasts.importError"));
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
          <DialogTitle>{translate("importDialog.title")}</DialogTitle>
          <DialogDescription>
            {translate("importDialog.description")}
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
              {translate("importDialog.overwriteLabel")}
            </Label>
          </div>
          {!overwrite && (
            <p className="text-sm text-muted-foreground">
              {translate("importDialog.overwriteWarning")}
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
            {translate("importDialog.cancel")}
          </Button>
          <Button type="button" onClick={handleImport} disabled={isSubmitting}>
            {translate("importDialog.submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
