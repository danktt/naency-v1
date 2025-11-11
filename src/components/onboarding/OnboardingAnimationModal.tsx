"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import type { CheckedState } from "@radix-ui/react-checkbox";
import { IconArrowRight } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type CategoryTemplate,
  DEFAULT_CATEGORY_TEMPLATES,
} from "@/config/defaultCategories";
import { formatCents } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { FieldCurrencyAmount } from "../FieldCurrencyAmount";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";

type AccountType = "checking" | "credit" | "investment";

type CreateAccountPayload = {
  name: string;
  type: AccountType;
  initialBalance: number;
  color?: string;
};

type CreatedAccount = {
  id: string;
  name: string;
  type: AccountType;
  group_id: string;
  initial_balance: string;
  color: string;
};

type FinancialGroupResult = {
  group: {
    id: string;
    name: string;
    owner_id: string;
  };
  wasCreated: boolean;
  onboardingCompleted: boolean;
};

type CreateAccountMutation = {
  mutateAsync: (input: CreateAccountPayload) => Promise<CreatedAccount>;
  isPending: boolean;
};

type CategoryImportPayload = Omit<CategoryTemplate, "children"> & {
  children?: CategoryImportPayload[];
};

type ImportCategoriesMutation = {
  mutateAsync: (input?: {
    overwrite?: boolean;
    categories?: CategoryImportPayload[];
  }) => Promise<{ inserted: number; skipped: boolean }>;
  isPending: boolean;
};

type ExtendedTrpc = typeof trpc & {
  accounts: {
    create: {
      useMutation: () => CreateAccountMutation;
    };
  };
  categories: {
    importDefaults: {
      useMutation: () => ImportCategoriesMutation;
    };
  };
};
const formSchema = z.object({
  name: z.string().min(1, "Nome da conta é obrigatório"),
  type: z.enum(["checking", "credit", "investment"]),
  initialBalance: z.number().min(0, "Saldo inicial é obrigatório"),
  currency: z.enum(["BRL", "USD"]),
});

const steps = ["welcome", "account", "categories", "final"] as const;
type Step = (typeof steps)[number];

const STEP_TITLES: Record<Step, string> = {
  welcome: "Bem-vindo(a) ao seu controle financeiro!",
  account: "Vamos configurar sua primeira conta",
  categories: "Categorias sugeridas",
  final: "Tudo pronto! Vamos começar.",
};

const STEP_DESCRIPTIONS: Partial<Record<Step, string>> = {
  welcome:
    "Comece criando sua conta bancária e configurando as categorias recomendadas para acelerar sua organização financeira.",
  categories:
    "Escolha as categorias sugeridas que fazem sentido para você ou adicione novas, personalizando sua organização desde o primeiro acesso.",
  final:
    "Sua conta inicial está configurada e você tem acesso às categorias recomendadas. Aproveite o seu dashboard para acompanhar de perto suas finanças.",
};

type CategorySelectionMap = Record<string, boolean>;

type CustomCategory = {
  id: string;
  name: string;
  type: "expense" | "income";
  color: string;
};

const CATEGORY_DEFAULT_ICON_BY_TYPE: Record<"expense" | "income", string> = {
  expense: "bookmark-minus",
  income: "wallet",
};

const CATEGORY_DEFAULT_COLOR_BY_TYPE: Record<"expense" | "income", string> = {
  expense: "#6366F1",
  income: "#22C55E",
};

const createCategoryKey = (name: string, parentName?: string) =>
  parentName ? `${parentName}::${name}` : name;

const createInitialCategorySelection = (
  checked = true,
): CategorySelectionMap => {
  const initialSelection: CategorySelectionMap = {};

  for (const category of DEFAULT_CATEGORY_TEMPLATES) {
    const parentKey = createCategoryKey(category.name);
    initialSelection[parentKey] = checked;

    if (category.children?.length) {
      for (const child of category.children) {
        initialSelection[createCategoryKey(child.name, category.name)] =
          checked;
      }
    }
  }

  return initialSelection;
};

const createInitialExpansionState = () => {
  const initialExpansion: Record<string, boolean> = {};

  for (const category of DEFAULT_CATEGORY_TEMPLATES) {
    const parentKey = createCategoryKey(category.name);
    initialExpansion[parentKey] = true;
  }

  return initialExpansion;
};

// Removed unused getPreviousStep helper

const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? "5%" : "-5%",
    filter: "blur(2px)",
    opacity: 0,
  }),
  center: {
    x: 0,
    filter: "blur(0px)",
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? "5%" : "-5%",
    filter: "blur(2px)",
    opacity: 0,
  }),
};

const transition = {
  type: "spring" as const,
  stiffness: 300,
  damping: 30,
};

export default function OnboardingAnimationModal() {
  const { user, isLoaded, isSignedIn } = useUser();
  const [currentStep, setCurrentStep] = useState<Step>("welcome");
  const [isOpen, setIsOpen] = useState(false);
  const [accountWasCreated, setAccountWasCreated] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");
  const [selectedDefaultCategories, setSelectedDefaultCategories] =
    useState<CategorySelectionMap>(() => createInitialCategorySelection());
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >(() => createInitialExpansionState());
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"expense" | "income">(
    "expense",
  );
  const [newCategoryColor, setNewCategoryColor] = useState(
    CATEGORY_DEFAULT_COLOR_BY_TYPE.expense,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const categorySelectionMetrics = useMemo(() => {
    let total = 0;
    let selected = 0;

    for (const category of DEFAULT_CATEGORY_TEMPLATES) {
      const parentKey = createCategoryKey(category.name);
      total += 1;
      if (selectedDefaultCategories[parentKey]) {
        selected += 1;
      }

      if (category.children?.length) {
        for (const child of category.children) {
          const childKey = createCategoryKey(child.name, category.name);
          total += 1;
          if (selectedDefaultCategories[childKey]) {
            selected += 1;
          }
        }
      }
    }

    return {
      total,
      selected,
    };
  }, [selectedDefaultCategories]);
  const { total: totalDefaultsCount, selected: selectedDefaultsCount } =
    categorySelectionMetrics;
  const customCategoriesCount = customCategories.length;
  const fetchedUserIdRef = useRef<string | null>(null);
  const queryClient = useQueryClient();
  const [financialGroupResult, setFinancialGroupResult] =
    useState<FinancialGroupResult | null>(null);

  // Animation state/refs
  const [direction, setDirection] = useState(0);
  const [contentHeight, setContentHeight] = useState<number | "auto">("auto");
  const [contentWidth, setContentWidth] = useState<number | "auto">("auto");
  const [shouldAnimateHeight, setShouldAnimateHeight] = useState(false);
  const [shouldAnimateWidth, setShouldAnimateWidth] = useState(false);
  const [shouldMeasure, setShouldMeasure] = useState(true);

  const welcomeRef = useRef<HTMLDivElement>(null);
  const accountRef = useRef<HTMLDivElement>(null);
  const categoriesRef = useRef<HTMLDivElement>(null);
  const finalRef = useRef<HTMLDivElement>(null);

  const extendedTrpc = trpc as ExtendedTrpc;

  const { mutateAsync: getOrCreateGroup, isPending: isCheckingFinancialGroup } =
    trpc.financialGroups.getOrCreate.useMutation();
  const { mutateAsync: completeOnboarding } =
    trpc.financialGroups.completeOnboarding.useMutation();

  const userId = user?.id ?? null;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "Usuário";

  const { mutateAsync: createAccount, isPending: isCreatingAccount } =
    extendedTrpc.accounts.create.useMutation();

  const { mutateAsync: importCategories, isPending: isImportingCategories } =
    extendedTrpc.categories.importDefaults.useMutation();

  const measureCurrentStep = () => {
    const currentRef =
      currentStep === "welcome"
        ? welcomeRef.current
        : currentStep === "account"
          ? accountRef.current
          : currentStep === "categories"
            ? categoriesRef.current
            : finalRef.current;

    if (currentRef) {
      setContentHeight(currentRef.offsetHeight);
      setContentWidth(currentRef.offsetWidth);
    }
  };

  const onAnimationComplete = () => {
    setShouldMeasure(true);
    measureCurrentStep();
  };
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      type: "checking",
      initialBalance: 0,
      currency: "BRL",
    },
    mode: "onChange",
  });
  useEffect(() => {
    setShouldMeasure(true);
    const initialTimer = setTimeout(() => {
      measureCurrentStep();
    }, 50);
    return () => clearTimeout(initialTimer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const contentChanged = useMemo(() => {
    return accountName + initialBalance + customCategories.length;
  }, [accountName, initialBalance, customCategories.length]);

  useEffect(() => {
    if (shouldMeasure) {
      measureCurrentStep();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMeasure, contentChanged]);

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setShouldAnimateHeight(true);
        setShouldAnimateWidth(true);
        measureCurrentStep();
      }, 200);
      return () => clearTimeout(timer);
    } else {
      setShouldAnimateHeight(false);
      setShouldAnimateWidth(false);
      setContentHeight("auto");
      setContentWidth("auto");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const motionDivProps = {
    custom: direction,
    variants: slideVariants,
    initial: "enter",
    animate: "center",
    exit: "exit",
    transition,
    tabIndex: -1,
    style: { outline: "none" },
    onAnimationComplete,
  };

  const goToStep = (targetStep: Step, newDirection: 1 | -1) => {
    setDirection(newDirection);
    setCurrentStep(targetStep);
  };

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      fetchedUserIdRef.current = null;
      setFinancialGroupResult(null);
      return;
    }

    if (fetchedUserIdRef.current === userId) {
      return;
    }

    let isActive = true;
    fetchedUserIdRef.current = userId;
    setFinancialGroupResult(null);
    resetState();

    getOrCreateGroup({
      email: userEmail ?? undefined,
      name: userName,
    })
      .then((result) => {
        if (!isActive) return;
        setFinancialGroupResult(result);
      })
      .catch((error) => {
        if (!isActive) return;
        fetchedUserIdRef.current = null;
        setFinancialGroupResult(null);
      });

    return () => {
      isActive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOrCreateGroup, isLoaded, isSignedIn, userId, userEmail, userName]);

  const shouldDisplayModal = useMemo(() => {
    if (!isLoaded || !isSignedIn || isCheckingFinancialGroup) {
      return false;
    }
    return Boolean(
      financialGroupResult && !financialGroupResult.onboardingCompleted,
    );
  }, [financialGroupResult, isLoaded, isSignedIn, isCheckingFinancialGroup]);

  useEffect(() => {
    setIsOpen(shouldDisplayModal);
  }, [shouldDisplayModal]);

  const resetState = () => {
    setCurrentStep("welcome");
    setAccountWasCreated(false);
    setAccountName("");
    setInitialBalance("0");
    setSelectedDefaultCategories(createInitialCategorySelection());
    setExpandedCategories(createInitialExpansionState());
    setCustomCategories([]);
    setNewCategoryName("");
    setNewCategoryType("expense");
    setNewCategoryColor(CATEGORY_DEFAULT_COLOR_BY_TYPE.expense);
    setErrorMessage(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setFinancialGroupResult((previous) =>
      previous ? { ...previous, wasCreated: false } : previous,
    );
    resetState();
  };

  const handleAccountStepContinue = async () => {
    setErrorMessage(null);
    if (accountWasCreated) {
      goToStep("categories", 1);
      return;
    }
    const values = form.getValues();
    const trimmedName = values.name?.trim() ?? "";

    if (!trimmedName) {
      setErrorMessage("Informe o nome da conta.");
      return;
    }

    if (values.initialBalance < 0) {
      setErrorMessage("Informe um saldo inicial válido.");
      return;
    }

    try {
      await createAccount({
        name: trimmedName,
        type: values.type,
        initialBalance: values.initialBalance,
      });

      setAccountWasCreated(true);
      goToStep("categories", 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta. Tente novamente.",
      );
    }
  };

  // Handlers for categories and finishing are below

  const getSelectedCategoriesPayload = (): CategoryImportPayload[] => {
    const payload: CategoryImportPayload[] = [];

    for (const category of DEFAULT_CATEGORY_TEMPLATES) {
      const parentKey = createCategoryKey(category.name);
      const isParentSelected = Boolean(selectedDefaultCategories[parentKey]);

      const selectedChildren =
        category.children
          ?.filter(
            (child) =>
              selectedDefaultCategories[
                createCategoryKey(child.name, category.name)
              ],
          )
          .map<CategoryImportPayload>((child) => ({
            name: child.name,
            type: child.type,
            color: child.color,
            icon: child.icon,
          })) ?? [];

      if (!isParentSelected && selectedChildren.length === 0) {
        continue;
      }

      payload.push({
        name: category.name,
        type: category.type,
        color: category.color,
        icon: category.icon,
        children: selectedChildren.length > 0 ? selectedChildren : undefined,
      });
    }

    for (const customCategory of customCategories) {
      payload.push({
        name: customCategory.name,
        type: customCategory.type,
        color: customCategory.color,
        icon: CATEGORY_DEFAULT_ICON_BY_TYPE[customCategory.type],
      });
    }

    return payload;
  };

  const handleCompleteOnboarding = async () => {
    setErrorMessage(null);
    try {
      const categoriesPayload = getSelectedCategoriesPayload();
      if (categoriesPayload.length > 0) {
        await importCategories({
          overwrite: true,
          categories: categoriesPayload,
        });
      }
      goToStep("final", 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir a importação. Tente novamente.",
      );
    }
  };

  const handleFinish = async () => {
    try {
      await completeOnboarding();
      setFinancialGroupResult((previous) =>
        previous ? { ...previous, onboardingCompleted: true } : previous,
      );
      queryClient.invalidateQueries({ queryKey: ["financialGroups"] });
      closeModal();
    } catch (error) {}
  };

  // Navigation helpers handled inline with goToStep

  const toggleCategoryExpansion = (categoryKey: string) => {
    setExpandedCategories((previous) => ({
      ...previous,
      [categoryKey]: !(previous[categoryKey] ?? true),
    }));
  };

  const toggleParentCategory = (
    category: CategoryTemplate,
    checked: boolean,
  ) => {
    const parentKey = createCategoryKey(category.name);
    setSelectedDefaultCategories((previous) => {
      const next = { ...previous };
      next[parentKey] = checked;

      if (category.children?.length) {
        for (const child of category.children) {
          next[createCategoryKey(child.name, category.name)] = checked;
        }
      }

      return next;
    });
    if (checked) {
      setExpandedCategories((previous) => ({
        ...previous,
        [parentKey]: true,
      }));
    }
  };

  const toggleChildCategory = (
    category: CategoryTemplate,
    child: CategoryTemplate,
    checked: boolean,
  ) => {
    setSelectedDefaultCategories((previous) => {
      const next = { ...previous };
      const parentKey = createCategoryKey(category.name);
      const childKey = createCategoryKey(child.name, category.name);

      next[childKey] = checked;

      if (checked) {
        next[parentKey] = true;
      } else {
        const siblings = category.children?.filter(
          (current) => current.name !== child.name,
        );
        const hasSelectedSibling = siblings?.some(
          (sibling) => previous[createCategoryKey(sibling.name, category.name)],
        );

        if (!hasSelectedSibling && !previous[parentKey]) {
          next[parentKey] = false;
        }
      }

      return next;
    });
  };

  const handleAddCustomCategory = () => {
    const trimmedName = newCategoryName.trim();

    if (!trimmedName) {
      setErrorMessage("Informe o nome da categoria personalizada.");
      return;
    }

    setErrorMessage(null);

    const id =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2);

    setCustomCategories((previous) => [
      ...previous,
      {
        id,
        name: trimmedName,
        type: newCategoryType,
        color: newCategoryColor,
      },
    ]);

    setNewCategoryName("");
    setNewCategoryColor(CATEGORY_DEFAULT_COLOR_BY_TYPE[newCategoryType]);
  };

  const handleRemoveCustomCategory = (categoryId: string) => {
    setCustomCategories((previous) =>
      previous.filter((category) => category.id !== categoryId),
    );
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const account = await createAccount({
        ...values,
      });

      if (account && "error" in account) {
        throw new Error("Failed to create account");
      }

      toast.success("Conta criada com sucesso");
      closeModal();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Erro ao criar conta",
      );
    }
  }

  if (!isOpen) {
    return null;
  }

  const stepTitle = STEP_TITLES[currentStep];
  const stepDescription = STEP_DESCRIPTIONS[currentStep];
  const greetingMessage = user?.firstName
    ? `Olá, ${user.firstName}!`
    : "Olá! Estamos felizes em tê-lo(a) por aqui.";

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(newOpen) => {
        setIsOpen(newOpen);
        if (!newOpen) {
          // Reset when closed
          setTimeout(() => {
            setCurrentStep("welcome");
            setShouldAnimateHeight(false);
            setContentHeight("auto");
            setShouldAnimateWidth(false);
            setContentWidth("auto");
          }, 300);
        }
      }}
    >
      <DialogContent
        showCloseButton={false}
        className={`w-auto max-w-none overflow-hidden outline-none`}
        onFocus={(e) => e.currentTarget.blur()}
        style={{ outline: "none" }}
      >
        <motion.div
          layout
          initial={{ height: "auto", width: "auto" }}
          animate={{ height: contentHeight, width: contentWidth }}
          transition={{
            height: shouldAnimateHeight
              ? { type: "spring" as const, stiffness: 300, damping: 30 }
              : { duration: 0 },
            width: shouldAnimateWidth
              ? { type: "spring" as const, stiffness: 300, damping: 30 }
              : { duration: 0 },
          }}
        >
          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-6 outline-none"
            >
              <AnimatePresence
                custom={direction}
                initial={false}
                mode="wait"
                onExitComplete={() => {
                  setTimeout(() => {
                    setShouldMeasure(true);
                    measureCurrentStep();
                  }, 10);
                }}
              >
                {currentStep === "welcome" && (
                  <motion.div
                    ref={welcomeRef}
                    key="welcome-step"
                    {...motionDivProps}
                    className="w-full h-full max-w-[400px]"
                    onAnimationComplete={onAnimationComplete}
                  >
                    <DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        {greetingMessage}
                      </p>
                      <DialogTitle>
                        Bem-vindo(a) ao seu controle financeiro!
                      </DialogTitle>
                    </DialogHeader>
                    <div className="mt-6 ">
                      <p className="text-sm text-muted-foreground">
                        Comece criando sua conta bancária e configurando as
                        categorias recomendadas para acelerar sua organização
                        financeira.
                      </p>
                    </div>
                    <div className="mt-6 flex justify-end">
                      <Button
                        type="button"
                        onClick={() => goToStep("account", 1)}
                        className="group"
                      >
                        Começar{" "}
                        <IconArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === "account" && (
                  <motion.div
                    ref={accountRef}
                    key="account-step"
                    {...motionDivProps}
                    className="w-full h-full  max-w-[500px]"
                    onAnimationComplete={onAnimationComplete}
                  >
                    <DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        {greetingMessage}
                      </p>
                      <DialogTitle>
                        Vamos configurar sua primeira conta bancária
                      </DialogTitle>
                    </DialogHeader>
                    <div className="my-6 space-y-6">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nome da conta</FormLabel>
                            <FormControl>
                              <Input
                                autoComplete="off"
                                placeholder="Ex: Nubank, Bradesco, Itaú, etc."
                                value={field.value ?? ""}
                                onChange={(event) => {
                                  setAccountName(event.target.value);
                                  field.onChange(event.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FieldCurrencyAmount
                        control={form.control}
                        amountName="initialBalance"
                        currencyName="initialBalance"
                        label="Saldo inicial"
                      />
                      <FormField
                        control={form.control}
                        name="type"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de conta</FormLabel>
                            <FormControl>
                              <Select
                                value={field.value}
                                onValueChange={field.onChange}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="checking">
                                    Conta bancária
                                  </SelectItem>
                                  <SelectItem value="credit">
                                    Cartão de crédito
                                  </SelectItem>
                                  <SelectItem value="investment">
                                    Conta de investimento
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="mt-6 flex justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToStep("welcome", -1)}
                        className="group"
                      >
                        Voltar{" "}
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAccountStepContinue}
                        className="group"
                        disabled={isCreatingAccount}
                      >
                        {isCreatingAccount ? (
                          "Salvando..."
                        ) : (
                          <>
                            Próximo{" "}
                            <IconArrowRight className="size-4 group-hover:translate-x-1 transition-transform duration-300" />
                          </>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}

                {currentStep === "categories" && (
                  <motion.div
                    ref={categoriesRef}
                    key="categories-step"
                    {...motionDivProps}
                    className="w-full h-full max-w-[720px]"
                    onAnimationComplete={onAnimationComplete}
                  >
                    <DialogHeader className="space-y-2 text-left">
                      <p className="text-sm text-muted-foreground">
                        {greetingMessage}
                      </p>
                      <DialogTitle className="text-xl font-semibold">
                        {stepTitle}
                      </DialogTitle>
                      {stepDescription ? (
                        <DialogDescription>{stepDescription}</DialogDescription>
                      ) : null}
                    </DialogHeader>

                    <ScrollArea className="mt-6">
                      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/60 bg-muted/30 px-4 py-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-foreground">
                            Personalize a organização das suas finanças
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Selecione as categorias sugeridas ou crie novas de
                            acordo com a sua realidade.
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="rounded-full px-3 py-1 text-xs font-medium"
                          >
                            {selectedDefaultsCount}/{totalDefaultsCount}{" "}
                            sugestões ativas
                          </Badge>
                          <Badge
                            variant="outline"
                            className="rounded-full px-3 py-1 text-xs font-medium"
                          >
                            {customCategoriesCount} personalizadas
                          </Badge>
                        </div>
                      </div>

                      <div className="mt-6 max-h-[420px] pr-4">
                        <div className="space-y-5">
                          {DEFAULT_CATEGORY_TEMPLATES.map((category) => {
                            const parentKey = createCategoryKey(category.name);
                            const children = category.children ?? [];
                            const selectedChildrenCount = children.reduce(
                              (accumulator, child) =>
                                accumulator +
                                (selectedDefaultCategories[
                                  createCategoryKey(child.name, category.name)
                                ]
                                  ? 1
                                  : 0),
                              0,
                            );
                            const totalChildren = children.length;
                            const isParentSelected = Boolean(
                              selectedDefaultCategories[parentKey],
                            );
                            const isParentIndeterminate =
                              totalChildren > 0 &&
                              selectedChildrenCount > 0 &&
                              selectedChildrenCount < totalChildren;
                            const parentChecked: CheckedState = isParentSelected
                              ? true
                              : isParentIndeterminate
                                ? "indeterminate"
                                : false;
                            const isExpanded =
                              expandedCategories[parentKey] ?? true;

                            return (
                              <Card
                                key={parentKey}
                                className={cn(
                                  "relative overflow-hidden rounded-2xl border transition-all duration-200",
                                  isParentSelected || isParentIndeterminate
                                    ? "border-primary/60 bg-primary/5 shadow-sm"
                                    : "border-border/60 hover:border-border/80",
                                )}
                              >
                                {isParentSelected ? (
                                  <span className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-primary/60 via-primary to-primary/60" />
                                ) : null}
                                <CardHeader className="space-y-4 pb-0">
                                  <div className="flex flex-wrap items-start justify-between gap-4">
                                    <div className="flex items-start gap-3">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          toggleParentCategory(
                                            category,
                                            parentChecked !== true,
                                          )
                                        }
                                        className={cn(
                                          "flex h-11 w-11 items-center justify-center rounded-xl border text-sm font-semibold uppercase transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                                          isParentSelected ||
                                            isParentIndeterminate
                                            ? "border-primary/60 bg-primary/10 text-primary"
                                            : "border-border/60 bg-muted text-muted-foreground hover:border-border",
                                        )}
                                        aria-label={
                                          parentChecked === true
                                            ? `Remover ${category.name}`
                                            : `Selecionar ${category.name}`
                                        }
                                      >
                                        {category.name.slice(0, 2)}
                                      </button>
                                      <div className="space-y-2">
                                        <div className="flex flex-wrap items-center gap-2">
                                          <CardTitle className="text-base font-semibold leading-tight">
                                            {category.name}
                                          </CardTitle>
                                          <Badge
                                            variant="outline"
                                            className="rounded-full text-[11px] uppercase tracking-wide"
                                          >
                                            {category.type === "expense"
                                              ? "Despesa"
                                              : "Receita"}
                                          </Badge>
                                          {totalChildren > 0 ? (
                                            <Badge
                                              variant="secondary"
                                              className="rounded-full text-[11px]"
                                            >
                                              {selectedChildrenCount}/
                                              {totalChildren} subcategorias
                                            </Badge>
                                          ) : null}
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                          {totalChildren > 0
                                            ? `Inclui ${totalChildren} subcategorias sugeridas para começar.`
                                            : "Sem subcategorias no momento. Adicione as suas abaixo."}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        id={`category-${parentKey}`}
                                        checked={parentChecked}
                                        onCheckedChange={(checked) =>
                                          toggleParentCategory(
                                            category,
                                            checked === true,
                                          )
                                        }
                                        aria-label={`Selecionar ${category.name} e suas subcategorias`}
                                      />
                                      {totalChildren > 0 ? (
                                        <Button
                                          type="button"
                                          size="icon"
                                          variant="ghost"
                                          onClick={() =>
                                            toggleCategoryExpansion(parentKey)
                                          }
                                          aria-label={
                                            isExpanded
                                              ? `Recolher subcategorias de ${category.name}`
                                              : `Expandir subcategorias de ${category.name}`
                                          }
                                        >
                                          <ChevronDown
                                            className={cn(
                                              "size-4 transition-transform",
                                              isExpanded ? "rotate-180" : "",
                                            )}
                                          />
                                        </Button>
                                      ) : null}
                                    </div>
                                  </div>
                                </CardHeader>
                                {totalChildren > 0 && isExpanded ? (
                                  <CardContent className="pt-4">
                                    <div className="flex flex-wrap gap-2">
                                      {children.map((child) => {
                                        const childKey = createCategoryKey(
                                          child.name,
                                          category.name,
                                        );
                                        const isChildSelected = Boolean(
                                          selectedDefaultCategories[childKey],
                                        );
                                        const childClasses = cn(
                                          "group flex items-center justify-between gap-3 rounded-full border px-3 py-2 text-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
                                          isChildSelected
                                            ? "border-primary/60 bg-primary/10 text-primary shadow-sm"
                                            : "border-border/60 hover:border-border/80",
                                        );

                                        return (
                                          <button
                                            key={childKey}
                                            type="button"
                                            className={childClasses}
                                            onClick={() =>
                                              toggleChildCategory(
                                                category,
                                                child,
                                                !isChildSelected,
                                              )
                                            }
                                            aria-pressed={isChildSelected}
                                          >
                                            <span className="flex items-center gap-2">
                                              <span
                                                aria-hidden="true"
                                                className="inline-flex h-2.5 w-2.5 rounded-full"
                                                style={{
                                                  backgroundColor: child.color,
                                                }}
                                              />
                                              {child.name}
                                            </span>
                                            <Badge
                                              variant={
                                                isChildSelected
                                                  ? "default"
                                                  : "outline"
                                              }
                                              className={cn(
                                                "rounded-full text-[11px]",
                                                isChildSelected
                                                  ? "bg-primary text-primary-foreground"
                                                  : "",
                                              )}
                                            >
                                              {child.type === "expense"
                                                ? "Despesa"
                                                : "Receita"}
                                            </Badge>
                                          </button>
                                        );
                                      })}
                                    </div>
                                  </CardContent>
                                ) : null}
                              </Card>
                            );
                          })}

                          <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5">
                            <div className="flex flex-wrap items-start justify-between gap-3">
                              <div className="space-y-1">
                                <h3 className="text-sm font-semibold text-foreground">
                                  Crie suas próprias categorias
                                </h3>
                                <p className="text-xs text-muted-foreground">
                                  Personalize receitas e despesas específicas do
                                  seu estilo de vida.
                                </p>
                              </div>
                              {customCategoriesCount > 0 ? (
                                <Badge
                                  variant="secondary"
                                  className="rounded-full text-xs font-medium"
                                >
                                  {customCategoriesCount} adicionada
                                  {customCategoriesCount > 1 ? "s" : ""}
                                </Badge>
                              ) : null}
                            </div>
                            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                              <Input
                                placeholder="Nome da categoria"
                                value={newCategoryName}
                                onChange={(event) =>
                                  setNewCategoryName(event.target.value)
                                }
                              />
                              <Select
                                value={newCategoryType}
                                onValueChange={(
                                  value: "expense" | "income",
                                ) => {
                                  setNewCategoryType(value);
                                  setNewCategoryColor(
                                    CATEGORY_DEFAULT_COLOR_BY_TYPE[value],
                                  );
                                }}
                              >
                                <SelectTrigger className="w-full">
                                  <SelectValue placeholder="Tipo" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="expense">
                                    Despesa
                                  </SelectItem>
                                  <SelectItem value="income">
                                    Receita
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-background px-3">
                                <span className="text-xs text-muted-foreground">
                                  Cor
                                </span>
                                <Input
                                  type="color"
                                  className="h-9 w-12 border-0 bg-transparent px-0"
                                  value={newCategoryColor}
                                  onChange={(event) =>
                                    setNewCategoryColor(event.target.value)
                                  }
                                />
                              </div>
                              <Button
                                type="button"
                                className="w-full sm:w-auto"
                                onClick={handleAddCustomCategory}
                              >
                                <Plus className="mr-2 size-4" />
                                Adicionar
                              </Button>
                            </div>
                            {customCategoriesCount > 0 ? (
                              <div className="mt-4 flex flex-wrap gap-2">
                                {customCategories.map((category) => (
                                  <Badge
                                    key={category.id}
                                    variant="outline"
                                    className="flex items-center gap-2 rounded-full px-3 py-1 text-xs"
                                  >
                                    <span
                                      aria-hidden="true"
                                      className="inline-flex size-2.5 rounded-full"
                                      style={{
                                        backgroundColor: category.color,
                                      }}
                                    />
                                    <span>{category.name}</span>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      onClick={() =>
                                        handleRemoveCustomCategory(category.id)
                                      }
                                      aria-label={`Remover ${category.name}`}
                                    >
                                      <Trash2 className="size-3.5" />
                                    </Button>
                                  </Badge>
                                ))}
                              </div>
                            ) : (
                              <p className="mt-4 text-xs text-muted-foreground">
                                Nenhuma categoria personalizada adicionada
                                ainda.
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </ScrollArea>

                    <div className="mt-6 flex flex-wrap gap-2 justify-between">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => goToStep("account", -1)}
                        className="group"
                      >
                        <ChevronLeft className="size-4 mr-1" />
                        Voltar
                      </Button>
                      <div className="ml-auto flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => goToStep("final", 1)}
                          className="group"
                        >
                          Pular
                        </Button>
                        <Button
                          type="button"
                          onClick={handleCompleteOnboarding}
                          className="group"
                          disabled={isImportingCategories}
                        >
                          {isImportingCategories ? "Concluindo..." : "Concluir"}{" "}
                          {!isImportingCategories ? (
                            <IconArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                          ) : null}
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === "final" && (
                  <motion.div
                    ref={finalRef}
                    key="final-step"
                    {...motionDivProps}
                  >
                    <DialogHeader className="space-y-2 text-left">
                      <p className="text-sm text-muted-foreground">
                        {greetingMessage}
                      </p>
                      <DialogTitle className="text-xl font-semibold">
                        {stepTitle}
                      </DialogTitle>
                      {stepDescription ? (
                        <DialogDescription>{stepDescription}</DialogDescription>
                      ) : null}
                    </DialogHeader>

                    <div className="text-center py-8">
                      <p className="text-lg font-medium text-foreground">
                        Parabéns! Você concluiu a configuração inicial.
                      </p>
                      <p className="text-muted-foreground">
                        Suas finanças estão prontas para serem organizadas.
                      </p>
                    </div>
                    <div className="mt-2 flex justify-end">
                      <Button
                        type="button"
                        onClick={handleFinish}
                        className="group"
                      >
                        Ir para dashboard{" "}
                        <IconArrowRight className="size-4 ml-1 group-hover:translate-x-1 transition-transform duration-300" />
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {errorMessage ? (
                <Alert variant="destructive">
                  <AlertDescription>{errorMessage}</AlertDescription>
                </Alert>
              ) : null}
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
