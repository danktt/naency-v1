import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { DynamicIcon } from "../DynamicIcon";

interface TransactionFormHeaderProps {
  isEditing: boolean;
  type: "income" | "expense";
}

const itemVariants = {
  hidden: { y: 30, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: { type: "spring" as const, stiffness: 100, damping: 12 },
  },
};

export function TransactionFormHeader({
  isEditing,
  type,
}: TransactionFormHeaderProps) {
  const title = isEditing
    ? `Editar ${type === "income" ? "receita" : "despesa"}`
    : `Adicionar ${type === "income" ? "receita" : "despesa"}`;

  const description = isEditing
    ? `Atualize os dados da ${type === "income" ? "receita" : "despesa"}.`
    : "Nova entrada financeira.";

  const icon = type === "income" ? "income" : "expense";
  const bgColor20 =
    type === "income" ? "bg-icon-income/20" : "bg-icon-expense/20";
  const bgColor10 =
    type === "income" ? "bg-icon-income/10" : "bg-icon-expense/10";
  const color = type === "income" ? "text-icon-income" : "text-icon-expense";
  return (
    <div className="w-full">
      {/* Mobile Header */}
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="flex flex-col items-center "
      >
        <div className=" flex flex-col items-center gap-4">
          <motion.div variants={itemVariants} className="relative">
            <motion.div
              className={`absolute inset-0 rounded-full  ${bgColor20}`}
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.5, 0, 0.5],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
              }}
            />
            <motion.div
              className={`absolute inset-0 rounded-full  ${bgColor10}`}
              animate={{
                scale: [1, 1.6, 1],
                opacity: [0.3, 0, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Number.POSITIVE_INFINITY,
                delay: 0.3,
              }}
            />
            <motion.div
              className="relative flex size-12 items-center justify-center rounded-full bg-background/50 backdrop-blur-sm "
              transition={{ duration: 0.8 }}
            >
              <DynamicIcon icon={icon} className={`size-6 ${color}`} />
            </motion.div>
          </motion.div>
          <div className="text-center space-y-1">
            <DialogTitle className="text-xl font-bold text-foreground">
              {title}
            </DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          </div>
        </div>
      </motion.div>

      {/* Desktop Header */}
      {/* <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="visible"
        className="hidden sm:block"
      >
        <div className="mb-2 flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-xl ${bgColor10}`}
          >
            <DynamicIcon icon={icon} className={`size-5 ${color}`} />
          </div>
          <div className="space-y-1">
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </div>
        </div>
      </motion.div> */}
    </div>
  );
}
