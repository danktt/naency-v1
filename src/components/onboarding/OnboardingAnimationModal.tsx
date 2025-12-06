"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { useUser } from "@clerk/nextjs";
import { IconTableFilled } from "@tabler/icons-react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  CreditCard,
  PartyPopper,
  Rocket,
  Shield,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

// Types for TRPC integration
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

type FinancialGroupResult = {
  group: {
    id: string;
    name: string;
    owner_id: string;
  };
  wasCreated: boolean;
  onboardingCompleted: boolean;
};

interface AccountData {
  name: string;
  balance: string;
  type: "checking" | "investment" | "";
}

const CardPreview = ({
  accountData,
  displayBalance,
}: {
  accountData: AccountData;
  displayBalance: string;
}) => (
  <div className="relative w-full max-w-xs perspective-1000 mx-auto">
    {/* Glowing orbs */}
    <motion.div
      className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-gradient-to-br from-primary/30 to-accent/20 blur-3xl"
      animate={{
        scale: [1, 1.2, 1],
        opacity: [0.5, 0.8, 0.5],
      }}
      transition={{
        duration: 4,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
      }}
    />
    <motion.div
      className="absolute -bottom-8 -left-8 h-32 w-32 rounded-full bg-gradient-to-tr from-accent/20 to-primary/30 blur-3xl"
      animate={{
        scale: [1.2, 1, 1.2],
        opacity: [0.3, 0.6, 0.3],
      }}
      transition={{
        duration: 5,
        repeat: Number.POSITIVE_INFINITY,
        ease: "easeInOut",
        delay: 1,
      }}
    />

    {/* Card */}
    <motion.div
      className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary via-primary/90 to-accent/80 p-6 text-primary-foreground shadow-2xl shadow-primary/30"
      whileHover={{ scale: 1.03, rotateY: 5 }}
      transition={{ type: "spring", stiffness: 300 }}
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Animated mesh gradient */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -right-1/2 h-full w-full rounded-full bg-white/10"
          animate={{ rotate: 360 }}
          transition={{
            duration: 15,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -left-1/2 h-full w-full rounded-full bg-black/10"
          animate={{ rotate: -360 }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>

      {/* Shine effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12"
        animate={{ x: ["-200%", "200%"] }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          repeatDelay: 2,
        }}
      />

      <div className="relative">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <AnimatePresence mode="wait">
            <motion.div
              key={accountData.type || "default"}
              initial={{ scale: 0.8, opacity: 0, y: -10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 10 }}
              className="flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-sm px-4 py-1.5"
            >
              {accountData.type === "investment" ? (
                <TrendingUp className="h-4 w-4" />
              ) : (
                <CreditCard className="h-4 w-4" />
              )}
              <span className="text-sm font-medium">
                {accountData.type === "checking"
                  ? "Conta Corrente"
                  : accountData.type === "investment"
                    ? "Investimento"
                    : "Tipo da conta"}
              </span>
            </motion.div>
          </AnimatePresence>
          <motion.div
            animate={{ rotate: [0, 10, -10, 0] }}
            transition={{
              duration: 4,
              repeat: Number.POSITIVE_INFINITY,
            }}
          >
            <Wallet className="h-8 w-8 opacity-80" />
          </motion.div>
        </div>

        {/* Account Name */}
        <div className="mb-8">
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">
            Nome da conta
          </p>
          <AnimatePresence mode="wait">
            <motion.h3
              key={accountData.name || "placeholder"}
              initial={{
                y: 20,
                opacity: 0,
                filter: "blur(10px)",
              }}
              animate={{
                y: 0,
                opacity: 1,
                filter: "blur(0px)",
              }}
              exit={{
                y: -20,
                opacity: 0,
                filter: "blur(10px)",
              }}
              transition={{ duration: 0.3 }}
              className="text-2xl font-bold truncate"
            >
              {accountData.name || "Sua nova conta"}
            </motion.h3>
          </AnimatePresence>
        </div>

        {/* Balance */}
        <div className="relative">
          <p className="text-xs uppercase tracking-widest opacity-70 mb-1">
            Saldo disponível
          </p>
          <AnimatePresence mode="wait">
            <motion.p
              key={displayBalance}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="text-3xl font-bold tracking-tight"
            >
              {displayBalance}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Decorative chip */}
        <div className="absolute bottom-0 right-0 flex items-center gap-2">
          <motion.div
            className="h-8 w-10 rounded-lg bg-gradient-to-br from-white/30 to-white/10"
            animate={{ opacity: [0.3, 0.6, 0.3] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
            }}
          />
          <div className="flex gap-1">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-1 w-1 rounded-full bg-white/40" />
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  </div>
);

export default function OnboardingAnimationModal() {
  // Logic & State from existing implementation
  const { user, isLoaded, isSignedIn } = useUser();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [accountData, setAccountData] = useState<AccountData>({
    name: "",
    balance: "",
    type: "",
  });

  // State for visibility and logic
  const [isOpen, setIsOpen] = useState(false);
  const [financialGroupResult, setFinancialGroupResult] =
    useState<FinancialGroupResult | null>(null);

  // Refs for data fetching logic
  const fetchedUserIdRef = useRef<string | null>(null);
  const isInitialMountRef = useRef(true);
  const isFetchingRef = useRef(false);
  const queryClient = useQueryClient();

  // TRPC hooks
  const extendedTrpc = trpc as ExtendedTrpc;
  const { mutateAsync: getOrCreateGroup, isPending: isCheckingFinancialGroup } =
    trpc.financialGroups.getOrCreate.useMutation();
  const { mutateAsync: completeOnboarding } =
    trpc.financialGroups.completeOnboarding.useMutation();
  const { mutateAsync: createAccount, isPending: isCreatingAccount } =
    extendedTrpc.accounts.create.useMutation();

  const userId = user?.id ?? null;
  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userName =
    user?.fullName ?? user?.firstName ?? user?.username ?? "Usuário";

  // Logic: Fetch Financial Group
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      fetchedUserIdRef.current = null;
      setFinancialGroupResult(null);
      isInitialMountRef.current = true;
      isFetchingRef.current = false;
      return;
    }

    if (isFetchingRef.current || isCheckingFinancialGroup) {
      return;
    }

    const previousUserId = fetchedUserIdRef.current;
    const isUserIdChanged = previousUserId !== userId;
    const isInitialMount = isInitialMountRef.current;

    const shouldSkipFetch =
      !isInitialMount &&
      !isUserIdChanged &&
      fetchedUserIdRef.current === userId &&
      financialGroupResult &&
      financialGroupResult.onboardingCompleted;

    if (shouldSkipFetch) {
      return;
    }

    let isActive = true;
    fetchedUserIdRef.current = userId;
    isInitialMountRef.current = false;
    isFetchingRef.current = true;

    if (isUserIdChanged || !financialGroupResult) {
      setFinancialGroupResult(null);
      setStep(1);
      setAccountData({ name: "", balance: "", type: "" });
    }

    getOrCreateGroup({
      email: userEmail ?? undefined,
      name: userName,
    })
      .then((result) => {
        if (!isActive) return;
        setFinancialGroupResult(result);
        isFetchingRef.current = false;
      })
      .catch((_error) => {
        if (!isActive) return;
        fetchedUserIdRef.current = null;
        setFinancialGroupResult(null);
        isFetchingRef.current = false;
      });

    return () => {
      isActive = false;
      isFetchingRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getOrCreateGroup, isLoaded, isSignedIn, userId, userEmail, userName]);

  // Logic: Determine visibility
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

  // Helper functions for UI
  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    if (!numericValue) return "";
    const number = Number.parseInt(numericValue, 10) / 100;
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(number);
  };

  const handleBalanceChange = (value: string) => {
    const numericValue = value.replace(/\D/g, "");
    setAccountData((prev) => ({ ...prev, balance: numericValue }));
  };

  const displayBalance = accountData.balance
    ? formatCurrency(accountData.balance)
    : "R$ 0,00";

  // Actions
  const handleCreateAccount = async () => {
    if (!accountData.name || !accountData.type) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }

    const numericBalance = accountData.balance
      ? parseInt(accountData.balance, 10) / 100
      : 0;

    try {
      await createAccount({
        name: accountData.name,
        type: accountData.type as AccountType,
        initialBalance: numericBalance,
        currency: "BRL",
      });
      setStep(3);
      toast.success("Conta criada com sucesso!");
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : "Não foi possível criar a conta.",
      );
    }
  };

  const handleGoToDashboard = async () => {
    try {
      await completeOnboarding();
      setFinancialGroupResult((previous) =>
        previous ? { ...previous, onboardingCompleted: true } : previous,
      );
      queryClient.invalidateQueries({ queryKey: ["financialGroups"] });
      setIsOpen(false);
      toast.success("Tudo pronto! Bem-vindo(a).");
    } catch (_) {
      toast.error("Erro ao finalizar onboarding. Tente novamente.");
    }
  };

  // UI Variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 30, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { type: "spring" as const, stiffness: 100, damping: 12 },
    },
  };

  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 400 : -400,
      opacity: 0,
      scale: 0.9,
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 400 : -400,
      opacity: 0,
      scale: 0.9,
    }),
  };

  const FloatingParticles = () => (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute h-2 w-2 rounded-full bg-primary/20"
          initial={{
            x: Math.random() * 100 + "%",
            y: "100%",
          }}
          animate={{
            y: "-20%",
            x: [
              Math.random() * 100 + "%",
              Math.random() * 100 + "%",
              Math.random() * 100 + "%",
            ],
            opacity: [0, 1, 0],
          }}
          transition={{
            duration: 5 + Math.random() * 5,
            repeat: Number.POSITIVE_INFINITY,
            delay: i * 0.8,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/50 backdrop-blur-md p-0 md:p-4">
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-1/2 -left-1/2 h-full w-full rounded-full bg-primary/5"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{
            duration: 20,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
        <motion.div
          className="absolute -bottom-1/2 -right-1/2 h-full w-full rounded-full bg-accent/5"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [360, 180, 0],
          }}
          transition={{
            duration: 25,
            repeat: Number.POSITIVE_INFINITY,
            ease: "linear",
          }}
        />
      </div>

      <motion.div
        initial={{ scale: 0.8, opacity: 0, y: 50 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        transition={{ type: "spring", duration: 0.8, bounce: 0.3 }}
        className="relative w-full max-w-3xl overflow-hidden rounded-none md:rounded-3xl bg-card/95 backdrop-blur-xl shadow-2xl border-0 md:border border-border/50 flex flex-col h-full md:h-auto md:max-h-[90vh]"
      >
        {/* <FloatingParticles /> */}

        <div className="relative h-1.5 w-full bg-muted overflow-hidden shrink-0">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary to-accent"
            initial={{ width: "33%" }}
            animate={{
              width: step === 1 ? "33%" : step === 2 ? "66%" : "100%",
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
          <motion.div
            className="absolute top-0 h-full w-20 bg-gradient-to-r from-transparent via-white/30 to-transparent"
            animate={{ x: ["-100%", "500%"] }}
            transition={{
              duration: 2,
              repeat: Number.POSITIVE_INFINITY,
              ease: "linear",
            }}
          />
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar">
          <AnimatePresence mode="wait" custom={step}>
            {step === 1 ? (
              <motion.div
                key="welcome"
                custom={1}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="p-6 md:p-12 min-h-full flex flex-col justify-center"
              >
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center text-center"
                >
                  <motion.div variants={itemVariants} className="relative mb-8">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/20"
                      animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                      }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-primary/10"
                      animate={{ scale: [1, 2, 1], opacity: [0.3, 0, 0.3] }}
                      transition={{
                        duration: 2,
                        repeat: Number.POSITIVE_INFINITY,
                        delay: 0.3,
                      }}
                    />
                    <motion.div
                      className="relative flex h-24 w-24 items-center justify-center rounded-full  "
                      transition={{ duration: 0.8 }}
                    >
                      <IconTableFilled className="h-12 w-12 text-primary" />
                    </motion.div>
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text"
                  >
                    Bem-vindo ao Næncy!
                  </motion.h1>

                  <motion.p
                    variants={itemVariants}
                    className="mb-10 max-w-lg text-lg text-muted-foreground leading-relaxed"
                  >
                    Sua jornada para uma vida financeira mais organizada começa
                    agora. Gerencie suas contas com inteligência e simplicidade.
                  </motion.p>

                  <motion.div
                    variants={itemVariants}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10 w-full max-w-xl"
                  >
                    {[
                      {
                        icon: Shield,
                        label: "Segurança total",
                        desc: "Seus dados protegidos",
                      },
                      {
                        icon: Zap,
                        label: "Ultra rápido",
                        desc: "Performance em tempo real",
                      },
                      {
                        icon: TrendingUp,
                        label: "Crescimento",
                        desc: "Acompanhe sua evolução",
                      },
                    ].map((item) => (
                      <motion.div
                        key={item.label}
                        className="group relative overflow-hidden rounded-2xl bg-secondary/50 p-4 cursor-pointer border border-transparent hover:border-primary/20 transition-colors"
                        whileHover={{ y: -5, scale: 1.02 }}
                        transition={{
                          type: "spring",
                          stiffness: 400,
                          damping: 17,
                        }}
                      >
                        <motion.div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative flex items-center md:block text-left md:text-center gap-4 md:gap-0">
                          <motion.div
                            className="mb-0 md:mb-3 flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 md:mx-auto"
                            whileHover={{ rotate: [0, -10, 10, 0] }}
                            transition={{ duration: 0.5 }}
                          >
                            <item.icon className="h-6 w-6 text-primary" />
                          </motion.div>
                          <div>
                            <h3 className="font-semibold text-foreground mb-1">
                              {item.label}
                            </h3>
                            <p className="text-xs text-muted-foreground">
                              {item.desc}
                            </p>
                          </div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>

                  <motion.div variants={itemVariants}>
                    <Button
                      size="lg"
                      onClick={() => setStep(2)}
                      className="group gap-3 px-10 py-6 text-lg rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow"
                    >
                      <span>Começar agora</span>
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      >
                        <ChevronRight className="h-5 w-5" />
                      </motion.div>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            ) : step === 2 ? (
              <motion.div
                key="account"
                custom={2}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="p-6 md:p-12"
              >
                <div className="grid gap-6 md:gap-8 md:grid-cols-2">
                  {/* Form */}
                  <motion.div
                    variants={containerVariants}
                    initial="hidden"
                    animate="visible"
                    className="space-y-6"
                  >
                    <motion.div variants={itemVariants}>
                      <div className="mb-2 flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-foreground">
                            Configure sua conta
                          </h2>
                          <p className="text-sm text-muted-foreground">
                            Preencha os dados da sua primeira conta
                          </p>
                        </div>
                      </div>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="block md:hidden w-full mb-6"
                    >
                      <CardPreview
                        accountData={accountData}
                        displayBalance={displayBalance}
                      />
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label
                        htmlFor="accountName"
                        className="text-sm font-medium"
                      >
                        Nome da conta
                      </Label>
                      <Input
                        id="accountName"
                        placeholder="Ex: Conta Principal, Nubank..."
                        value={accountData.name}
                        onChange={(e) =>
                          setAccountData((prev) => ({
                            ...prev,
                            name: e.target.value,
                          }))
                        }
                        className="h-12 rounded-xl border-border/50 bg-secondary/30 focus:bg-background transition-colors"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label htmlFor="balance" className="text-sm font-medium">
                        Saldo inicial
                      </Label>
                      <Input
                        id="balance"
                        placeholder="R$ 0,00"
                        value={accountData.balance ? displayBalance : ""}
                        onChange={(e) => handleBalanceChange(e.target.value)}
                        className="h-12 rounded-xl border-border/50 bg-secondary/30 focus:bg-background transition-colors"
                      />
                    </motion.div>

                    <motion.div variants={itemVariants} className="space-y-2">
                      <Label className="text-sm font-medium">
                        Tipo da conta
                      </Label>
                      <Select
                        value={accountData.type}
                        onValueChange={(value: "checking" | "investment") =>
                          setAccountData((prev) => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger className="h-12 rounded-xl border-border/50 bg-secondary/30 focus:bg-background transition-colors">
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="checking">
                            <div className="flex items-center gap-2">
                              <CreditCard className="h-4 w-4" />
                              <span>Conta Corrente</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="investment">
                            <div className="flex items-center gap-2">
                              <TrendingUp className="h-4 w-4" />
                              <span>Investimento</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </motion.div>

                    <motion.div
                      variants={itemVariants}
                      className="flex gap-3 pt-4"
                    >
                      <Button
                        variant="outline"
                        onClick={() => setStep(1)}
                        className="flex-1 h-12 rounded-xl"
                        disabled={isCreatingAccount}
                      >
                        Voltar
                      </Button>
                      <Button
                        className="flex-1 h-12 rounded-xl shadow-lg shadow-primary/20"
                        disabled={
                          !accountData.name ||
                          !accountData.balance ||
                          !accountData.type ||
                          isCreatingAccount
                        }
                        onClick={handleCreateAccount}
                      >
                        {isCreatingAccount ? (
                          "Criando..."
                        ) : (
                          <>
                            Criar conta
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </motion.div>
                  </motion.div>

                  <motion.div
                    initial={{ x: 80, opacity: 0, rotateY: -15 }}
                    animate={{ x: 0, opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.4, type: "spring", stiffness: 100 }}
                    className="hidden md:flex items-center justify-center"
                  >
                    <CardPreview
                      accountData={accountData}
                      displayBalance={displayBalance}
                    />
                  </motion.div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="complete"
                custom={3}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 200, damping: 25 }}
                className="p-6 md:p-12"
              >
                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  animate="visible"
                  className="flex flex-col items-center text-center"
                >
                  {/* Success animation */}
                  <motion.div variants={itemVariants} className="relative mb-8">
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-500/20"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 2, 2.5], opacity: [1, 0.5, 0] }}
                      transition={{ duration: 1, delay: 0.3 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-full bg-green-500/20"
                      initial={{ scale: 0 }}
                      animate={{ scale: [0, 1.5, 2], opacity: [1, 0.5, 0] }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                    <motion.div
                      className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg shadow-green-500/30"
                      initial={{ scale: 0, rotate: -180 }}
                      animate={{ scale: 1, rotate: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 200,
                        delay: 0.2,
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.6, type: "spring" }}
                      >
                        <CheckCircle2 className="h-12 w-12 text-white" />
                      </motion.div>
                    </motion.div>
                  </motion.div>

                  {/* Confetti-like particles */}
                  <div className="absolute inset-0 pointer-events-none overflow-hidden">
                    {[...Array(20)].map((_, i) => (
                      <motion.div
                        key={i}
                        className="absolute h-3 w-3 rounded-full"
                        style={{
                          background: [
                            "#10b981",
                            "#3b82f6",
                            "#f59e0b",
                            "#ec4899",
                            "#8b5cf6",
                          ][i % 5],
                          left: "50%",
                          top: "30%",
                        }}
                        initial={{ scale: 0, x: 0, y: 0 }}
                        animate={{
                          scale: [0, 1, 0],
                          x: (Math.random() - 0.5) * 400,
                          y: (Math.random() - 0.5) * 300,
                          rotate: Math.random() * 360,
                        }}
                        transition={{
                          duration: 1.5,
                          delay: 0.4 + i * 0.05,
                          ease: "easeOut",
                        }}
                      />
                    ))}
                  </div>

                  <motion.div variants={itemVariants} className="mb-2">
                    <PartyPopper className="h-8 w-8 text-primary mx-auto mb-4" />
                  </motion.div>

                  <motion.h1
                    variants={itemVariants}
                    className="mb-4 text-3xl font-bold text-foreground md:text-4xl lg:text-5xl"
                  >
                    Tudo pronto!
                  </motion.h1>

                  <motion.p
                    variants={itemVariants}
                    className="mb-8 max-w-md text-lg text-muted-foreground leading-relaxed"
                  >
                    Sua conta{" "}
                    <span className="font-semibold text-foreground">
                      {accountData.name}
                    </span>{" "}
                    foi criada com sucesso. Agora você pode começar a gerenciar
                    suas finanças!
                  </motion.p>

                  {/* Account summary card */}
                  <motion.div
                    variants={itemVariants}
                    className="mb-10 w-full max-w-sm rounded-2xl bg-secondary/50 border border-border/50 p-6"
                  >
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Conta</span>
                        <span className="font-semibold text-foreground">
                          {accountData.name}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Tipo</span>
                        <span className="font-semibold text-foreground">
                          {accountData.type === "checking"
                            ? "Conta Corrente"
                            : "Investimento"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">
                          Saldo inicial
                        </span>
                        <span className="font-bold text-primary text-lg">
                          {displayBalance}
                        </span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={itemVariants} className="flex gap-4">
                    {/* Option to edit account removed as it's already created */}
                    <Button
                      size="lg"
                      onClick={handleGoToDashboard}
                      className="group gap-3 px-8 h-12 rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-shadow w-full"
                    >
                      <Rocket className="h-5 w-5" />
                      <span>Ir para Dashboard</span>
                      <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{
                          duration: 1.5,
                          repeat: Number.POSITIVE_INFINITY,
                        }}
                      >
                        <ArrowRight className="h-5 w-5" />
                      </motion.div>
                    </Button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="flex justify-center gap-3 py-6 shrink-0 bg-card/95 backdrop-blur-xl z-10">
          {[1, 2, 3].map((s) => (
            <motion.button
              key={s}
              // Prevent clicking future steps
              onClick={() => {
                // Only allow navigating back to 1 if we haven't created the account yet (step 3)
                if (s < step && step !== 3) {
                  setStep(s as 1 | 2 | 3);
                }
              }}
              className={`relative h-2.5 rounded-full transition-all ${
                s === step
                  ? "w-8 bg-primary"
                  : s < step
                    ? "w-2.5 bg-primary/50 cursor-pointer"
                    : "w-2.5 bg-muted"
              }`}
              whileHover={s < step && step !== 3 ? { scale: 1.2 } : {}}
              layout
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {s === step && (
                <motion.div
                  className="absolute inset-0 rounded-full bg-primary"
                  layoutId="activeStep"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
