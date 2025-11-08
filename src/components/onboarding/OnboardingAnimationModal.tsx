"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowRight } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, ChevronLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { formatCentsBRL, parseCurrencyToCents } from "@/helpers/formatCurrency";
import { trpc } from "@/lib/trpc/client";
import { Form } from "../ui/form";

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

const createInitialCategorySelection = (): CategorySelectionMap => {
  const initialSelection: CategorySelectionMap = {};

  for (const category of DEFAULT_CATEGORY_TEMPLATES) {
    const parentKey = createCategoryKey(category.name);
    initialSelection[parentKey] = true;

    if (category.children?.length) {
      for (const child of category.children) {
        initialSelection[createCategoryKey(child.name, category.name)] = true;
      }
    }
  }

  return initialSelection;
};

const getPreviousStep = (current: Step): Step | null => {
  const currentIndex = steps.indexOf(current);
  return currentIndex > 0 ? steps[currentIndex - 1] : null;
};

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
  const [accountName, setAccountName] = useState("");
  const [accountType, setAccountType] = useState<AccountType>("checking");
  const [initialBalance, setInitialBalance] = useState("0");
  const [selectedDefaultCategories, setSelectedDefaultCategories] =
    useState<CategorySelectionMap>(() => createInitialCategorySelection());
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>(
    [],
  );
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryType, setNewCategoryType] = useState<"expense" | "income">(
    "expense",
  );
  const [newCategoryColor, setNewCategoryColor] = useState(
    CATEGORY_DEFAULT_COLOR_BY_TYPE.expense,
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
        // eslint-disable-next-line no-console
        console.error("Failed to fetch financial group", error);
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
    setAccountName("");
    setAccountType("checking");
    setInitialBalance("0");
    setSelectedDefaultCategories(createInitialCategorySelection());
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

  const handleStartSetup = () => {
    setErrorMessage(null);
    goToStep("account", 1);
  };

  const handleCreateAccount = async () => {
    setErrorMessage(null);
    const parsedBalanceCents = parseCurrencyToCents(initialBalance);

    if (parsedBalanceCents < 0) {
      setErrorMessage("Informe um saldo inicial válido.");
      return;
    }

    if (!accountName.trim()) {
      setErrorMessage("Informe o nome da conta.");
      return;
    }

    try {
      await createAccount({
        name: accountName.trim(),
        type: accountType,
        initialBalance: parsedBalanceCents,
      });

      goToStep("categories", 1);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta. Tente novamente.",
      );
    }
  };

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
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("Erro ao finalizar onboarding:", error);
    }
  };

  const goToPreviousStep = () => {
    const prev = getPreviousStep(currentStep);
    if (prev) {
      goToStep(prev, -1);
    }
  };

  const toggleParentCategory = (
    category: CategoryTemplate,
    checked: boolean,
  ) => {
    setSelectedDefaultCategories((previous) => {
      const next = { ...previous };
      const parentKey = createCategoryKey(category.name);
      next[parentKey] = checked;

      if (category.children?.length) {
        for (const child of category.children) {
          next[createCategoryKey(child.name, category.name)] = checked;
        }
      }

      return next;
    });
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
                    className="w-full h-full min-w-[400px] max-w-[400px]"
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
                        variant="outline"
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

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Nome da conta</Label>
                        <Input
                          id="accountName"
                          placeholder="Ex: Nubank"
                          value={accountName}
                          onChange={(event) =>
                            setAccountName(event.target.value)
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="accountType">Tipo</Label>
                        <Select
                          value={accountType}
                          onValueChange={(value) =>
                            setAccountType(value as AccountType)
                          }
                        >
                          <SelectTrigger id="accountType" className="w-full">
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="checking">
                              Conta corrente
                            </SelectItem>
                            <SelectItem value="credit">
                              Cartão de crédito
                            </SelectItem>
                            <SelectItem value="investment">
                              Investimento
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="initialBalance">Saldo inicial</Label>
                        <Input
                          id="initialBalance"
                          inputMode="numeric"
                          placeholder="R$ 0,00"
                          value={formatCentsBRL(Number(initialBalance ?? 0))}
                          onChange={(e) => {
                            const cents = parseCurrencyToCents(e.target.value);
                            setInitialBalance(cents.toString());
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentStep === "categories" && (
                  <motion.div
                    ref={categoriesRef}
                    key="categories-step"
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

                    <ScrollArea className="max-h-[420px]">
                      <div className="space-y-6 pr-4">
                        <div className="grid gap-4">
                          {DEFAULT_CATEGORY_TEMPLATES.map((category) => {
                            const parentKey = createCategoryKey(category.name);
                            const isParentSelected = Boolean(
                              selectedDefaultCategories[parentKey],
                            );

                            return (
                              <Card
                                key={parentKey}
                                className="border border-border/70 bg-background shadow-none"
                              >
                                <CardHeader className="gap-4 pb-2">
                                  <div className="flex flex-col gap-2">
                                    <div className="flex items-start gap-3">
                                      <Checkbox
                                        id={`category-${parentKey}`}
                                        checked={isParentSelected}
                                        onCheckedChange={(checked) =>
                                          toggleParentCategory(
                                            category,
                                            Boolean(checked),
                                          )
                                        }
                                      />
                                      <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2 text-base">
                                          <span
                                            aria-hidden="true"
                                            className="inline-flex size-2.5 rounded-full"
                                            style={{
                                              backgroundColor: category.color,
                                            }}
                                          />
                                          {category.name}
                                        </CardTitle>
                                        <CardDescription>
                                          {category.type === "expense"
                                            ? "Despesa"
                                            : "Receita"}{" "}
                                          ·{" "}
                                          {(category.children?.length ?? 0) > 0
                                            ? `${
                                                category.children?.length ?? 0
                                              } subcategorias`
                                            : "Sem subcategorias"}
                                        </CardDescription>
                                      </div>
                                    </div>
                                  </div>
                                </CardHeader>
                                {category.children?.length ? (
                                  <CardContent className="space-y-2 pt-0">
                                    {category.children.map((child) => {
                                      const childKey = createCategoryKey(
                                        child.name,
                                        category.name,
                                      );
                                      const isChildSelected = Boolean(
                                        selectedDefaultCategories[childKey],
                                      );

                                      return (
                                        <label
                                          key={childKey}
                                          htmlFor={`category-${childKey}`}
                                          className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border/70 bg-muted/40 px-4 py-2 text-sm"
                                        >
                                          <div className="flex items-center gap-3">
                                            <Checkbox
                                              id={`category-${childKey}`}
                                              checked={isChildSelected}
                                              onCheckedChange={(checked) =>
                                                toggleChildCategory(
                                                  category,
                                                  child,
                                                  Boolean(checked),
                                                )
                                              }
                                            />
                                            <span>{child.name}</span>
                                          </div>
                                          <Badge
                                            variant="outline"
                                            className="text-xs font-medium"
                                          >
                                            {child.type === "expense"
                                              ? "Despesa"
                                              : "Receita"}
                                          </Badge>
                                        </label>
                                      );
                                    })}
                                  </CardContent>
                                ) : null}
                              </Card>
                            );
                          })}
                        </div>

                        <div className="space-y-4 rounded-lg border border-dashed border-border/70 bg-muted/20 p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <h3 className="text-sm font-medium">
                              Adicionar categorias personalizadas
                            </h3>
                            {customCategories.length > 0 ? (
                              <Badge variant="secondary" className="text-xs">
                                {customCategories.length} adicionada
                                {customCategories.length > 1 ? "s" : ""}
                              </Badge>
                            ) : null}
                          </div>
                          <div className="grid gap-3 sm:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                            <Input
                              placeholder="Nome da categoria"
                              value={newCategoryName}
                              onChange={(event) =>
                                setNewCategoryName(event.target.value)
                              }
                            />
                            <Select
                              value={newCategoryType}
                              onValueChange={(value: "expense" | "income") => {
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
                                <SelectItem value="expense">Despesa</SelectItem>
                                <SelectItem value="income">Receita</SelectItem>
                              </SelectContent>
                            </Select>
                            <div className="flex items-center gap-2 rounded-md border border-border/70 bg-background px-3">
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
                              variant="secondary"
                              className="w-full sm:w-auto"
                              onClick={handleAddCustomCategory}
                            >
                              <Plus className="size-4" />
                              Adicionar
                            </Button>
                          </div>

                          {customCategories.length > 0 ? (
                            <div className="flex flex-wrap gap-2">
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
                          ) : null}
                        </div>
                      </div>
                    </ScrollArea>
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
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </Form>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
