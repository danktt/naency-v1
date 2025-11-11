import { useUser } from "@clerk/nextjs";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { DEFAULT_CATEGORY_TEMPLATES } from "@/config/defaultCategories";
import { trpc } from "@/lib/trpc/client";

export const steps = ["welcome", "account", "categories", "final"] as const;
export type Step = (typeof steps)[number];

export const formSchema = z.object({
  name: z.string().min(1, "Nome da conta é obrigatório"),
  type: z.enum(["checking", "credit", "investment"]),
  initialBalance: z.number().min(0, "Saldo inicial é obrigatório"),
});

export function useOnboardingController() {
  const { user, isLoaded, isSignedIn } = useUser();
  const queryClient = useQueryClient();

  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [isOpen, setIsOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const { mutateAsync: getOrCreateGroup, isPending: isCheckingGroup } =
    trpc.financialGroups.getOrCreate.useMutation();

  const { mutateAsync: completeOnboarding } =
    trpc.financialGroups.completeOnboarding.useMutation();

  const { mutateAsync: createAccount, isPending: isCreatingAccount } =
    trpc.accounts.create.useMutation();

  const { mutateAsync: importCategories, isPending: isImportingCategories } =
    trpc.categories.importDefaults.useMutation();

  const [financialGroup, setFinancialGroup] = useState<any>(null);
  const userId = user?.id ?? null;

  const goToStep = (step: Step) => setCurrentStep(step);

  const fetchGroup = async () => {
    if (!userId) return;
    const result = await getOrCreateGroup({
      email: user?.primaryEmailAddress?.emailAddress,
      name: user?.fullName ?? user?.firstName ?? "Usuário",
    });
    setFinancialGroup(result);
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) fetchGroup();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isCheckingGroup && financialGroup) {
      setIsOpen(!financialGroup.onboardingCompleted);
    }
  }, [isCheckingGroup, financialGroup]);

  const handleCreateAccount = async (values: z.infer<typeof formSchema>) => {
    setErrorMessage(null);
    try {
      await createAccount(values);
      goToStep("categories");
    } catch (error) {
      setErrorMessage("Não foi possível criar a conta.");
    }
  };

  const handleImportCategories = async (payload: any) => {
    setErrorMessage(null);
    try {
      await importCategories({ overwrite: true, categories: payload });
      goToStep("final");
    } catch (error) {
      setErrorMessage("Erro ao importar categorias.");
    }
  };

  const handleFinish = async () => {
    await completeOnboarding();
    await queryClient.invalidateQueries({ queryKey: ["financialGroups"] });
    setIsOpen(false);
  };

  return {
    currentStep,
    goToStep,
    isOpen,
    setIsOpen,
    handleCreateAccount,
    handleImportCategories,
    handleFinish,
    isCreatingAccount,
    isImportingCategories,
    isCheckingGroup,
    errorMessage,
    setErrorMessage,
    user,
  };
}
