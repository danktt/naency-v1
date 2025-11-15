"use client";

import { IconAlertTriangle, IconCopy } from "@tabler/icons-react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";

import type { CopyFormValues, PeriodValue, SelectOption } from "./types";

type CopyFromPreviousButtonProps = {
  selectedPeriod: PeriodValue;
  selectedPeriodLabel: string;
  monthOptions: SelectOption[];
  yearOptions: SelectOption[];
};

export function CopyFromPreviousButton({
  selectedPeriod,
  selectedPeriodLabel,
  monthOptions,
  yearOptions,
}: CopyFromPreviousButtonProps) {
  const { t } = useTranslation("provisions");
  const utils = trpc.useUtils();
  const [isCopyDialogOpen, setCopyDialogOpen] = React.useState(false);
  const [targetHasData, setTargetHasData] = React.useState(false);

  const copyForm = useForm<CopyFormValues>({
    defaultValues: {
      month: String(selectedPeriod.month),
      year: String(selectedPeriod.year),
      overwrite: false,
    },
  });

  const watchedMonth = copyForm.watch("month");
  const watchedYear = copyForm.watch("year");

  React.useEffect(() => {
    setTargetHasData(false);
    copyForm.clearErrors("overwrite");
  }, [watchedMonth, watchedYear, copyForm]);

  React.useEffect(() => {
    if (isCopyDialogOpen) {
      return;
    }
    copyForm.reset({
      month: String(selectedPeriod.month),
      year: String(selectedPeriod.year),
      overwrite: false,
    });
    setTargetHasData(false);
  }, [copyForm, isCopyDialogOpen, selectedPeriod.month, selectedPeriod.year]);

  const copyMutation = trpc.provisions.copyFromPrevious.useMutation({
    onSuccess: async (_data, variables) => {
      toast.success(t("toasts.copySuccess"));
      await Promise.all([
        utils.provisions.grid.invalidate({ period: selectedPeriod }),
        utils.provisions.grid.invalidate({ period: variables.to }),
        utils.provisions.metrics.invalidate(selectedPeriod),
        utils.provisions.metrics.invalidate(variables.to),
      ]);
      setCopyDialogOpen(false);
    },
    onError: () => {
      toast.error(t("toasts.copyError"));
    },
  });

  const checkTargetHasData = React.useCallback(
    async (target: PeriodValue) => {
      try {
        const data = await utils.provisions.grid.fetch({ period: target });
        if (!data?.rows?.length) {
          return false;
        }
        return data.rows.some((row) => row.planned !== 0);
      } catch {
        return false;
      }
    },
    [utils.provisions.grid],
  );

  const handleCopySubmit = copyForm.handleSubmit(async (values) => {
    const targetPeriod = {
      month: Number(values.month),
      year: Number(values.year),
    };
    try {
      const hasData = await checkTargetHasData(targetPeriod);
      setTargetHasData(hasData);
      if (hasData && !values.overwrite) {
        copyForm.setError("overwrite", {
          type: "manual",
          message: t("copyDialog.overwriteWarning"),
        });
        return;
      }
      copyForm.clearErrors("overwrite");
      await copyMutation.mutateAsync({
        from: selectedPeriod,
        to: targetPeriod,
        overwrite: values.overwrite,
      });
    } catch {
      // erros já tratados no mutation
    }
  });

  return (
    <Dialog open={isCopyDialogOpen} onOpenChange={setCopyDialogOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <IconCopy stroke={1.5} />
          {t("header.copyButtonTitle")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("copyDialog.title")}</DialogTitle>
          <DialogDescription>
            {t("copyDialog.description", { monthLabel: selectedPeriodLabel })}
          </DialogDescription>
        </DialogHeader>
        <Form {...copyForm}>
          <form onSubmit={handleCopySubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={copyForm.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("copyDialog.targetMonthLabel")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {monthOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={copyForm.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("copyDialog.targetYearLabel")}</FormLabel>
                    <FormControl>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger className="w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {yearOptions.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={copyForm.control}
              name="overwrite"
              render={({ field }) => (
                <FormItem>
                  <div className="flex flex-row items-center space-x-3 space-y-0 rounded-md border p-4">
                    <FormControl>
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(checked) => {
                          field.onChange(Boolean(checked));
                          copyForm.clearErrors("overwrite");
                        }}
                      />
                    </FormControl>
                    <div className="space-y-1 leading-none">
                      <FormLabel>{t("copyDialog.overwriteLabel")}</FormLabel>
                    </div>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />

            {targetHasData ? (
              <Alert variant="destructive">
                <IconAlertTriangle className="text-destructive" />
                <AlertTitle>{t("copyDialog.overwriteLabel")}</AlertTitle>
                <AlertDescription>
                  {t("copyDialog.overwriteWarning")}
                </AlertDescription>
              </Alert>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCopyDialogOpen(false)}
                disabled={copyMutation.isPending}
              >
                {t("copyDialog.cancel")}
              </Button>
              <Button type="submit" disabled={copyMutation.isPending}>
                {copyMutation.isPending
                  ? t("rowActions.saving")
                  : t("copyDialog.submit")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
