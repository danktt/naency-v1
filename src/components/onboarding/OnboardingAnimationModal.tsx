"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useOnboardingController } from "@/hooks/useOnboardingController";
import { StepAccount } from "./StepAccount";
import { StepCategories } from "./StepCategories";
import { StepFinal } from "./StepFinal";
import { StepWelcome } from "./StepWelcome";

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 30 : -30, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction < 0 ? 30 : -30, opacity: 0 }),
};

export default function OnboardingModal() {
  const controller = useOnboardingController();

  if (!controller.isOpen) return null;

  return (
    <Dialog open={controller.isOpen} onOpenChange={controller.setIsOpen}>
      <DialogContent className="overflow-hidden max-w-xl p-0">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={controller.currentStep}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.25 }}
            className="p-6"
          >
            {controller.currentStep === "welcome" && (
              <StepWelcome onNext={() => controller.goToStep("account")} />
            )}
            {controller.currentStep === "account" && (
              <StepAccount
                onNext={controller.handleCreateAccount}
                onBack={() => controller.goToStep("welcome")}
                isLoading={controller.isCreatingAccount}
              />
            )}
            {controller.currentStep === "categories" && (
              <StepCategories
                onNext={controller.handleImportCategories}
                onBack={() => controller.goToStep("account")}
                isLoading={controller.isImportingCategories}
              />
            )}
            {controller.currentStep === "final" && (
              <StepFinal onFinish={controller.handleFinish} />
            )}
          </motion.div>
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
