import "dotenv/config"; // TEM QUE SER A PRIMEIRA LINHA

import { db } from "@/server/db/client";
import { category_presets } from "@/server/db/schema";
import { v4 as uuidv4 } from "uuid";

// Presets organizados
const defaultPresets = [
  {
    name: "Alimentação",
    icon: "IconShoppingCart",
    color: "#FF8A80", // vermelho claro
    type: "expense",
    children: [
      { name: "Supermercado", icon: null },
      { name: "Restaurantes", icon: null },
      { name: "Bares", icon: null },
      { name: "Fast Food", icon: null },
      { name: "Delivery", icon: null },
      { name: "Açougue", icon: null },
      { name: "Pescados", icon: null },
      { name: "Hortifruti", icon: null },
      { name: "Padaria", icon: null },
    ],
  },
  {
    name: "Moradia",
    icon: "IconHome",
    color: "#FFC107", // amarelo
    type: "expense",
    children: [
      { name: "Aluguel", icon: null },
      { name: "Hipoteca", icon: null },
      { name: "IPTU", icon: null },
      { name: "Condomínio", icon: null },
      { name: "Taxas", icon: null },
      { name: "Água", icon: null },
      { name: "Luz", icon: null },
      { name: "Gás", icon: null },
      { name: "Internet", icon: null },
      { name: "Streaming", icon: null },
      { name: "Reparos", icon: null },
      { name: "Manutenção", icon: null },
      { name: "Móveis", icon: null },
      { name: "Eletrodomésticos", icon: null },
    ],
  },
  {
    name: "Transporte",
    icon: "IconCar",
    color: "#82B1FF", // azul claro
    type: "expense",
    children: [
      { name: "Combustível", icon: null },
      { name: "Aplicativos", icon: null },
      { name: "Transporte Público", icon: null },
      { name: "Passagens", icon: null },
      { name: "Manutenção Veículo", icon: null },
      { name: "Estacionamento", icon: null },
      { name: "Seguro do Carro", icon: null },
      { name: "IPVA", icon: null },
      { name: "Consorcio", icon: null },
      { name: "Licenciamento", icon: null },
      { name: "Lavagem", icon: null },
      { name: "Táxi/Uber", icon: null },
      { name: "Pedágios", icon: null },
      { name: "Multas", icon: null },
      { name: "Outros Transportes", icon: null },
      { name: "Viagem", icon: null },
    ],
  },
  {
    name: "Saúde",
    icon: "IconMedicalCross",
    color: "#66BB6A", // verde médio
    type: "expense",
    children: [
      { name: "Academia", icon: null },
      { name: "Plano de Saúde", icon: null },
      { name: "Consultas Médicas", icon: null },
      { name: "Barbearia", icon: null },
      { name: "Farmácia", icon: null },
      { name: "Exames", icon: null },
      { name: "Terapias", icon: null },
      { name: "Emergências", icon: null },
      { name: "Plano Odontológico", icon: null },
      { name: "Convênios", icon: null },
      { name: "Particular", icon: null },
      { name: "Plano de Saúde Familiar", icon: null },
      { name: "Plano de Saúde Individual", icon: null },
    ],
  },
  {
    name: "Educação",
    icon: "IconBook",
    color: "#AB47BC", // roxo
    type: "expense",
    children: [
      { name: "Escola", icon: null },
      { name: "Curso", icon: null },
      { name: "Faculdade", icon: null },
      { name: "Ingles", icon: null },
    ],
  },
  {
    name: "Lazer",
    icon: "IconStar",
    color: "#FFB74D", // laranja claro
    type: "expense",
    children: [
      { name: "Cinema", icon: null },
      { name: "Teatro", icon: null },
      { name: "Show", icon: null },
      { name: "Festival", icon: null },
      { name: "Festa", icon: null },
      { name: "Bares", icon: null },
      { name: "Restaurantes", icon: null },
      { name: "Futebol", icon: null },
    ],
  },
  {
    name: "Renda",
    icon: "IconCurrencyDollar",
    color: "#26A69A", // teal
    type: "income",
    children: [
      { name: "Salário", icon: null },
      { name: "Pró-Labore", icon: null },
      { name: "Renda Extra", icon: null },
      { name: "Freelas", icon: null },
      { name: "Investimentos", icon: null },
      { name: "Venda de Bens", icon: null },
      { name: "Cashback", icon: null },
      { name: "Reembolsos", icon: null },
      { name: "Doações Recebidas", icon: null },
      { name: "Hora Extra", icon: null },
      { name: "FGTS", icon: null },
      { name: "Resgates", icon: null },
      { name: "Outras Receitas", icon: null },
    ],
  },
];

async function main() {
  for (const parent of defaultPresets) {
    const parentId = uuidv4();

    await db.insert(category_presets).values({
      id: parentId,
      parent_id: null,
      name: parent.name,
      icon: parent.icon,
      color: parent.color,
      type: parent.type as "expense" | "income",
    });

    if (parent.children?.length) {
      const children = parent.children.map((child) => {
        const childData: typeof category_presets.$inferInsert = {
          id: uuidv4(),
          parent_id: parentId,
          name: child.name,
          icon: child.icon ?? undefined,
          color: parent.color,
          type: parent.type as "expense" | "income",
        };
        return childData;
      });

      await db.insert(category_presets).values(children);
    }
  }

  console.log("✅ Presets de categorias inseridos com sucesso!");
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
