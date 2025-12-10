"use client";

import { DynamicIcon } from "@/components/DynamicIcon";
import { Button } from "@heroui/react";
import { motion } from "framer-motion";

const tiers = [
  {
    name: "Gratuito",
    price: "R$0",
    description: "Perfeito para começar a organizar suas finanças.",
    features: [
      "1 Grupo Financeiro",
      "2 Contas Bancárias",
      "Orçamento Básico",
      "Lançamentos Manuais",
    ],
    cta: "Começar Grátis",
    popular: false,
  },
  {
    name: "Pro",
    price: "R$29",
    description: "Recursos avançados para controle financeiro total.",
    features: [
      "Grupos Financeiros Ilimitados",
      "Contas Bancárias Ilimitadas",
      "Orçamento Avançado (Provisões)",
      "Gestão de Cartão de Crédito",
      "Transações Recorrentes",
      "Grupos Colaborativos",
    ],
    cta: "Assinar Agora",
    popular: true,
  },
  {
    name: "Empresarial",
    price: "Sob Consulta",
    description: "Soluções sob medida para grandes organizações.",
    features: [
      "Tudo do Pro",
      "Suporte Dedicado",
      "Integrações Personalizadas",
      "Logs de Auditoria",
      "SLA Garantido",
    ],
    cta: "Falar com Vendas",
    popular: false,
  },
];

export function Pricing() {
  return (
    <section
      id="pricing"
      className="py-24 text-black dark:text-white relative overflow-hidden"
    >
      <div className="container mx-auto px-4 z-10 relative">
        <div className="text-center mb-16">
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="text-3xl md:text-5xl font-bold mb-4"
          >
            Preços simples e transparentes
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto"
          >
            Escolha o plano que melhor se adapta às suas necessidades. Sem taxas
            escondidas.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {tiers.map((tier, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={`relative p-8 rounded-2xl border ${
                tier.popular
                  ? "bg-white dark:bg-white/10 border-primary/50 shadow-lg shadow-primary/10"
                  : "bg-black/5 dark:bg-white/5 border-black/10 dark:border-white/10"
              } flex flex-col`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 bg-primary text-accent px-4 py-1 rounded-full text-sm font-medium">
                  Mais Popular
                </div>
              )}
              <div className="mb-8">
                <h3 className="text-xl font-semibold mb-2">{tier.name}</h3>
                <div className="flex items-baseline gap-1 mb-4">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.price !== "Sob Consulta" && (
                    <span className="text-gray-600 dark:text-gray-400">
                      /mês
                    </span>
                  )}
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-sm">
                  {tier.description}
                </p>
              </div>

              <ul className="space-y-4 mb-8 flex-1">
                {tier.features.map((feature, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"
                  >
                    <DynamicIcon icon="check" className="size-4 text-primary" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                color={tier.popular ? "primary" : "default"}
                variant={tier.popular ? "shadow" : "bordered"}
                className={`w-full ${!tier.popular && "text-black dark:text-white border-black/20 dark:border-white/20 hover:bg-black/5 dark:hover:bg-white/10"}`}
              >
                {tier.cta}
              </Button>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
