"use client";

import { useUser } from "@clerk/nextjs";
import { zodResolver } from "@hookform/resolvers/zod";
import { IconArrowRight } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
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
  currency: "BRL" | "USD";
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

type ExtendedTrpc = typeof trpc & {
  accounts: {
    create: {
      useMutation: () => CreateAccountMutation;
    };
  };
};
const formSchema = z.object({
  name: z.string().min(1, "Nome da conta é obrigatório"),
  type: z.enum(["checking", "investment"]),
  initialBalance: z.number().min(0, "Saldo inicial é obrigatório"),
  currency: z.enum(["BRL", "USD"]),
});

const steps = ["welcome", "account", "final"] as const;
type Step = (typeof steps)[number];

const STEP_TITLES: Record<Step, string> = {
  welcome: "Bem-vindo(a) ao seu controle financeiro!",
  account: "Vamos configurar sua primeira conta",
  final: "Tudo pronto! Vamos começar.",
};

const STEP_DESCRIPTIONS: Partial<Record<Step, string>> = {
  welcome:
    "Comece criando sua conta bancária e configurando as categorias recomendadas para acelerar sua organização financeira.",
  final:
    "Sua conta inicial está configurada e você tem acesso às categorias recomendadas. Aproveite o seu dashboard para acompanhar de perto suas finanças.",
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
  const [accountWasCreated, setAccountWasCreated] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [initialBalance, setInitialBalance] = useState("0");

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

  const measureCurrentStep = () => {
    const currentRef =
      currentStep === "welcome"
        ? welcomeRef.current
        : currentStep === "account"
          ? accountRef.current
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
  }, [currentStep]);

  const contentChanged = useMemo(() => {
    return accountName + initialBalance;
  }, [accountName, initialBalance]);

  useEffect(() => {
    if (shouldMeasure) {
      measureCurrentStep();
    }
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
      .catch((_error) => {
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
    setErrorMessage(null);
  };

  const closeModal = () => {
    setIsOpen(false);
    setFinancialGroupResult((previous) =>
      previous ? { ...previous, wasCreated: false } : previous,
    );
    resetState();
  };

  type ValidatedAccountValues = {
    name: string;
    type: AccountType;
    initialBalance: number;
    currency: "BRL" | "USD";
  };

  const validateAccountForm = async (): Promise<
    | { ok: true; values: ValidatedAccountValues }
    | { ok: false; message: string }
  > => {
    const values = form.getValues();
    const trimmedName = values.name?.trim() ?? "";

    if (values.name !== trimmedName) {
      form.setValue("name", trimmedName, { shouldDirty: true });
    }

    if (!trimmedName) {
      form.setError("name", {
        type: "manual",
        message: "Informe o nome da conta.",
      });
      return { ok: false, message: "Informe o nome da conta." };
    }

    const isValid = await form.trigger([
      "name",
      "type",
      "initialBalance",
      "currency",
    ]);

    if (!isValid) {
      return {
        ok: false,
        message: "Corrija os dados da conta antes de continuar.",
      };
    }

    return {
      ok: true,
      values: {
        name: trimmedName,
        type: values.type,
        initialBalance: values.initialBalance,
        currency: values.currency,
      },
    };
  };

  const ensureAccountCreated = async (): Promise<
    | { status: "success" }
    | { status: "validation"; message: string }
    | { status: "error"; message: string }
  > => {
    const validation = await validateAccountForm();

    if (!validation.ok) {
      return { status: "validation", message: validation.message };
    }

    if (accountWasCreated) {
      setErrorMessage(null);
      return { status: "success" };
    }

    try {
      const payload: CreateAccountPayload = {
        ...validation.values,
        initialBalance: validation.values.initialBalance / 100,
      };

      await createAccount(payload);
      setAccountWasCreated(true);
      setErrorMessage(null);
      return { status: "success" };
    } catch (error) {
      return {
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível criar a conta. Tente novamente.",
      };
    }
  };

  const handleAccountStepContinue = async () => {
    const validation = await validateAccountForm();

    if (!validation.ok) {
      setErrorMessage(validation.message);
      return;
    }

    setErrorMessage(null);
    goToStep("final", 1);
  };

  const handleFinish = async () => {
    setErrorMessage(null);
    const accountResult = await ensureAccountCreated();

    if (accountResult.status !== "success") {
      setErrorMessage(accountResult.message);
      if (accountResult.status === "validation") {
        goToStep("account", -1);
      }
      return;
    }

    try {
      await completeOnboarding();
      setFinancialGroupResult((previous) =>
        previous ? { ...previous, onboardingCompleted: true } : previous,
      );
      queryClient.invalidateQueries({ queryKey: ["financialGroups"] });
      closeModal();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Não foi possível concluir o onboarding. Tente novamente.",
      );
    }
  };

  async function onSubmit(values: z.infer<typeof formSchema>) {
    try {
      const account = await createAccount({
        ...values,
        initialBalance: values.initialBalance / 100,
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
                        currencyName="currency"
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
                        disabled={isCreatingAccount}
                        isLoading={isCreatingAccount}
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
