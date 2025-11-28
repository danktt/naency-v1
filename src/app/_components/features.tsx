"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CreditCard,
  Globe,
  LayoutDashboard,
  PieChart,
  ShieldCheck,
  Wallet,
  Zap,
} from "lucide-react";
import { GlowCard } from "@/components/gloweffect";

const features = [
  {
    icon: LayoutDashboard,
    title: "Gestão Centralizada",
    description:
      "Visualize todas as suas contas bancárias e cartões em um único painel intuitivo.",
    className: "md:col-span-2 md:row-span-2",
  },
  {
    icon: CreditCard,
    title: "Controle de Cartões",
    description:
      "Acompanhe limites, faturas e datas de vencimento de todos os seus cartões.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: PieChart,
    title: "Orçamento Inteligente",
    description:
      "Crie provisões e metas de gastos para manter suas finanças nos trilhos.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Wallet,
    title: "Múltiplas Carteiras",
    description: "Gerencie finanças pessoais e de negócios separadamente.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Globe,
    title: "Grupos Familiares",
    description:
      "Compartilhe despesas e planeje o futuro financeiro com sua família.",
    className: "md:col-span-2 md:row-span-1",
  },
  {
    icon: BarChart3,
    title: "Relatórios Detalhados",
    description: "Entenda para onde vai seu dinheiro com gráficos interativos.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: ShieldCheck,
    title: "Segurança Total",
    description:
      "Seus dados são criptografados e protegidos com os mais altos padrões.",
    className: "md:col-span-1 md:row-span-1",
  },
  {
    icon: Zap,
    title: "Automação",
    description: "Automatize lançamentos recorrentes e economize tempo.",
    className: "md:col-span-1 md:row-span-1",
  },
];

export function Features() {
  return (
    <section
      id="features"
      className="py-24 text-black dark:text-white relative"
    >
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-linear-to-r from-black to-gray-600 dark:from-white dark:to-gray-400"
          >
            Tudo o que você precisa
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto text-lg"
          >
            Ferramentas poderosas projetadas para colocar você no controle total
            da sua vida financeira.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[200px]">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.05 }}
              className={`${feature.className} h-full`}
            >
              <GlowCard className="h-full rounded-3xl bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10">
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-black/10 dark:bg-white/10 flex items-center justify-center mb-4 text-black dark:text-white">
                    <feature.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-2 text-black dark:text-white">
                      {feature.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
                      {feature.description}
                    </p>
                  </div>
                </div>
              </GlowCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
