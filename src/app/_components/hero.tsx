"use client";

import { Button } from "@heroui/react";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="container mx-auto px-4 z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-gray-600 dark:text-gray-300"
        >
          <TrendingUp className="w-4 h-4 text-green-400" />
          <span>Assuma o controle do seu futuro financeiro</span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-black to-gray-500 dark:from-white dark:to-gray-500 mb-6 tracking-tight"
        >
          Domine suas Finanças <br /> com Næncy
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-10"
        >
          Controle total sobre suas contas, cartões de crédito e orçamento.
          Experimente a próxima geração de gestão financeira pessoal.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4 justify-center items-center"
        >
          <Link href="/sign-in">
            <Button
              size="lg"
              color="primary"
              variant="shadow"
              endContent={<ArrowRight className="w-4 h-4" />}
              className="font-semibold"
            >
              Começar Grátis
            </Button>
          </Link>
          <Button
            size="lg"
            variant="bordered"
            className="font-semibold text-black dark:text-white border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"
            onPress={() => {
              const element = document.getElementById("features");
              if (element) {
                element.scrollIntoView({ behavior: "smooth" });
              }
            }}
          >
            Saiba Mais
          </Button>
        </motion.div>
      </div>
    </section>
  );
}
